// Enkel 3D-visning på canvas: drej ved at trække, zoom med hjulet eller to fingre.
// Elementer: { type: 'segment', a:[x,y,z], b:[x,y,z], color, width, arrow, label, dash }
//            { type: 'point', p:[x,y,z], color, label }  { type: 'poly', points:[[x,y,z],…], color, alpha }
import { Graph } from './graph.js';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export class Graph3D {
  constructor(parent, { range = 5, aspect = '4 / 3' } = {}) {
    this.range = range;
    this.yaw = -0.65;
    this.pitch = 0.42;
    this.zoom = 1;
    this.root = document.createElement('div');
    this.root.className = 'graph';
    this.root.style.aspectRatio = aspect;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    const btns = document.createElement('div');
    btns.className = 'graph-btns';
    const mk = (t, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.title = title; b.setAttribute('aria-label', title); b.addEventListener('click', fn); btns.append(b); };
    mk('+', 'Zoom ind', () => { this.zoom *= 1.25; this.draw(); });
    mk('−', 'Zoom ud', () => { this.zoom /= 1.25; this.draw(); });
    mk('⌂', 'Nulstil visning', () => { this.yaw = -0.65; this.pitch = 0.42; this.zoom = 1; this.draw(); });
    const tip = document.createElement('div');
    tip.className = 'graph-readout on';
    tip.textContent = 'Træk for at dreje';
    this.root.append(this.canvas, tip, btns);
    parent.append(this.root);
    this.scene = () => [];
    this.w = this.h = 0;
    this.pointers = new Map();
    this._bind();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.root);
    Graph.track(this);
    this.resize();
  }
  destroy() { this.ro.disconnect(); cancelAnimationFrame(this._raf); }
  setScene(fn) { this.scene = fn; this.draw(); }
  resize() {
    const r = this.root.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h || (w === this.w && h === this.h)) return;
    this.w = w; this.h = h; this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * this.dpr; this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this._render();
  }
  draw() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this._render(); }); }

  /** Projektion: x mod højre/frem, y ind i skærmen, z op. */
  proj([x, y, z]) {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
    const s = (Math.min(this.w, this.h) / (2.7 * this.range)) * this.zoom;
    return [this.w / 2 + x1 * s, this.h / 2 - (z * cp - y1 * sp) * s];
  }

  _render() {
    const { ctx, w, h } = this;
    if (!w) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const cs = getComputedStyle(this.root);
    const col = (c = '--c1') => (c.startsWith('--') ? cs.getPropertyValue(c).trim() || '#888' : c);
    this.col = col;
    ctx.fillStyle = col('--g-bg');
    ctx.fillRect(0, 0, w, h);
    const R = this.range;
    // gitter i xy-planen
    ctx.strokeStyle = col('--g-grid');
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -R; i <= R; i++) {
      for (const [a, b] of [[[i, -R, 0], [i, R, 0]], [[-R, i, 0], [R, i, 0]]]) {
        const p = this.proj(a), q = this.proj(b);
        ctx.moveTo(...p); ctx.lineTo(...q);
      }
    }
    ctx.stroke();
    // akser
    const axis = col('--g-axis');
    for (const [v, name] of [[[1, 0, 0], 'x'], [[0, 1, 0], 'y'], [[0, 0, 1], 'z']]) {
      const end = v.map((c) => c * (R + 0.6)), start = v.map((c) => -c * R);
      this._seg(start, end, axis, 1.5, true);
      const p = this.proj(v.map((c) => c * (R + 1.1)));
      this._text(name, p[0], p[1], axis, `italic 600 15px ${FONT}`);
      for (let i = -R; i <= R; i++) {
        if (!i || i % 2) continue;
        const q = this.proj(v.map((c) => c * i));
        ctx.fillStyle = axis;
        ctx.beginPath(); ctx.arc(q[0], q[1], 1.8, 0, Math.PI * 2); ctx.fill();
        this._text(String(i), q[0] + 8, q[1] + 8, col('--g-text'), `11px ${FONT}`);
      }
    }
    let items = [];
    try { items = (this.scene() || []).filter(Boolean); } catch (e) { console.error(e); }
    for (const it of items.filter((i) => i.type === 'poly')) {
      ctx.beginPath();
      it.points.forEach((pt, i) => { const p = this.proj(pt); if (i) ctx.lineTo(...p); else ctx.moveTo(...p); });
      ctx.closePath();
      ctx.fillStyle = col(it.color);
      ctx.globalAlpha = it.alpha ?? 0.2;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const it of items.filter((i) => i.type === 'segment')) {
      this._seg(it.a, it.b, col(it.color), it.width ?? 3, it.arrow, it.dash);
      if (it.label) { const p = this.proj(it.b); this._text(it.label, p[0] + 10, p[1] - 10, col(it.color), `600 14px ${FONT}`); }
    }
    for (const it of items.filter((i) => i.type === 'point')) {
      const p = this.proj(it.p);
      ctx.fillStyle = col(it.color);
      ctx.beginPath(); ctx.arc(p[0], p[1], it.r ?? 5, 0, Math.PI * 2); ctx.fill();
      if (it.label) this._text(it.label, p[0] + 10, p[1] - 10, col(it.color), `600 13px ${FONT}`);
    }
  }
  _seg(a, b, color, width, arrow, dash) {
    const { ctx } = this;
    const p = this.proj(a), q = this.proj(b);
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.setLineDash(dash ? [6, 5] : []);
    ctx.beginPath(); ctx.moveTo(...p); ctx.lineTo(...q); ctx.stroke();
    if (arrow) {
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), s = 6 + width * 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(q[0], q[1]);
      ctx.lineTo(q[0] - s * Math.cos(ang - 0.4), q[1] - s * Math.sin(ang - 0.4));
      ctx.lineTo(q[0] - s * Math.cos(ang + 0.4), q[1] - s * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  _text(t, x, y, color, font) {
    const { ctx } = this;
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = this.col('--g-bg'); ctx.strokeText(t, x, y);
    ctx.fillStyle = color; ctx.fillText(t, x, y);
  }
  _bind() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.style.cursor = 'grab';
    c.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { c.setPointerCapture(e.pointerId); } catch { /* ignorer */ }
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.zoom }; }
    });
    c.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      this.pointers.set(e.pointerId, cur);
      if (this.pointers.size === 2 && this.pinch) {
        const [a, b] = [...this.pointers.values()];
        this.zoom = Math.max(0.3, Math.min(4, this.pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / this.pinch.d));
      } else {
        this.yaw += (cur.x - prev.x) * 0.01;
        this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + (cur.y - prev.y) * 0.01));
      }
      this.draw();
    });
    const end = (e) => { this.pointers.delete(e.pointerId); if (this.pointers.size < 2) this.pinch = null; };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom = Math.max(0.3, Math.min(4, this.zoom * Math.exp(-e.deltaY * 0.0015))); this.draw(); }, { passive: false });
  }
}
