import { Graph } from '../graph.js';
import { el, math, toggle, exploreLayout, card, hint } from '../ui.js';
import { rint, rintNZ, pick, tn, par, num, near } from '../util.js';

const vt = (x, y, d = 2) => `\\begin{pmatrix}${tn(x, d)}\\\\${tn(y, d)}\\end{pmatrix}`;
const len = (v) => Math.hypot(v.x, v.y);
const dot = (u, v) => u.x * v.x + u.y * v.y;
const det = (u, v) => u.x * v.y - u.y * v.x;
const angle = (u, v) => (Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v))))) * 180) / Math.PI;
const arrow = (x1, y1, x2, y2, color, label, extra = {}) => ({ type: 'segment', x1, y1, x2, y2, color, width: 3, arrow: true, label, ...extra });

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { a: { x: 3, y: 1 }, b: { x: 1, y: 3 }, sum: true, diff: false, proj: false, area: false };
  const g = new Graph(graphBox, { xmin: -6, xmax: 7, ymin: -4, ymax: 6 });

  g.setScene(() => {
    const { a, b } = s;
    const items = [];
    if (s.area) items.push({ type: 'polygon', points: [[0, 0], [a.x, a.y], [a.x + b.x, a.y + b.y], [b.x, b.y]], color: '--c4', alpha: 0.15 });
    if (s.sum) {
      items.push({ type: 'segment', x1: a.x, y1: a.y, x2: a.x + b.x, y2: a.y + b.y, color: '--c2', width: 1.5, dash: true });
      items.push({ type: 'segment', x1: b.x, y1: b.y, x2: a.x + b.x, y2: a.y + b.y, color: '--c1', width: 1.5, dash: true });
      items.push(arrow(0, 0, a.x + b.x, a.y + b.y, '--c3', 'a + b'));
    }
    if (s.diff) items.push(arrow(b.x, b.y, a.x, a.y, '--c5', 'a − b'));
    if (s.proj && len(b) > 0) {
      const k = dot(a, b) / dot(b, b), px = k * b.x, py = k * b.y;
      items.push({ type: 'line', x1: 0, y1: 0, x2: b.x, y2: b.y, color: '--g-grid', width: 1.5 });
      items.push({ type: 'segment', x1: a.x, y1: a.y, x2: px, y2: py, color: '--c4', width: 1.5, dash: [3, 4] });
      items.push(arrow(0, 0, px, py, '--c4', 'proj'));
    }
    items.push(arrow(0, 0, a.x, a.y, '--c1', null), arrow(0, 0, b.x, b.y, '--c2', null));
    items.push({ type: 'point', x: a.x, y: a.y, color: '--c1', label: 'a', snap: 0.5, drag: (x, y) => { s.a = { x, y }; update(); } });
    items.push({ type: 'point', x: b.x, y: b.y, color: '--c2', label: 'b', snap: 0.5, drag: (x, y) => { s.b = { x, y }; update(); } });
    return items;
  });

  const info = el('div', { class: 'formula' });
  panel.append(
    hint('Træk i spidserne af $\\vec a$ og $\\vec b$.'),
    info,
    el('div', { class: 'toggles' },
      toggle('Sum <i>a</i> + <i>b</i> (parallelogram)', s.sum, (v) => { s.sum = v; update(); }),
      toggle('Differens <i>a</i> − <i>b</i>', s.diff, (v) => { s.diff = v; update(); }),
      toggle('Projektion af <i>a</i> på <i>b</i>', s.proj, (v) => { s.proj = v; update(); }),
      toggle('Areal af parallelogram', s.area, (v) => { s.area = v; update(); }),
    ),
    card('Husk', `
      <ul>
        <li>Længde: $|\\vec a|=\\sqrt{a_1^2+a_2^2}$</li>
        <li>Skalarprodukt: $\\vec a\\cdot\\vec b=a_1b_1+a_2b_2=|\\vec a||\\vec b|\\cos v$</li>
        <li>$\\vec a\\perp\\vec b\\Leftrightarrow \\vec a\\cdot\\vec b=0$</li>
        <li>Determinant: $\\det(\\vec a,\\vec b)=a_1b_2-a_2b_1$ = areal af parallelogrammet (med fortegn)</li>
      </ul>`),
  );

  function update() {
    const { a, b } = s;
    const d = dot(a, b), D = det(a, b);
    const ok = len(a) > 0 && len(b) > 0;
    info.innerHTML = math(`
      $$\\vec a=${vt(a.x, a.y)},\\qquad \\vec b=${vt(b.x, b.y)}$$
      $$|\\vec a|=${tn(len(a))},\\qquad |\\vec b|=${tn(len(b))}$$
      $$\\vec a+\\vec b=${vt(a.x + b.x, a.y + b.y)},\\qquad \\vec a-\\vec b=${vt(a.x - b.x, a.y - b.y)}$$
      <div class="result">$$\\vec a\\cdot\\vec b=${par(a.x)}\\cdot${par(b.x)}+${par(a.y)}\\cdot${par(b.y)}=${tn(d)}$$</div>
      ${ok ? `$$v=\\cos^{-1}\\!\\left(\\frac{\\vec a\\cdot\\vec b}{|\\vec a||\\vec b|}\\right)=${tn(angle(a, b), 1)}^\\circ$$` : ''}
      ${Math.abs(d) < 1e-9 && ok ? '<p><span class="badge b-ok">ortogonale</span> Skalarproduktet er 0, så vektorerne står vinkelret på hinanden.</p>' : ''}
      $$\\det(\\vec a,\\vec b)=${tn(D)}\\quad\\Rightarrow\\quad\\text{areal}=${tn(Math.abs(D))}$$`);
    g.draw();
  }
  update();
}

// ---------- opgaver ----------

const exercises = [
  {
    id: 'regning',
    title: 'Regning med vektorer',
    make() {
      const a = { x: rint(-5, 5), y: rint(-5, 5) }, b = { x: rint(-5, 5), y: rint(-5, 5) };
      const k = rintNZ(-3, 3), m = pick([1, -1, 2]);
      const r = { x: k * a.x + m * b.x, y: k * a.y + m * b.y };
      const expr = `${k === 1 ? '' : k === -1 ? '-' : k}\\vec a${m < 0 ? '-' : '+'}${Math.abs(m) === 1 ? '' : Math.abs(m)}\\vec b`;
      return {
        prompt: `Givet $\\vec a=${vt(a.x, a.y)}$ og $\\vec b=${vt(b.x, b.y)}$. Bestem koordinaterne til $${expr}$.`,
        fields: [{ label: 'x', answer: r.x }, { label: 'y', answer: r.y }],
        hint: 'Regn koordinatvis: gang hver koordinat med tallet, og læg de tilsvarende koordinater sammen.',
        solution: `$$${expr}=${vt(r.x, r.y)}$$`,
      };
    },
  },
  {
    id: 'laengde',
    title: 'Længde og afstand',
    make() {
      if (Math.random() < 0.5) {
        const a = { x: rintNZ(-8, 8), y: rintNZ(-8, 8) }, L = len(a);
        return {
          prompt: `Bestem længden af $\\vec a=${vt(a.x, a.y)}$. Afrund til to decimaler.`,
          fields: [{ label: '|\\vec a|', answer: L, tol: 0.011 }],
          hint: '$|\\vec a|=\\sqrt{a_1^2+a_2^2}$',
          solution: `$$|\\vec a|=\\sqrt{${par(a.x)}^2+${par(a.y)}^2}=\\sqrt{${a.x ** 2 + a.y ** 2}}\\approx ${tn(L)}$$`,
        };
      }
      const P = { x: rint(-6, 6), y: rint(-6, 6) }, Q = { x: rint(-6, 6), y: rint(-6, 6) };
      const d = Math.hypot(Q.x - P.x, Q.y - P.y);
      return {
        prompt: `Bestem afstanden mellem punkterne $P(${P.x},${P.y})$ og $Q(${Q.x},${Q.y})$. Afrund til to decimaler.`,
        fields: [{ label: '|PQ|', answer: d, tol: 0.011 }],
        hint: 'Find vektoren $\\overrightarrow{PQ}$ (slut minus start), og beregn dens længde.',
        solution: `$$\\overrightarrow{PQ}=${vt(Q.x - P.x, Q.y - P.y)},\\qquad |PQ|=\\sqrt{${par(Q.x - P.x)}^2+${par(Q.y - P.y)}^2}\\approx ${tn(d)}$$`,
      };
    },
  },
  {
    id: 'skalar',
    title: 'Skalarprodukt og vinkel',
    make() {
      const a = { x: rintNZ(-6, 6), y: rint(-6, 6) }, b = { x: rint(-6, 6), y: rintNZ(-6, 6) };
      const d = dot(a, b);
      if (Math.random() < 0.5) return {
        prompt: `Beregn skalarproduktet $\\vec a\\cdot\\vec b$, hvor $\\vec a=${vt(a.x, a.y)}$ og $\\vec b=${vt(b.x, b.y)}$.`,
        fields: [{ label: '\\vec a\\cdot\\vec b', answer: d }],
        hint: '$\\vec a\\cdot\\vec b=a_1b_1+a_2b_2$',
        solution: `$$\\vec a\\cdot\\vec b=${par(a.x)}\\cdot${par(b.x)}+${par(a.y)}\\cdot${par(b.y)}=${d}$$`,
      };
      const v = angle(a, b);
      return {
        prompt: `Bestem vinklen mellem $\\vec a=${vt(a.x, a.y)}$ og $\\vec b=${vt(b.x, b.y)}$. Afrund til én decimal.`,
        fields: [{ label: 'v', answer: v, tol: 0.06 }],
        hint: '$\\cos v=\\dfrac{\\vec a\\cdot\\vec b}{|\\vec a|\\cdot|\\vec b|}$',
        solution: `$$\\cos v=\\frac{${d}}{\\sqrt{${a.x ** 2 + a.y ** 2}}\\cdot\\sqrt{${b.x ** 2 + b.y ** 2}}}\\quad\\Rightarrow\\quad v\\approx ${tn(v, 1)}^\\circ$$`,
      };
    },
  },
  {
    id: 'ortogonal',
    title: 'Ortogonale vektorer',
    make() {
      const b = { x: rintNZ(-5, 5), y: rintNZ(-5, 5) };
      const k = rintNZ(-3, 3);
      const t = -k * b.y, s2 = k * b.x; // (t, s2) ⟂ b
      // spørg efter t, når andenkoordinaten er kendt
      return {
        prompt: `Bestem $t$, så $\\vec a=${`\\begin{pmatrix}t\\\\${s2}\\end{pmatrix}`}$ står vinkelret på $\\vec b=${vt(b.x, b.y)}$.`,
        fields: [{ label: 't', answer: t }],
        hint: 'To vektorer er ortogonale, netop når skalarproduktet er 0.',
        solution: `$$\\vec a\\cdot\\vec b=${b.x}t+${par(s2)}\\cdot${par(b.y)}=0\\quad\\Leftrightarrow\\quad ${b.x}t=${-s2 * b.y}\\quad\\Leftrightarrow\\quad t=${t}$$`,
      };
    },
  },
  {
    id: 'determinant',
    title: 'Determinant og areal',
    make() {
      let a, b;
      do { a = { x: rint(-5, 5), y: rint(-5, 5) }; b = { x: rint(-5, 5), y: rint(-5, 5) }; } while (det(a, b) === 0);
      const D = det(a, b);
      return {
        prompt: `Bestem arealet af parallelogrammet udspændt af $\\vec a=${vt(a.x, a.y)}$ og $\\vec b=${vt(b.x, b.y)}$.`,
        fields: [{ label: 'A', answer: Math.abs(D) }],
        hint: 'Arealet er den numeriske værdi af determinanten $\\det(\\vec a,\\vec b)=a_1b_2-a_2b_1$.',
        solution: `$$\\det(\\vec a,\\vec b)=${par(a.x)}\\cdot${par(b.y)}-${par(a.y)}\\cdot${par(b.x)}=${D}$$ Arealet er $|${D}|=${Math.abs(D)}$.`,
      };
    },
  },
  {
    id: 'tegnsum',
    title: 'Tegn summen',
    interactive: true,
    make() {
      const a = { x: rint(-3, 4), y: rint(-3, 3) }, b = { x: rint(-3, 3), y: rint(-2, 3) };
      const k = pick([['+', 1], ['-', -1]]);
      const target = { x: a.x + k[1] * b.x, y: a.y + k[1] * b.y };
      const st = { v: target.x === 1 && target.y === 1 ? { x: -1, y: 1 } : { x: 1, y: 1 } };
      return {
        prompt: `Træk spidsen af den grønne vektor, så den bliver $\\vec a${k[0]}\\vec b$.`,
        graph: {
          view: { xmin: -7, xmax: 7, ymin: -6, ymax: 6 },
          state: st,
          scene: (s, rev) => [
            rev && arrow(0, 0, target.x, target.y, '--c4', null, { dash: true, width: 2 }),
            arrow(0, 0, a.x, a.y, '--c1', 'a'),
            arrow(0, 0, b.x, b.y, '--c2', 'b'),
            arrow(0, 0, s.v.x, s.v.y, '--c3', null),
            { type: 'point', x: s.v.x, y: s.v.y, color: '--c3', snap: 1, drag: (x, y) => { s.v = { x, y }; } },
          ],
        },
        check: (s) => near(s.v.x, target.x) && near(s.v.y, target.y),
        hint: k[1] > 0 ? 'Sæt $\\vec b$ i forlængelse af $\\vec a$ (spids mod hale) – eller læg koordinaterne sammen.' : '$\\vec a-\\vec b=\\vec a+(-\\vec b)$. Træk koordinaterne fra hinanden.',
        solution: `$$\\vec a${k[0]}\\vec b=${vt(a.x, a.y)}${k[0]}${vt(b.x, b.y)}=${vt(target.x, target.y)}$$`,
      };
    },
  },
  {
    id: 'tegnortogonal',
    title: 'Tegn en ortogonal vektor',
    interactive: true,
    make() {
      const a = pick([{ x: 2, y: 1 }, { x: 1, y: 2 }, { x: 3, y: 1 }, { x: 1, y: -2 }, { x: 2, y: -3 }, { x: 3, y: 2 }]);
      const st = { v: { x: 3, y: 3 } };
      if (dot(a, st.v) === 0) st.v = { x: 2, y: 3 };
      return {
        prompt: `Træk spidsen af $\\vec b$, så $\\vec b$ står <b>vinkelret</b> på $\\vec a=${vt(a.x, a.y)}$.`,
        graph: {
          view: { xmin: -6, xmax: 6, ymin: -5, ymax: 5 },
          state: st,
          scene: (s, rev) => [
            rev && { type: 'line', x1: 0, y1: 0, x2: -a.y, y2: a.x, color: '--c3', width: 2, dash: true },
            arrow(0, 0, a.x, a.y, '--c1', 'a'),
            arrow(0, 0, s.v.x, s.v.y, '--c2', null),
            { type: 'point', x: s.v.x, y: s.v.y, color: '--c2', label: 'b', snap: 1, drag: (x, y) => { s.v = { x, y }; } },
          ],
        },
        check: (s) => dot(a, s.v) === 0 && len(s.v) > 0,
        hint: 'Skalarproduktet skal være 0. Tværvektoren $\\hat a=\\begin{pmatrix}-a_2\\\\a_1\\end{pmatrix}$ står altid vinkelret på $\\vec a$.',
        solution: `Fx tværvektoren $\\hat a=${vt(-a.y, a.x)}$, for $${vt(a.x, a.y)}\\cdot${vt(-a.y, a.x)}=${a.x}\\cdot${par(-a.y)}+${par(a.y)}\\cdot${par(a.x)}=0$. Alle vektorer på den stiplede linje (undtagen nulvektoren) virker.`,
      };
    },
  },
];

const learn = `
<h2>Hvad er en vektor?</h2>
<p>En vektor har en <b>længde</b> og en <b>retning</b> – men ingen fast placering. Den skrives med koordinater $\\vec a=\\begin{pmatrix}a_1\\\\a_2\\end{pmatrix}$. Vektoren fra $P$ til $Q$ er "slut minus start":</p>
<div class="rule">$$\\overrightarrow{PQ}=\\begin{pmatrix}q_1-p_1\\\\q_2-p_2\\end{pmatrix}\\qquad |\\vec a|=\\sqrt{a_1^2+a_2^2}$$</div>

<h2>Regning med vektorer</h2>
<p>Man regner <b>koordinatvis</b>. Grafisk lægges vektorer sammen ved at sætte dem i forlængelse af hinanden (spids mod hale).</p>
<div class="rule">$$\\vec a+\\vec b=\\begin{pmatrix}a_1+b_1\\\\a_2+b_2\\end{pmatrix}\\qquad k\\cdot\\vec a=\\begin{pmatrix}k\\,a_1\\\\k\\,a_2\\end{pmatrix}$$</div>

<h2>Skalarprodukt (prikprodukt)</h2>
<div class="rule">$$\\vec a\\cdot\\vec b=a_1b_1+a_2b_2=|\\vec a|\\,|\\vec b|\\cos v$$</div>
<ul>
  <li>Vinklen mellem vektorerne: $\\cos v=\\dfrac{\\vec a\\cdot\\vec b}{|\\vec a|\\,|\\vec b|}$</li>
  <li>$\\vec a\\perp\\vec b\\Leftrightarrow\\vec a\\cdot\\vec b=0$ (ortogonale)</li>
  <li>Tværvektoren $\\hat a=\\begin{pmatrix}-a_2\\\\a_1\\end{pmatrix}$ er $\\vec a$ drejet $90^\\circ$ mod uret.</li>
</ul>
<div class="example">$$\\begin{pmatrix}3\\\\1\\end{pmatrix}\\cdot\\begin{pmatrix}1\\\\3\\end{pmatrix}=3\\cdot1+1\\cdot3=6$$</div>

<h2>Projektion</h2>
<div class="rule">$$\\vec a_{\\vec b}=\\frac{\\vec a\\cdot\\vec b}{|\\vec b|^2}\\,\\vec b\\qquad |\\vec a_{\\vec b}|=\\frac{|\\vec a\\cdot\\vec b|}{|\\vec b|}$$</div>

<h2>Determinant og areal</h2>
<div class="rule">$$\\det(\\vec a,\\vec b)=a_1b_2-a_2b_1$$</div>
<p>$|\\det(\\vec a,\\vec b)|$ er arealet af parallelogrammet udspændt af $\\vec a$ og $\\vec b$. Trekantens areal er det halve. Er determinanten 0, er vektorerne parallelle.</p>`;

export default {
  id: 'vektorer',
  title: 'Vektorer i planen',
  short: 'Vektorer',
  formula: '\\vec a\\cdot\\vec b=a_1b_1+a_2b_2',
  desc: 'Koordinater, længde, sum og differens, skalarprodukt, vinkler, projektion og determinant.',
  learn,
  explore,
  exercises,
};
