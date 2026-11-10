import { Graph3D } from '../graph3d.js';
import { el, math, slider, toggle, exploreLayout, card, hint } from '../ui.js';
import { rint, rintNZ, pick, shuffle, tn, par, num } from '../util.js';

const v3 = (v, d = 2) => `\\begin{pmatrix}${tn(v[0], d)}\\\\${tn(v[1], d)}\\\\${tn(v[2], d)}\\end{pmatrix}`;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(...a);
const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const scale = (k, a) => a.map((x) => k * x);
const deg = (r) => (r * 180) / Math.PI;
const randV = (lo = -4, hi = 4) => [rint(lo, hi), rint(lo, hi), rint(lo, hi)];
const nz = (v) => v.some((x) => x !== 0);
/** ax + by + cz + d = 0 som TeX. */
function planeTex(n, d) {
  const t = [[n[0], 'x'], [n[1], 'y'], [n[2], 'z'], [d, '']].filter(([k]) => k !== 0);
  return t.map(([k, v], i) => `${i === 0 ? (k < 0 ? '-' : '') : k < 0 ? '-' : '+'}${Math.abs(k) === 1 && v ? '' : Math.abs(k)}${v}`).join('') + '=0';
}

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { a: [3, 1, 0], b: [1, 3, 2], cross: true, para: true, plane: false };
  const g = new Graph3D(graphBox, { range: 5 });

  g.setScene(() => {
    const { a, b } = s, c = cross(a, b), items = [];
    if (s.plane) {
      const R = 4, u = scale(R / (len(a) || 1), a), w = scale(R / (len(b) || 1), b);
      items.push({ type: 'poly', points: [add(u, w), sub(u, w), scale(-1, add(u, w)), sub(w, u)], color: '--c3', alpha: 0.12 });
    }
    if (s.para) items.push({ type: 'poly', points: [[0, 0, 0], a, add(a, b), b], color: '--c4', alpha: 0.22 });
    items.push({ type: 'segment', a: [0, 0, 0], b: a, color: '--c1', arrow: true, label: 'a' });
    items.push({ type: 'segment', a: [0, 0, 0], b, color: '--c2', arrow: true, label: 'b' });
    if (s.cross) {
      const k = len(c) > 6 ? 6 / len(c) : 1;
      items.push({ type: 'segment', a: [0, 0, 0], b: scale(k, c), color: '--c5', arrow: true, label: k < 1 ? 'a×b (forkortet)' : 'a×b' });
    }
    return items;
  });

  const sliders = el('div', { class: 'sliders xyz' });
  for (const [name, vec] of [['a', 'a'], ['b', 'b']]) {
    ['x', 'y', 'z'].forEach((axis, i) => {
      sliders.append(slider({ label: `${name}_${axis}`, min: -4, max: 4, step: 1, value: s[vec][i], format: (v) => `${v}`, onInput: (v) => { s[vec][i] = v; update(); } }).row);
    });
  }
  const info = el('div', { class: 'formula' });
  panel.append(
    hint('Træk i 3D-figuren for at dreje den. Skru på koordinaterne til $\\vec a$ og $\\vec b$.'),
    sliders, info,
    el('div', { class: 'toggles' },
      toggle('Krydsprodukt <i>a</i> × <i>b</i>', s.cross, (v) => { s.cross = v; update(); }),
      toggle('Parallelogram udspændt af <i>a</i> og <i>b</i>', s.para, (v) => { s.para = v; update(); }),
      toggle('Planen gennem O udspændt af <i>a</i> og <i>b</i>', s.plane, (v) => { s.plane = v; update(); }),
    ),
    card('Husk', `
      <ul>
        <li>$|\\vec a|=\\sqrt{a_1^2+a_2^2+a_3^2}$ og $\\vec a\\cdot\\vec b=a_1b_1+a_2b_2+a_3b_3$</li>
        <li>$\\vec a\\times\\vec b$ står vinkelret på både $\\vec a$ og $\\vec b$.</li>
        <li>$|\\vec a\\times\\vec b|$ er arealet af parallelogrammet.</li>
      </ul>`),
  );

  function update() {
    const { a, b } = s, c = cross(a, b), d = dot(a, b);
    const ang = len(a) && len(b) ? deg(Math.acos(Math.max(-1, Math.min(1, d / (len(a) * len(b)))))) : NaN;
    info.innerHTML = math(`
      $$\\vec a=${v3(a)},\\quad\\vec b=${v3(b)}$$
      $$|\\vec a|=${tn(len(a))},\\quad |\\vec b|=${tn(len(b))},\\quad \\vec a\\cdot\\vec b=${d}${Number.isFinite(ang) ? `,\\quad v=${tn(ang, 1)}^\\circ` : ''}$$
      <div class="result">$$\\vec a\\times\\vec b=\\begin{pmatrix}${a[1]}\\cdot${par(b[2])}-${par(a[2])}\\cdot${par(b[1])}\\\\${a[2]}\\cdot${par(b[0])}-${par(a[0])}\\cdot${par(b[2])}\\\\${a[0]}\\cdot${par(b[1])}-${par(a[1])}\\cdot${par(b[0])}\\end{pmatrix}=${v3(c)}$$</div>
      $$\\text{Areal af parallelogram}=|\\vec a\\times\\vec b|=${tn(len(c))}$$
      ${s.plane && nz(c) ? `<p class="muted">Planen gennem $O$ har normalvektor $\\vec a\\times\\vec b$:</p>$$${planeTex(c, 0)}$$` : ''}`);
    g.draw();
  }
  update();
}

// ---------- opgaver ----------
const exercises = [
  {
    id: 'laengde',
    title: 'Længde og afstand i rummet',
    make() {
      const P = randV(), Q = randV(), d = len(sub(Q, P));
      return {
        prompt: `Bestem afstanden mellem $P(${P.join(',')})$ og $Q(${Q.join(',')})$. Afrund til to decimaler.`,
        fields: [{ label: '|PQ|', answer: d, tol: 0.006 }],
        hint: '$|PQ|=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2+(z_2-z_1)^2}$',
        solution: `$$\\overrightarrow{PQ}=${v3(sub(Q, P))},\\qquad |PQ|=\\sqrt{${sub(Q, P).map((x) => `${par(x)}^2`).join('+')}}\\approx ${tn(d)}$$`,
      };
    },
  },
  {
    id: 'skalar',
    title: 'Skalarprodukt og vinkel',
    make() {
      let a, b;
      do { a = randV(); b = randV(); } while (!nz(a) || !nz(b));
      if (Math.random() < 0.5) return {
        prompt: `Beregn $\\vec a\\cdot\\vec b$, hvor $\\vec a=${v3(a)}$ og $\\vec b=${v3(b)}$.`,
        fields: [{ label: '\\vec a\\cdot\\vec b', answer: dot(a, b) }],
        hint: '$\\vec a\\cdot\\vec b=a_1b_1+a_2b_2+a_3b_3$',
        solution: `$$${a.map((x, i) => `${par(x)}\\cdot${par(b[i])}`).join('+')}=${dot(a, b)}$$`,
      };
      const v = deg(Math.acos(dot(a, b) / (len(a) * len(b))));
      return {
        prompt: `Bestem vinklen mellem $\\vec a=${v3(a)}$ og $\\vec b=${v3(b)}$. Afrund til én decimal.`,
        fields: [{ label: 'v', answer: v, tol: 0.06 }],
        hint: '$\\cos v=\\dfrac{\\vec a\\cdot\\vec b}{|\\vec a|\\,|\\vec b|}$',
        solution: `$$\\cos v=\\frac{${dot(a, b)}}{\\sqrt{${dot(a, a)}}\\cdot\\sqrt{${dot(b, b)}}}\\quad\\Rightarrow\\quad v\\approx ${tn(v, 1)}^\\circ$$`,
      };
    },
  },
  {
    id: 'kryds',
    title: 'Krydsprodukt',
    make() {
      const a = randV(-3, 3), b = randV(-3, 3), c = cross(a, b);
      return {
        prompt: `Bestem $\\vec a\\times\\vec b$, hvor $\\vec a=${v3(a)}$ og $\\vec b=${v3(b)}$.`,
        fields: [{ label: 'x', answer: c[0] }, { label: 'y', answer: c[1] }, { label: 'z', answer: c[2] }],
        hint: '$\\vec a\\times\\vec b=\\begin{pmatrix}a_2b_3-a_3b_2\\\\a_3b_1-a_1b_3\\\\a_1b_2-a_2b_1\\end{pmatrix}$',
        solution: `$$\\vec a\\times\\vec b=\\begin{pmatrix}${a[1]}\\cdot${par(b[2])}-${par(a[2])}\\cdot${par(b[1])}\\\\${a[2]}\\cdot${par(b[0])}-${par(a[0])}\\cdot${par(b[2])}\\\\${a[0]}\\cdot${par(b[1])}-${par(a[1])}\\cdot${par(b[0])}\\end{pmatrix}=${v3(c)}$$`,
      };
    },
  },
  {
    id: 'trekantareal',
    title: 'Areal af trekant i rummet',
    make() {
      let A, B, C, cr;
      do { A = randV(-3, 3); B = randV(-3, 3); C = randV(-3, 3); cr = cross(sub(B, A), sub(C, A)); } while (!nz(cr));
      const T = len(cr) / 2;
      return {
        prompt: `Bestem arealet af trekanten med hjørnerne $A(${A.join(',')})$, $B(${B.join(',')})$ og $C(${C.join(',')})$. Afrund til to decimaler.`,
        fields: [{ label: 'T', answer: T, tol: 0.006 }],
        hint: '$T=\\tfrac12\\,|\\overrightarrow{AB}\\times\\overrightarrow{AC}|$',
        solution: `$$\\overrightarrow{AB}=${v3(sub(B, A))},\\quad\\overrightarrow{AC}=${v3(sub(C, A))},\\quad \\overrightarrow{AB}\\times\\overrightarrow{AC}=${v3(cr)}$$ $$T=\\tfrac12\\sqrt{${dot(cr, cr)}}\\approx ${tn(T)}$$`,
      };
    },
  },
  {
    id: 'plan',
    title: 'Planens ligning',
    make() {
      let n;
      do n = randV(-4, 4); while (!nz(n));
      const P = randV(-4, 4), d = -dot(n, P);
      return {
        prompt: `En plan $\\alpha$ går gennem $P(${P.join(',')})$ og har normalvektoren $\\vec n=${v3(n)}$. Ligningen er $${planeTex(n, 0).replace('=0', '')}+d=0$. Bestem $d$.`,
        fields: [{ label: 'd', answer: d }],
        hint: 'Planen gennem $P(x_0,y_0,z_0)$ med normalvektor $\\vec n$: $a(x-x_0)+b(y-y_0)+c(z-z_0)=0$. Eller indsæt $P$ i ligningen.',
        solution: `Indsæt $P$: $${n.map((k, i) => `${par(k)}\\cdot${par(P[i])}`).join('+')}+d=0$, så $d=${d}$. $$\\alpha:\\;${planeTex(n, d)}$$`,
      };
    },
  },
  {
    id: 'afstandplan',
    title: 'Afstand fra punkt til plan',
    make() {
      let n;
      do n = pick([[1, 2, 2], [2, -1, 2], [2, 3, 6], [1, -2, 2], [4, 4, 2], [0, 3, 4], [1, 1, 1], [2, 0, -1]]); while (!nz(n));
      const d = rint(-8, 8), Q = randV(-4, 4), dist = Math.abs(dot(n, Q) + d) / len(n);
      return {
        prompt: `Bestem afstanden fra punktet $Q(${Q.join(',')})$ til planen $${planeTex(n, d)}$. Afrund til to decimaler.`,
        fields: [{ label: '\\text{dist}', answer: dist, tol: 0.006 }],
        hint: '$\\text{dist}(Q,\\alpha)=\\dfrac{|ax_0+by_0+cz_0+d|}{\\sqrt{a^2+b^2+c^2}}$',
        solution: `$$\\text{dist}=\\frac{|${n.map((k, i) => `${par(k)}\\cdot${par(Q[i])}`).join('+')}${d < 0 ? '' : '+'}${d}|}{\\sqrt{${dot(n, n)}}}=\\frac{${Math.abs(dot(n, Q) + d)}}{\\sqrt{${dot(n, n)}}}\\approx ${tn(dist)}$$`,
      };
    },
  },
  {
    id: 'linje',
    title: 'Parameterfremstilling for en linje',
    make() {
      const P = randV(-4, 4);
      let r;
      do r = randV(-3, 3); while (!nz(r));
      const t = rintNZ(-3, 3), X = add(P, scale(t, r));
      return {
        prompt: `Linjen $\\ell$ har parameterfremstillingen $$\\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}=${v3(P)}+t\\cdot${v3(r)}$$ Bestem punktet på $\\ell$ svarende til $t=${t}$.`,
        fields: [{ label: 'x', answer: X[0] }, { label: 'y', answer: X[1] }, { label: 'z', answer: X[2] }],
        hint: 'Indsæt $t$ og regn koordinatvis.',
        solution: `$$${v3(P)}+${par(t)}\\cdot${v3(r)}=${v3(X)}$$`,
      };
    },
  },
  {
    id: 'skaering',
    title: 'Skæring mellem linje og plan',
    make() {
      let n, r;
      do { n = randV(-3, 3); r = randV(-3, 3); } while (!nz(n) || dot(n, r) === 0);
      const t0 = rintNZ(-3, 3), P = randV(-3, 3), S = add(P, scale(t0, r)), d = -dot(n, S);
      return {
        prompt: `Linjen $\\ell:\\;\\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}=${v3(P)}+t\\cdot${v3(r)}$ skærer planen $${planeTex(n, d)}$. Bestem parameterværdien $t$ for skæringspunktet.`,
        fields: [{ label: 't', answer: t0 }],
        hint: 'Indsæt linjens koordinater $(x,y,z)$ i planens ligning, og løs den for $t$.',
        solution: `Indsæt: $${n.map((k, i) => `${par(k)}(${P[i]}${r[i] < 0 ? '' : '+'}${r[i]}t)`).join('+')}${d < 0 ? '' : '+'}${d}=0$, som giver $t=${t0}$. Skæringspunktet er $(${S.join(',')})$.`,
      };
    },
  },
  {
    id: 'kugle',
    title: 'Kuglens ligning',
    make() {
      const C = randV(-4, 4), r = rint(1, 6);
      const expanded = Math.random() < 0.5;
      const sq = (v, c) => (c === 0 ? `${v}^2` : `(${v}${c > 0 ? '-' : '+'}${Math.abs(c)})^2`);
      const eqn = expanded
        ? `x^2+y^2+z^2${C.map((c, i) => (c ? `${-2 * c < 0 ? '-' : '+'}${Math.abs(2 * c)}${'xyz'[i]}` : '')).join('')}${dot(C, C) - r * r ? `${dot(C, C) - r * r < 0 ? '-' : '+'}${Math.abs(dot(C, C) - r * r)}` : ''}=0`
        : `${sq('x', C[0])}+${sq('y', C[1])}+${sq('z', C[2])}=${r * r}`;
      return {
        prompt: `Bestem centrum og radius for kuglen $${eqn}$.`,
        fields: [{ label: 'x_C', answer: C[0] }, { label: 'y_C', answer: C[1] }, { label: 'z_C', answer: C[2] }, { label: 'r', answer: r }],
        hint: expanded ? 'Kvadratkompletér for $x$, $y$ og $z$ hver for sig.' : 'Sammenlign med $(x-a)^2+(y-b)^2+(z-c)^2=r^2$.',
        solution: `$$${sq('x', C[0])}+${sq('y', C[1])}+${sq('z', C[2])}=${r * r}$$ Centrum $C(${C.join(',')})$ og radius $r=${r}$.`,
      };
    },
  },
];

const learn = `
<h2>Koordinater og vektorer i rummet</h2>
<p>Et punkt har tre koordinater $P(x,y,z)$, og en vektor tre koordinater $\\vec a=\\begin{pmatrix}a_1\\\\a_2\\\\a_3\\end{pmatrix}$. Man regner som i planen – bare med én koordinat mere.</p>
<div class="rule">$$|\\vec a|=\\sqrt{a_1^2+a_2^2+a_3^2}\\qquad \\vec a\\cdot\\vec b=a_1b_1+a_2b_2+a_3b_3=|\\vec a||\\vec b|\\cos v$$</div>

<h2>Krydsprodukt (vektorprodukt)</h2>
<div class="rule">$$\\vec a\\times\\vec b=\\begin{pmatrix}a_2b_3-a_3b_2\\\\a_3b_1-a_1b_3\\\\a_1b_2-a_2b_1\\end{pmatrix}$$</div>
<ul>
  <li>$\\vec a\\times\\vec b$ står <b>vinkelret</b> på både $\\vec a$ og $\\vec b$ (højrehåndsreglen giver retningen).</li>
  <li>$|\\vec a\\times\\vec b|$ er <b>arealet af parallelogrammet</b> udspændt af $\\vec a$ og $\\vec b$; trekanten har det halve areal.</li>
  <li>$\\vec a\\times\\vec b=\\vec 0$ netop når vektorerne er parallelle.</li>
</ul>

<h2>Linjer i rummet</h2>
<p>En linje gennem $P$ med retningsvektor $\\vec r$ har <b>parameterfremstillingen</b></p>
<div class="rule">$$\\begin{pmatrix}x\\\\y\\\\z\\end{pmatrix}=\\begin{pmatrix}x_0\\\\y_0\\\\z_0\\end{pmatrix}+t\\cdot\\vec r,\\quad t\\in\\mathbb R$$</div>

<h2>Planer</h2>
<p>En plan gennem $P(x_0,y_0,z_0)$ med <b>normalvektor</b> $\\vec n=\\begin{pmatrix}a\\\\b\\\\c\\end{pmatrix}$:</p>
<div class="rule">$$a(x-x_0)+b(y-y_0)+c(z-z_0)=0\\quad\\Leftrightarrow\\quad ax+by+cz+d=0$$</div>
<p>Kender man to vektorer $\\vec u,\\vec v$ i planen, er $\\vec n=\\vec u\\times\\vec v$ en normalvektor. Planen kan også skrives med parameterfremstilling $P+s\\vec u+t\\vec v$.</p>
<div class="rule">$$\\text{dist}(Q,\\alpha)=\\frac{|ax_0+by_0+cz_0+d|}{\\sqrt{a^2+b^2+c^2}}$$</div>

<h2>Skæring og vinkler</h2>
<ul>
  <li><b>Linje og plan</b>: indsæt linjens parameterfremstilling i planens ligning, og løs for $t$.</li>
  <li><b>Vinkel mellem to planer</b>: vinklen mellem normalvektorerne.</li>
  <li><b>Vinkel mellem linje og plan</b>: $90^\\circ$ minus vinklen mellem retningsvektor og normalvektor.</li>
</ul>

<h2>Kuglen</h2>
<div class="rule">$$(x-a)^2+(y-b)^2+(z-c)^2=r^2$$</div>
<p>Centrum $(a,b,c)$ og radius $r$. Står ligningen udregnet, bruges kvadratkomplettering som ved cirklen.</p>`;

export default {
  id: 'rummet',
  title: 'Vektorer i rummet',
  short: 'Rummet',
  formula: '\\vec a\\times\\vec b',
  desc: 'Vektorer, skalar- og krydsprodukt, areal, linjer og planer i rummet, afstande, skæring og kuglen – med en drejelig 3D-visning.',
  learn,
  explore,
  exercises,
};
