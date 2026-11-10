// Interaktivt koordinatsystem på et <canvas>.
// En "scene" er en funktion, der returnerer en liste af elementer:
//   { type: 'fn', f, color, width, dash, xmin, xmax }
//   { type: 'point', x, y, color, label, drag(x, y), snap, r, hollow }
//   { type: 'segment', x1, y1, x2, y2, color, width, dash, label, arrow }
//   { type: 'line', x1, y1, x2, y2 }   (uendelig linje gennem to punkter)
//   { type: 'vline', x } / { type: 'hline', y }
//   { type: 'text', x, y, text, dx, dy, align }
//   { type: 'polygon', points: [[x, y], ...], color, alpha }
//   { type: 'circle', x, y, r, fill } / { type: 'arc', x, y, r(px), a0, a1, label }
//   { type: 'area', f, a, b, color, colorNeg }  (areal mellem graf og x-akse)
// Farver kan være CSS-variabler som '--c1'.
import { num } from './util.js';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const instances = new Set();

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
const mantissa = (step) => Math.round(step / 10 ** Math.floor(Math.log10(step)));
const decimalsFor = (step) => Math.max(0, -Math.floor(Math.log10(step) + 1e-9));

export class Graph {
  /** Rydder grafer, der ikke længere er på siden. */
  static prune() {
    for (const g of instances) if (!g.root.isConnected) { g.destroy(); instances.delete(g); }
  }
  /** Lad en anden visning (fx 3D) blive ryddet op sammen med graferne. */
  static track(o) { instances.add(o); }

  constructor(parent, opts = {}) {
    this.opts = { xmin: -10, xmax: 10, ymin: -7, ymax: 7, equalAspect: true, aspect: null, ...opts };
    const { xmin, xmax, ymin, ymax } = this.opts;
    this.home = { xmin, xmax, ymin, ymax };
    this.view = { ...this.home };
    this.userMoved = false;

    this.root = document.createElement('div');
    this.root.className = 'graph';
    if (this.opts.aspect) this.root.style.aspectRatio = this.opts.aspect;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Koordinatsystem');
    this.ctx = this.canvas.getContext('2d');
    this.readout = document.createElement('div');
    this.readout.className = 'graph-readout';
    const btns = document.createElement('div');
    btns.className = 'graph-btns';
    const mk = (label, title, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', fn);
      btns.append(b);
    };
    mk('+', 'Zoom ind', () => this.zoomCenter(1 / 1.4));
    mk('−', 'Zoom ud', () => this.zoomCenter(1.4));
    mk('⌂', 'Nulstil visning', () => this.reset());
    this.root.append(this.canvas, this.readout, btns);
    parent.append(this.root);

    this.scene = () => [];
    this.items = [];
    this.w = this.h = 0;
    this.pointers = new Map();
    this._bind();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.root);
    instances.add(this);
    this.resize();
  }

  destroy() {
    this.ro.disconnect();
    cancelAnimationFrame(this._raf);
    instances.delete(this);
  }

  setScene(fn) { this.scene = fn; this.draw(); }

  setView(v) {
    this.home = { ...v };
    this.reset();
  }

  resize() {
    const r = this.root.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h || (w === this.w && h === this.h)) return;
    this.w = w; this.h = h;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    if (this.opts.equalAspect) this._fit(this.userMoved ? this.view : this.home);
    this._render();
  }

  _fit(v) {
    const cx = (v.xmin + v.xmax) / 2, cy = (v.ymin + v.ymax) / 2;
    const ppu = Math.min(this.w / (v.xmax - v.xmin), this.h / (v.ymax - v.ymin));
    const hx = this.w / ppu / 2, hy = this.h / ppu / 2;
    this.view = { xmin: cx - hx, xmax: cx + hx, ymin: cy - hy, ymax: cy + hy };
  }

  reset() {
    this.userMoved = false;
    if (this.opts.equalAspect && this.w) this._fit(this.home);
    else this.view = { ...this.home };
    this.draw();
  }

  sx(x) { return ((x - this.view.xmin) / (this.view.xmax - this.view.xmin)) * this.w; }
  sy(y) { return this.h - ((y - this.view.ymin) / (this.view.ymax - this.view.ymin)) * this.h; }
  wx(px) { return this.view.xmin + (px / this.w) * (this.view.xmax - this.view.xmin); }
  wy(py) { return this.view.ymin + ((this.h - py) / this.h) * (this.view.ymax - this.view.ymin); }

  zoomAt(cx, cy, f) {
    const v = this.view;
    const nx = (v.xmax - v.xmin) * f;
    if (nx < 1e-3 || nx > 1e6) return;
    this.view = {
      xmin: cx + (v.xmin - cx) * f, xmax: cx + (v.xmax - cx) * f,
      ymin: cy + (v.ymin - cy) * f, ymax: cy + (v.ymax - cy) * f,
    };
    this.userMoved = true;
    this.draw();
  }
  zoomCenter(f) {
    const v = this.view;
    this.zoomAt((v.xmin + v.xmax) / 2, (v.ymin + v.ymax) / 2, f);
  }

  draw() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this._render(); });
  }

  // ---------- tegning ----------

  _render() {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const cs = getComputedStyle(this.root);
    const cache = {};
    this.color = (c = '--c1') => (c.startsWith('--') ? (cache[c] ??= cs.getPropertyValue(c).trim() || '#888') : c);
    ctx.fillStyle = this.color('--g-bg');
    ctx.fillRect(0, 0, w, h);
    this._grid();
    let items = [];
    try { items = (this.scene() || []).filter(Boolean); } catch (e) { console.error(e); }
    this.items = items;
    for (const it of items) if (it.type !== 'point' && it.type !== 'text') this._item(it);
    for (const it of items) if (it.type === 'text') this._item(it);
    for (const it of items) if (it.type === 'point') this._item(it);
  }

  _grid() {
    const { ctx, w, h, view: v } = this;
    const stepX = niceStep((v.xmax - v.xmin) / Math.max(4, w / 85));
    const stepY = this.opts.equalAspect ? stepX : niceStep((v.ymax - v.ymin) / Math.max(3, h / 60));

    const lines = (sxStep, syStep, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = Math.ceil(v.xmin / sxStep); i * sxStep <= v.xmax; i++) {
        const p = Math.round(this.sx(i * sxStep)) + 0.5;
        ctx.moveTo(p, 0); ctx.lineTo(p, h);
      }
      for (let i = Math.ceil(v.ymin / syStep); i * syStep <= v.ymax; i++) {
        const p = Math.round(this.sy(i * syStep)) + 0.5;
        ctx.moveTo(0, p); ctx.lineTo(w, p);
      }
      ctx.stroke();
    };
    const divX = mantissa(stepX) === 2 ? 4 : 5;
    const divY = mantissa(stepY) === 2 ? 4 : 5;
    lines(stepX / divX, stepY / divY, this.color('--g-grid-minor'));
    lines(stepX, stepY, this.color('--g-grid'));

    // akser
    const ax = this.sy(0), ay = this.sx(0);
    const axis = this.color('--g-axis');
    ctx.strokeStyle = axis;
    ctx.fillStyle = axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ax >= 0 && ax <= h) { ctx.moveTo(0, Math.round(ax) + 0.5); ctx.lineTo(w, Math.round(ax) + 0.5); }
    if (ay >= 0 && ay <= w) { ctx.moveTo(Math.round(ay) + 0.5, 0); ctx.lineTo(Math.round(ay) + 0.5, h); }
    ctx.stroke();
    if (ax >= 0 && ax <= h) this._arrowHead(w - 1, Math.round(ax) + 0.5, 0, axis);
    if (ay >= 0 && ay <= w) this._arrowHead(Math.round(ay) + 0.5, 1, -Math.PI / 2, axis);

    // tal på akserne
    const text = this.color('--g-text');
    ctx.font = `12px ${FONT}`;
    const dx = decimalsFor(stepX), dy = decimalsFor(stepY);
    const labelY = Math.min(Math.max(ax + 5, 4), h - 18);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = Math.ceil(v.xmin / stepX); i * stepX <= v.xmax; i++) {
      if (i === 0) continue;
      const px = this.sx(i * stepX);
      if (px < 12 || px > w - 12) continue;
      this._label(num(i * stepX, dx), px, labelY, text);
    }
    const leftSide = ay > 40;
    const labelX = leftSide ? Math.min(ay - 6, w - 6) : Math.max(ay + 6, 6);
    ctx.textAlign = leftSide ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    for (let i = Math.ceil(v.ymin / stepY); i * stepY <= v.ymax; i++) {
      if (i === 0) continue;
      const py = this.sy(i * stepY);
      if (py < 10 || py > h - 10) continue;
      this._label(num(i * stepY, dy), labelX, py, text);
    }
    if (ax >= 0 && ax <= h && ay >= 0 && ay <= w) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      this._label('0', ay - 5, ax + 5, text);
    }
    ctx.font = `italic 600 14px ${FONT}`;
    if (ax >= 0 && ax <= h) { ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; this._label('x', w - 6, ax - 6, axis); }
    if (ay >= 0 && ay <= w) { ctx.textAlign = 'left'; ctx.textBaseline = 'top'; this._label('y', ay + 9, 4, axis); }
  }

  _label(t, x, y, color) {
    const { ctx } = this;
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.color('--g-bg');
    ctx.strokeText(t, x, y);
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
  }

  _arrowHead(x, y, angle, color, size = 8) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _item(it) {
    const { ctx } = this;
    const col = this.color(it.color);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(it.dash ? (Array.isArray(it.dash) ? it.dash : [7, 6]) : []);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = it.width ?? 2.5;
    ctx.globalAlpha = it.alpha ?? 1;
    switch (it.type) {
      case 'fn': this._fn(it); break;
      case 'segment': this._segment(it, col); break;
      case 'line': this._line(it); break;
      case 'vline': {
        const p = this.sx(it.x);
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, this.h); ctx.stroke();
        break;
      }
      case 'hline': {
        const p = this.sy(it.y);
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(this.w, p); ctx.stroke();
        break;
      }
      case 'polygon': {
        ctx.globalAlpha = it.alpha ?? 0.18;
        ctx.beginPath();
        it.points.forEach(([x, y], i) => (i ? ctx.lineTo(this.sx(x), this.sy(y)) : ctx.moveTo(this.sx(x), this.sy(y))));
        ctx.closePath();
        ctx.fill();
        if (it.stroke) { ctx.globalAlpha = 1; ctx.stroke(); }
        break;
      }
      case 'circle': {
        const r = Math.abs(this.sx(it.x + it.r) - this.sx(it.x));
        ctx.beginPath(); ctx.arc(this.sx(it.x), this.sy(it.y), r, 0, Math.PI * 2);
        if (it.fill) { ctx.globalAlpha = it.alpha ?? 0.12; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.stroke();
        break;
      }
      case 'arc': {
        // vinkelbue omkring (x, y) fra vinkel a0 til a1 (radianer, mod uret), radius i pixels
        const px = this.sx(it.x), py = this.sy(it.y), r = it.r ?? 22;
        ctx.beginPath();
        if (it.fill !== false) {
          ctx.moveTo(px, py);
          ctx.arc(px, py, r, -it.a0, -it.a1, true);
          ctx.closePath();
          ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 1;
          ctx.beginPath();
        }
        ctx.arc(px, py, r, -it.a0, -it.a1, true);
        ctx.stroke();
        if (it.label) {
          const m = (it.a0 + it.a1) / 2, d = r + 13;
          this._text(it.label, px + Math.cos(m) * d, py - Math.sin(m) * d, col, 'center');
        }
        break;
      }
      case 'area': this._area(it, col); break;
      case 'ellipse': {
        // lodret ellipse (fx et tværsnit af et omdrejningslegeme): ry i enheder, rx i pixels
        const ry = Math.abs(this.sy(it.y + it.ry) - this.sy(it.y));
        if (ry < 0.5) break;
        ctx.beginPath();
        ctx.ellipse(this.sx(it.x), this.sy(it.y), it.rx ?? ry * 0.3, ry, 0, 0, Math.PI * 2);
        if (it.fill) { ctx.globalAlpha = it.alpha ?? 0.12; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.stroke();
        break;
      }
      case 'path': {
        // polylinje gennem punkter [[x, y], ...] – NaN bryder linjen
        ctx.beginPath();
        let pen = false;
        for (const [x, y] of it.points) {
          if (!Number.isFinite(x) || !Number.isFinite(y)) { pen = false; continue; }
          const px = this.sx(x), py = Math.max(-this.h, Math.min(2 * this.h, this.sy(y)));
          if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
        }
        ctx.stroke();
        break;
      }
      case 'point': this._point(it, col); break;
      case 'text':
        this._text(it.text, this.sx(it.x) + (it.dx ?? 0), this.sy(it.y) + (it.dy ?? 0), col, it.align ?? 'left', it.font);
        break;
    }
    ctx.restore();
  }

  _fn(it) {
    const { ctx, h } = this;
    const x0 = Math.max(this.view.xmin, it.xmin ?? -Infinity);
    const x1 = Math.min(this.view.xmax, it.xmax ?? Infinity);
    if (!(x1 > x0)) return;
    const px0 = this.sx(x0), px1 = this.sx(x1);
    ctx.beginPath();
    let pen = false, prev = null;
    for (let px = px0; px <= px1 + 0.75; px += 0.75) {
      const x = this.wx(Math.min(px, px1));
      let y;
      try { y = it.f(x); } catch { y = NaN; }
      if (!Number.isFinite(y)) { pen = false; prev = null; continue; }
      const py = this.sy(y);
      if (prev !== null && Math.abs(py - prev) > h * 2) pen = false; // spring/asymptote
      const cy = Math.max(-h, Math.min(2 * h, py));
      if (!pen) { ctx.moveTo(px, cy); pen = true; } else ctx.lineTo(px, cy);
      prev = py;
    }
    ctx.stroke();
  }

  /** Skraveret areal mellem grafen for f og x-aksen fra a til b (positivt og negativt hver for sig). */
  _area(it, col) {
    const { ctx } = this;
    const a = Math.max(Math.min(it.a, it.b), this.view.xmin), b = Math.min(Math.max(it.a, it.b), this.view.xmax);
    if (!(b > a)) return;
    const n = Math.max(2, Math.ceil(this.sx(b) - this.sx(a)));
    if (it.g) {
      // areal mellem to grafer
      const clampY = (y) => Math.max(-this.h, Math.min(2 * this.h, this.sy(Number.isFinite(y) ? y : 0)));
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; ctx[i ? 'lineTo' : 'moveTo'](this.sx(x), clampY(it.f(x))); }
      for (let i = n; i >= 0; i--) { const x = a + ((b - a) * i) / n; ctx.lineTo(this.sx(x), clampY(it.g(x))); }
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.globalAlpha = it.alpha ?? 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    for (const [sign, color] of [[1, col], [-1, this.color(it.colorNeg ?? it.color)]]) {
      ctx.beginPath();
      ctx.moveTo(this.sx(a), this.sy(0));
      for (let i = 0; i <= n; i++) {
        const x = a + ((b - a) * i) / n;
        let y = it.f(x);
        if (!Number.isFinite(y)) y = 0;
        y = sign > 0 ? Math.max(0, y) : Math.min(0, y);
        ctx.lineTo(this.sx(x), Math.max(-this.h, Math.min(2 * this.h, this.sy(y))));
      }
      ctx.lineTo(this.sx(b), this.sy(0));
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.globalAlpha = it.alpha ?? 0.25;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _segment(it, col) {
    const { ctx } = this;
    const a = [this.sx(it.x1), this.sy(it.y1)], b = [this.sx(it.x2), this.sy(it.y2)];
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
    if (it.arrow) this._arrowHead(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), col, 9);
    if (it.label) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
      const dx = it.labelDx ?? (horiz ? 0 : 8);
      const dy = it.labelDy ?? (horiz ? 14 : 0);
      this._text(it.label, mx + dx, my + dy, col, horiz ? 'center' : 'left');
    }
  }

  _line(it) {
    const { ctx, view: v } = this;
    let pts;
    if (it.x1 === it.x2) pts = [[it.x1, v.ymin], [it.x1, v.ymax]];
    else {
      const m = (it.y2 - it.y1) / (it.x2 - it.x1);
      if (Math.abs(m) <= 1) pts = [[v.xmin, it.y1 + m * (v.xmin - it.x1)], [v.xmax, it.y1 + m * (v.xmax - it.x1)]];
      else pts = [[it.x1 + (v.ymin - it.y1) / m, v.ymin], [it.x1 + (v.ymax - it.y1) / m, v.ymax]];
    }
    if (!pts.flat().every(Number.isFinite)) return;
    ctx.beginPath();
    ctx.moveTo(this.sx(pts[0][0]), this.sy(pts[0][1]));
    ctx.lineTo(this.sx(pts[1][0]), this.sy(pts[1][1]));
    ctx.stroke();
  }

  _point(it, col) {
    const { ctx } = this;
    const px = this.sx(it.x), py = this.sy(it.y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    if (px < -40 || px > this.w + 40 || py < -40 || py > this.h + 40) return;
    const r = it.r ?? (it.drag ? 7 : 5);
    ctx.setLineDash([]);
    if (it.drag) {
      ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.arc(px, py, r + 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    if (it.hollow) {
      ctx.fillStyle = this.color('--g-bg'); ctx.fill();
      ctx.lineWidth = 2.5; ctx.stroke();
    } else {
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.color('--g-bg');
      ctx.stroke();
    }
    if (it.label) this._text(it.label, px + (it.ldx ?? 11), py + (it.ldy ?? -13), col, it.lalign ?? 'left');
  }

  _text(t, x, y, color, align = 'left', font) {
    const { ctx } = this;
    ctx.save();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.font = font ?? `600 13px ${FONT}`;
    ctx.textBaseline = 'middle';
    const wdt = ctx.measureText(t).width;
    let left = align === 'center' ? x - wdt / 2 : align === 'right' ? x - wdt : x;
    left = Math.max(4, Math.min(this.w - 4 - wdt, left));
    ctx.textAlign = 'left';
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.color('--g-bg');
    ctx.strokeText(t, left, y);
    ctx.fillStyle = color;
    ctx.fillText(t, left, y);
    ctx.restore();
  }

  // ---------- interaktion ----------

  _local(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _hit(p, tol) {
    let best = null, bd = tol;
    for (const it of this.items) {
      if (it.type !== 'point' || !it.drag) continue;
      const d = Math.hypot(this.sx(it.x) - p.x, this.sy(it.y) - p.y);
      if (d <= bd) { bd = d; best = it; }
    }
    return best;
  }

  _readout(p) {
    const xr = this.view.xmax - this.view.xmin;
    const d = Math.max(0, Math.min(4, 2 - Math.floor(Math.log10(xr))));
    this.readout.textContent = `x = ${num(this.wx(p.x), d)}   y = ${num(this.wy(p.y), d)}`;
    this.readout.classList.add('on');
  }

  _bind() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = this._local(e);
      this.pointers.set(e.pointerId, p);
      try { c.setPointerCapture(e.pointerId); } catch { /* ignorer */ }
      if (this.pointers.size === 1) {
        const hit = this._hit(p, e.pointerType === 'mouse' ? 15 : 26);
        if (hit) {
          this.dragging = { drag: hit.drag, snap: hit.snap, offx: this.sx(hit.x) - p.x, offy: this.sy(hit.y) - p.y };
          c.style.cursor = 'grabbing';
        } else if (this.opts.pan !== false) {
          this.panning = { p, view: { ...this.view } };
        }
      } else if (this.pointers.size === 2) {
        this.dragging = null;
        this.panning = null;
        const [a, b] = [...this.pointers.values()];
        this.pinch = {
          d: Math.hypot(a.x - b.x, a.y - b.y), view: { ...this.view },
          cx: this.wx((a.x + b.x) / 2), cy: this.wy((a.y + b.y) / 2),
        };
      }
      e.preventDefault();
    });

    c.addEventListener('pointermove', (e) => {
      const p = this._local(e);
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
      if (this.dragging) {
        let x = this.wx(p.x + this.dragging.offx);
        let y = this.wy(p.y + this.dragging.offy);
        const s = this.dragging.snap;
        if (s) { x = +(Math.round(x / s) * s).toFixed(6); y = +(Math.round(y / s) * s).toFixed(6); }
        this.dragging.drag(x, y);
        this.draw();
      } else if (this.pinch && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > 10) {
          const f = this.pinch.d / d, v = this.pinch.view, { cx, cy } = this.pinch;
          this.view = {
            xmin: cx + (v.xmin - cx) * f, xmax: cx + (v.xmax - cx) * f,
            ymin: cy + (v.ymin - cy) * f, ymax: cy + (v.ymax - cy) * f,
          };
          this.userMoved = true;
          this.draw();
        }
      } else if (this.panning) {
        const { p: p0, view: v } = this.panning;
        const dx = ((p.x - p0.x) / this.w) * (v.xmax - v.xmin);
        const dy = ((p.y - p0.y) / this.h) * (v.ymax - v.ymin);
        this.view = { xmin: v.xmin - dx, xmax: v.xmax - dx, ymin: v.ymin + dy, ymax: v.ymax + dy };
        this.userMoved = true;
        this.draw();
      } else if (e.pointerType === 'mouse') {
        c.style.cursor = this._hit(p, 15) ? 'grab' : 'crosshair';
      }
      this._readout(p);
    });

    const end = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 0) {
        this.dragging = null;
        this.panning = null;
        c.style.cursor = '';
        if (this.opts.onDragEnd) this.opts.onDragEnd();
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { if (!this.pointers.size) this.readout.classList.remove('on'); });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = this._local(e);
      this.zoomAt(this.wx(p.x), this.wy(p.y), Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    }, { passive: false });
  }
}
