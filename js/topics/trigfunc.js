import { Graph } from '../graph.js';
import { el, math, slider, toggle, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, pick, shuffle, tn, num, round, near } from '../util.js';

const TAU = 2 * Math.PI;
/** f(x) = A·sin(b(x − c)) + d som TeX. */
function sinTex(A, b, c, d, fn = 'sin') {
  const bx = b === 1 ? 'x' : `${tn(b, 3)}x`;
  const inner = c === 0 ? bx : b === 1 ? `x${c > 0 ? '-' : '+'}${tn(Math.abs(c), 3)}` : `${tn(b, 3)}(x${c > 0 ? '-' : '+'}${tn(Math.abs(c), 3)})`;
  return `${A === 1 ? '' : A === -1 ? '-' : tn(A, 3)}\\${fn}\\left(${inner}\\right)${d ? (d > 0 ? '+' : '-') + tn(Math.abs(d), 3) : ''}`;
}

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { fn: 'sin', A: 2, b: 1, c: 0, d: 1, guides: true };
  const g = new Graph(graphBox, { xmin: -1, xmax: 13, ymin: -4.5, ymax: 5.5 });
  const F = () => (s.fn === 'sin' ? Math.sin : Math.cos);
  const f = (x) => s.A * F()(s.b * (x - s.c)) + s.d;
  const T = () => TAU / s.b;
  const topX = () => s.c + (s.fn === 'sin' ? T() / 4 : 0);

  g.setScene(() => {
    const items = [];
    if (s.guides) {
      items.push({ type: 'hline', y: s.d, color: '--c3', width: 1.5, dash: true });
      items.push({ type: 'hline', y: s.d + s.A, color: '--g-grid', width: 1, dash: [3, 4] });
      items.push({ type: 'hline', y: s.d - s.A, color: '--g-grid', width: 1, dash: [3, 4] });
      const x0 = topX();
      items.push({ type: 'segment', x1: x0, y1: s.d + Math.abs(s.A) + 0.6, x2: x0 + T(), y2: s.d + Math.abs(s.A) + 0.6, color: '--c4', width: 2, label: `T = ${num(T())}` });
      items.push({ type: 'segment', x1: x0, y1: s.d, x2: x0, y2: s.d + s.A, color: '--c2', width: 2.5, label: `A = ${num(s.A)}` });
    }
    items.push({ type: 'fn', f, color: '--c1', width: 3 });
    items.push({
      type: 'point', x: topX(), y: s.d + s.A, color: '--c2', label: 'top',
      drag: (x, y) => { s.c = round(x - (s.fn === 'sin' ? T() / 4 : 0), 2); s.A = round(y - s.d, 1); sA.set(s.A); sc.set(s.c); update(); },
    });
    return items;
  });

  const sA = slider({ label: 'A', min: -4, max: 4, step: 0.1, value: s.A, onInput: (v) => { s.A = v; update(); } });
  const sb = slider({ label: 'b', min: 0.2, max: 4, step: 0.05, value: s.b, onInput: (v) => { s.b = v; update(); } });
  const sc = slider({ label: 'c', min: -6, max: 6, step: 0.05, value: s.c, onInput: (v) => { s.c = v; update(); } });
  const sd = slider({ label: 'd', min: -3, max: 3, step: 0.1, value: s.d, onInput: (v) => { s.d = v; update(); } });
  const fnCtl = segmented([{ value: 'sin', label: 'sin' }, { value: 'cos', label: 'cos' }], s.fn, (v) => { s.fn = v; update(); });
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Skru på parametrene, eller træk i toppunktet. Prøv at finde sammenhængen mellem $b$ og perioden.'),
    fnCtl, el('div', { class: 'sliders' }, sA.row, sb.row, sc.row, sd.row), info,
    el('div', { class: 'toggles' }, toggle('Vis amplitude, periode og ligevægtslinje', s.guides, (v) => { s.guides = v; update(); })),
    card('Husk', `
      <ul>
        <li>$f(x)=A\\sin\\big(b(x-c)\\big)+d$ svinger om <b>ligevægtslinjen</b> $y=d$.</li>
        <li><b>Amplituden</b> $|A|$ er afstanden fra ligevægtslinjen til toppen.</li>
        <li><b>Perioden</b> er $T=\\dfrac{2\\pi}{b}$ – så lang tid går der, før grafen gentager sig.</li>
        <li>$c$ forskyder grafen vandret (faseforskydning).</li>
      </ul>`),
  );

  function update() {
    info.innerHTML = math(`<div class="result">$$f(x)=${sinTex(round(s.A, 2), round(s.b, 3), round(s.c, 2), round(s.d, 2), s.fn)}$$</div>
      $$\\text{Amplitude } |A|=${tn(Math.abs(s.A))},\\quad T=\\frac{2\\pi}{${tn(s.b, 3)}}\\approx ${tn(T(), 3)},\\quad y=${tn(s.d)}$$
      <p>Største værdi $${tn(s.d + Math.abs(s.A))}$, mindste værdi $${tn(s.d - Math.abs(s.A))}$. Værdimængden er $[${tn(s.d - Math.abs(s.A))};${tn(s.d + Math.abs(s.A))}]$.</p>`);
    g.draw();
  }
  update();
}

// ---------- opgaver ----------
const exercises = [
  {
    id: 'aflaes',
    title: 'Aflæs amplitude, periode og ligevægt',
    make() {
      const A = pick([1, 2, 3, 1.5]), T = pick([4, 6, 8, 12]), d = rint(-2, 3), c = rint(0, 2);
      const b = TAU / T, f = (x) => A * Math.sin(b * (x - c)) + d;
      return {
        prompt: 'Grafen viser en funktion af typen $f(x)=A\\sin\\big(b(x-c)\\big)+d$. Aflæs amplituden $A$, perioden $T$ og ligevægtsværdien $d$.',
        graph: {
          view: { xmin: -1, xmax: 14, ymin: d - A - 1.5, ymax: d + A + 1.5, equalAspect: false },
          scene: (st, rev) => [
            { type: 'fn', f, color: '--c1', width: 3 },
            rev && { type: 'hline', y: d, color: '--c3', width: 1.5, dash: true },
            rev && { type: 'segment', x1: c + T / 4, y1: d + A + 0.5, x2: c + T / 4 + T, y2: d + A + 0.5, color: '--c4', width: 2, label: `T = ${T}` },
          ],
        },
        fields: [{ label: 'A', answer: A }, { label: 'T', answer: T }, { label: 'd', answer: d }],
        hint: '$d$ er midt mellem største og mindste værdi. $A$ er afstanden derfra op til toppen. $T$ er afstanden mellem to toppe.',
        solution: `Største værdi er $${tn(d + A)}$ og mindste $${tn(d - A)}$, så $d=\\frac{${tn(d + A)}+${d - A < 0 ? `(${tn(d - A)})` : tn(d - A)}}{2}=${d}$ og $A=${tn(A)}$. Afstanden mellem to toppe er $T=${T}$ (så $b=\\frac{2\\pi}{${T}}\\approx${tn(b, 3)}$).`,
      };
    },
  },
  {
    id: 'periode',
    title: 'Periode',
    make() {
      const b = pick([2, 3, 4, 0.5, Math.PI, Math.PI / 2, Math.PI / 6]);
      const btex = b === Math.PI ? '\\pi' : b === Math.PI / 2 ? '\\frac{\\pi}{2}' : b === Math.PI / 6 ? '\\frac{\\pi}{6}' : tn(b);
      const A = rint(1, 5), d = rint(-3, 5);
      return {
        prompt: `Bestem perioden for $f(x)=${A}\\sin(${btex}x)${d ? (d > 0 ? '+' : '') + d : ''}$. Afrund til to decimaler.`,
        fields: [{ label: 'T', answer: TAU / b, tol: 0.011 }],
        hint: '$T=\\dfrac{2\\pi}{b}$',
        solution: `$$T=\\frac{2\\pi}{${btex}}${b === Math.PI ? '=2' : b === Math.PI / 2 ? '=4' : b === Math.PI / 6 ? '=12' : `\\approx ${tn(TAU / b)}`}$$`,
      };
    },
  },
  {
    id: 'radianer',
    title: 'Grader og radianer',
    make() {
      const deg = pick([30, 45, 60, 90, 120, 135, 150, 180, 270, 360, 225]);
      if (Math.random() < 0.5) return {
        prompt: `Omregn $${deg}^\\circ$ til radianer. Afrund til tre decimaler.`,
        fields: [{ label: 'v', answer: (deg * Math.PI) / 180, tol: 0.0011 }],
        hint: '$180^\\circ=\\pi$ radianer, så $v_{\\text{rad}}=v^\\circ\\cdot\\dfrac{\\pi}{180}$.',
        solution: `$$${deg}\\cdot\\frac{\\pi}{180}=${tn(deg / 180, 4)}\\pi\\approx ${tn((deg * Math.PI) / 180, 3)}$$`,
      };
      const r = round((deg * Math.PI) / 180, 4);
      return {
        prompt: `Omregn $${tn(r, 4)}$ radianer til grader. Afrund til helt tal.`,
        fields: [{ label: 'v', answer: deg, tol: 0.51 }],
        hint: '$v^\\circ=v_{\\text{rad}}\\cdot\\dfrac{180}{\\pi}$',
        solution: `$$${tn(r, 4)}\\cdot\\frac{180}{\\pi}\\approx ${deg}^\\circ$$`,
      };
    },
  },
  {
    id: 'loes',
    title: 'Løs trigonometriske ligninger',
    make() {
      const fn = pick(['sin', 'cos']), k = pick([0.5, -0.5, 0.3, 0.8, -0.7, 0.2]);
      let v1, v2;
      if (fn === 'sin') { v1 = Math.asin(k); v2 = Math.PI - v1; if (v1 < 0) v1 += TAU; }
      else { v1 = Math.acos(k); v2 = TAU - v1; }
      return {
        prompt: `Løs ligningen $\\${fn}(x)=${tn(k)}$ for $x\\in[0;2\\pi[$. Afrund til to decimaler.`,
        fields: [{ label: 'x_1', answer: v1, tol: 0.011 }, { label: 'x_2', answer: v2, tol: 0.011 }],
        unordered: true,
        hint: fn === 'sin' ? 'Den ene løsning er $\\sin^{-1}(k)$. Den anden er $\\pi-\\sin^{-1}(k)$ (symmetri om $y$-aksen på enhedscirklen). Læg evt. $2\\pi$ til.' : 'Den ene løsning er $\\cos^{-1}(k)$. Den anden er $2\\pi-\\cos^{-1}(k)$ (symmetri om $x$-aksen).',
        solution: fn === 'sin'
          ? `$$\\sin^{-1}(${tn(k)})\\approx ${tn(Math.asin(k), 4)}$$ Løsningerne i $[0;2\\pi[$ er $x\\approx ${tn(Math.min(v1, v2))}$ og $x\\approx ${tn(Math.max(v1, v2))}$.`
          : `$$\\cos^{-1}(${tn(k)})\\approx ${tn(v1, 4)},\\qquad 2\\pi-${tn(v1, 4)}\\approx ${tn(v2, 4)}$$`,
      };
    },
  },
  {
    id: 'model',
    title: 'Svingninger i virkeligheden',
    make() {
      const A = pick([1.5, 2, 2.5, 3]), d = pick([5, 6, 8, 10]), T = pick([12, 12.4, 24]);
      const b = round(TAU / T, 4), ask = pick(['max', 'min', 'periode']);
      const ctx = T === 24 ? 'Temperaturen $y$ (°C) i et drivhus $t$ timer efter midnat' : 'Vanddybden $y$ (m) i en havn $t$ timer efter midnat';
      const ans = ask === 'max' ? d + A : ask === 'min' ? d - A : TAU / b;
      return {
        prompt: `${ctx} er beskrevet ved $y=${tn(A)}\\sin(${tn(b, 4)}t)+${d}$. ${ask === 'max' ? 'Hvad er den største værdi?' : ask === 'min' ? 'Hvad er den mindste værdi?' : 'Hvor lang er perioden (i timer)? Afrund til én decimal.'}`,
        fields: [{ label: ask === 'periode' ? 'T' : 'y', answer: ans, tol: ask === 'periode' ? 0.06 : 0.01 }],
        hint: ask === 'periode' ? '$T=\\frac{2\\pi}{b}$' : 'Sinus svinger mellem $-1$ og $1$, så $y$ svinger mellem $d-A$ og $d+A$.',
        solution: ask === 'periode' ? `$$T=\\frac{2\\pi}{${tn(b, 4)}}\\approx ${tn(ans, 1)}\\text{ timer}$$` : `$$y_{${ask}}=${d}${ask === 'max' ? '+' : '-'}${tn(A)}=${tn(ans)}$$`,
      };
    },
  },
  {
    id: 'traektop',
    title: 'Placér svingningen',
    interactive: true,
    make() {
      const T = pick([4, 8]), b = TAU / T, A = pick([1, 1.5, 2, 2.5, 3]), d = rint(-1, 2), c = rint(-1, 2);
      const st = { c: c + 1.5, A: 1 };
      if (A === 1) st.A = 2;
      return {
        prompt: `Perioden er fast. Træk i toppunktet, så grafen bliver grafen for $f(x)=${sinTex(A, round(b, 4), c, d)}$.`,
        graph: {
          view: { xmin: -2, xmax: 10, ymin: d - 4.5, ymax: d + 4.5, equalAspect: false },
          state: st,
          scene: (s, rev) => [
            rev && { type: 'fn', f: (x) => A * Math.sin(b * (x - c)) + d, color: '--c3', width: 2.5, dash: true },
            { type: 'hline', y: d, color: '--g-grid', width: 1, dash: [3, 4] },
            { type: 'fn', f: (x) => s.A * Math.sin(b * (x - s.c)) + d, color: '--c1', width: 3 },
            { type: 'point', x: s.c + T / 4, y: d + s.A, color: '--c2', label: 'top', snap: 0.5, drag: (x, y) => { s.c = x - T / 4; s.A = Math.max(0.5, y - d); } },
          ],
        },
        check: (s) => near(s.A, A) && near(((s.c - c) % T + T) % T, 0, 1e-6) || near(s.A, A) && near(((s.c - c) % T + T) % T, T, 1e-6),
        hint: `Toppen ligger en kvart periode efter $c$, altså ved $x=c+\\frac T4=${c}+${T / 4}$, og i højden $d+A$.`,
        solution: `Toppen skal ligge i $(${c + T / 4};\\,${d + A})$ (eller en hel periode $${T}$ fra).`,
      };
    },
  },
];

const learn = `
<h2>Radianer</h2>
<p>Som funktioner bruger man vinkler i <b>radianer</b>: en hel omgang er $2\\pi$. Altså er $180^\\circ=\\pi$.</p>
<div class="rule">$$v_{\\text{rad}}=v^\\circ\\cdot\\frac{\\pi}{180}\\qquad v^\\circ=v_{\\text{rad}}\\cdot\\frac{180}{\\pi}$$</div>

<h2>Sinus og cosinus som funktioner</h2>
<p>$\\cos x$ og $\\sin x$ er koordinaterne til punktet på enhedscirklen. Lader man $x$ løbe, svinger værdierne mellem $-1$ og $1$, og graferne gentager sig efter $2\\pi$ – de er <b>periodiske</b>.</p>
<ul>
  <li>$\\sin(0)=0$, $\\sin\\left(\\frac\\pi2\\right)=1$; $\\cos(0)=1$, $\\cos\\left(\\frac\\pi2\\right)=0$.</li>
  <li>Cosinus er sinus forskudt: $\\cos x=\\sin\\left(x+\\frac\\pi2\\right)$.</li>
  <li>$(\\sin x)'=\\cos x$ og $(\\cos x)'=-\\sin x$.</li>
</ul>

<h2>Den generelle svingning</h2>
<div class="rule">$$f(x)=A\\sin\\big(b(x-c)\\big)+d$$</div>
<table class="vt"><tbody>
<tr><td>$|A|$</td><td><b>Amplitude</b> – højden af svingningen</td></tr>
<tr><td>$T=\\frac{2\\pi}{b}$</td><td><b>Periode</b> – længden af én svingning</td></tr>
<tr><td>$c$</td><td><b>Faseforskydning</b> – vandret forskydning</td></tr>
<tr><td>$y=d$</td><td><b>Ligevægtslinje</b> – midt mellem top og bund</td></tr>
</tbody></table>
<div class="example">$y=2{,}5\\sin(0{,}5t)+8$ svinger mellem $5{,}5$ og $10{,}5$ med perioden $T=\\frac{2\\pi}{0{,}5}\\approx12{,}6$.</div>

<h2>Trigonometriske ligninger</h2>
<p>På enhedscirklen har $\\sin x=k$ (med $-1<k<1$) to løsninger i hver omgang:</p>
<div class="rule">$$\\sin x=k:\\quad x=\\sin^{-1}(k)\\;\\vee\\;x=\\pi-\\sin^{-1}(k)\\qquad\\cos x=k:\\quad x=\\pm\\cos^{-1}(k)$$</div>
<p>Alle løsninger fås ved at lægge hele perioder $2\\pi\\cdot p$ til.</p>`;

export default {
  id: 'trigfunktioner',
  title: 'Trigonometriske funktioner',
  short: 'Sinus og cosinus',
  formula: 'A\\sin(bx)+d',
  desc: 'Radianer, sinus og cosinus som funktioner, amplitude, periode, faseforskydning og trigonometriske ligninger.',
  learn,
  explore,
  exercises,
};
