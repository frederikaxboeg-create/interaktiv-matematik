import { Graph } from '../graph.js';
import { el, math, slider, exploreLayout, card, hint } from '../ui.js';
import { rint, pick, shuffle, tn, pt, num, round, clamp } from '../util.js';

const powTex = (b, a) => `${b === 1 ? '' : `${tn(b, 3)}\\cdot `}x^{${tn(a, 3)}}`;

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { a: 2, b: 1, rx: 10 };
  const g = new Graph(graphBox, { xmin: -1, xmax: 8, ymin: -1, ymax: 8 });

  g.setScene(() => {
    const { a, b } = s;
    const f = (x) => (x > 0 ? b * x ** a : NaN);
    const x1 = 2, x2 = x1 * (1 + s.rx / 100);
    return [
      { type: 'fn', f: (x) => x, color: '--g-grid', width: 1.5, dash: [4, 4], xmin: 0 },
      { type: 'fn', f, color: '--c1', width: 3, xmin: 1e-6 },
      { type: 'segment', x1: x1, y1: 0, x2: x1, y2: f(x1), color: '--c4', width: 1.5, dash: [3, 4] },
      { type: 'segment', x1: x2, y1: 0, x2: x2, y2: f(x2), color: '--c4', width: 1.5, dash: [3, 4] },
      { type: 'point', x: x1, y: f(x1), color: '--c4', r: 4 },
      { type: 'point', x: x2, y: f(x2), color: '--c4', r: 4 },
      {
        type: 'point', x: 1, y: b, color: '--c2', label: `(1; ${num(b)})`,
        drag: (x, y) => { s.b = clamp(round(y, 1), 0.1, 10); sb.set(s.b); update(); },
      },
    ];
  });

  const sa = slider({ label: 'a', min: -2, max: 3, step: 0.1, value: s.a, onInput: (v) => { s.a = v; update(); } });
  const sb = slider({ label: 'b', min: 0.1, max: 5, step: 0.1, value: s.b, onInput: (v) => { s.b = v; update(); } });
  const sr = slider({ label: 'r_x', min: 1, max: 100, step: 1, value: s.rx, format: (v) => `${v}\\,\\%`, onInput: (v) => { s.rx = v; update(); } });
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Skru på $a$ og $b$, eller træk i punktet $(1\\,;\\,b)$. Skyderen $r_x$ viser procent-procent-reglen.'),
    el('div', { class: 'sliders' }, sa.row, sb.row),
    info,
    el('div', { class: 'sliders' }, sr.row),
    card('Husk', `
      <ul>
        <li>$f(x)=b\\cdot x^a$ er defineret for $x>0$, og grafen går gennem $(1\\,;\\,b)$.</li>
        <li>$a>1$: voksende og krummer opad. $0<a<1$: voksende og krummer nedad. $a<0$: aftagende.</li>
        <li><b>Procent-procent:</b> når $x$ vokser med $r_x$, vokser $y$ med $r_y=(1+r_x)^a-1$.</li>
      </ul>`),
  );

  function update() {
    const { a, b } = s;
    const ry = (1 + s.rx / 100) ** a - 1;
    const type = a > 1 ? 'voksende og krummer opad' : a === 1 ? 'en ret linje gennem $(0,0)$' : a > 0 ? 'voksende og krummer nedad' : a === 0 ? 'konstant' : 'aftagende';
    info.innerHTML = math(`
      <div class="result">$$f(x)=${powTex(b, a)}$$</div>
      <p>Grafen er ${type}.</p>
      <p class="muted">Når $x$ vokser med $${s.rx}\\,\\%$ (fra $2$ til $${tn(2 * (1 + s.rx / 100))}$):</p>
      $$r_y=(1+r_x)^a-1=${tn(1 + s.rx / 100)}^{${tn(a)}}-1=${tn(ry * 100, 1)}\\,\\%$$`);
    g.draw();
  }
  update();
}

const exercises = [
  {
    id: 'beregn',
    title: 'Beregn funktionsværdi',
    make() {
      const b = pick([2, 3, 5, 0.5, 1.5]), a = pick([2, 3, 0.5, -1, 1.5]), x = rint(2, 9);
      const y = b * x ** a;
      return {
        prompt: `Givet $f(x)=${powTex(b, a)}$. Beregn $f(${x})$. Afrund til to decimaler.`,
        fields: [{ label: `f(${x})`, answer: y, tol: 0.011 }],
        solution: `$$f(${x})=${tn(b)}\\cdot ${x}^{${tn(a)}}\\approx ${tn(y)}$$`,
      };
    },
  },
  {
    id: 'topunkter',
    title: 'Forskrift ud fra to punkter',
    make() {
      const a = pick([2, 3, -1, 0.5, 1.5, -2]), b = pick([1, 2, 3, 4, 5]);
      const x1 = pick([1, 2, 4]), x2 = x1 * pick([2, 4]);
      const y1 = b * x1 ** a, y2 = b * x2 ** a;
      return {
        prompt: `Grafen for $f(x)=b\\cdot x^a$ går gennem $${pt(x1, y1, 4)}$ og $${pt(x2, y2, 4)}$. Bestem $a$ og $b$.`,
        fields: [{ label: 'a', answer: a, tol: 0.011 }, { label: 'b', answer: b, rel: 0.01 }],
        hint: '$a=\\dfrac{\\ln(y_2/y_1)}{\\ln(x_2/x_1)}$ og $b=\\dfrac{y_1}{x_1^{\\,a}}$.',
        solution: `$$a=\\frac{\\ln\\left(\\frac{${tn(y2, 4)}}{${tn(y1, 4)}}\\right)}{\\ln\\left(\\frac{${x2}}{${x1}}\\right)}=${tn(a)},\\qquad b=\\frac{${tn(y1, 4)}}{${x1}^{${tn(a)}}}=${tn(b)}$$`,
      };
    },
  },
  {
    id: 'procent',
    title: 'Procent-procent',
    make() {
      const a = pick([2, 3, 0.5, -1, 1.5]), rx = pick([5, 10, 20, 25, 50]);
      const ry = ((1 + rx / 100) ** a - 1) * 100;
      return {
        prompt: `For $f(x)=b\\cdot x^{${tn(a)}}$ øges $x$ med $${rx}\\,\\%$. Hvor mange procent ændres $f(x)$? Afrund til én decimal (brug minus ved fald).`,
        fields: [{ label: 'r_y\\;(\\%)', answer: ry, tol: 0.06 }],
        hint: '$r_y=(1+r_x)^a-1$. Husk at skrive procenterne som decimaltal undervejs.',
        solution: `$$r_y=(1+${tn(rx / 100)})^{${tn(a)}}-1=${tn(ry / 100, 4)}=${tn(ry, 1)}\\,\\%$$ Bemærk, at $b$ ikke har betydning.`,
      };
    },
  },
  {
    id: 'type',
    title: 'Genkend grafen',
    make() {
      const a = pick([2, 0.5, -1]), b = pick([1, 2, 3]);
      const opts = [[b, 2], [b, 0.5], [b, -1]];
      return {
        prompt: 'Hvilken forskrift hører til grafen?',
        graph: {
          view: { xmin: -0.5, xmax: 6, ymin: -0.5, ymax: 7, equalAspect: false },
          scene: () => [{ type: 'fn', f: (x) => (x > 0 ? b * x ** a : NaN), color: '--c1', width: 3, xmin: 1e-6 }, { type: 'point', x: 1, y: b, color: '--c2', r: 4 }],
        },
        choices: shuffle(opts.map(([bb, aa]) => ({ html: `$f(x)=${powTex(bb, aa)}$`, correct: aa === a }))),
        hint: 'Er grafen voksende eller aftagende? Krummer den opad eller nedad?',
        solution: `Grafen ${a > 1 ? 'er voksende og krummer opad, så $a>1$' : a > 0 ? 'er voksende og krummer nedad, så $0<a<1$' : 'er aftagende, så $a<0$'}. Den går gennem $(1\\,;\\,${b})$, så $b=${b}$.`,
      };
    },
  },
];

const learn = `
<h2>Potensfunktioner</h2>
<div class="rule">$$f(x)=b\\cdot x^a,\\qquad x>0,\\; b>0$$</div>
<p>Grafen går altid gennem punktet $(1\\,;\\,b)$, fordi $1^a=1$. Eksponenten $a$ bestemmer formen:</p>
<ul>
  <li>$a>1$: voksende, krummer opad (fx $x^2$)</li>
  <li>$a=1$: ret linje gennem $(0,0)$ – <b>ligefrem proportionalitet</b></li>
  <li>$0<a<1$: voksende, krummer nedad (fx $\\sqrt x=x^{0{,}5}$)</li>
  <li>$a<0$: aftagende (fx $\\frac1x=x^{-1}$ – <b>omvendt proportionalitet</b>)</li>
</ul>

<h2>Procent-procent-reglen</h2>
<p>Ved potensvækst gælder: når $x$ ændres med en bestemt procent, ændres $y$ altid med den samme procent – uanset startværdien.</p>
<div class="rule">$$1+r_y=(1+r_x)^a$$</div>
<div class="example">For $f(x)=x^2$ og $r_x=10\\,\\%$: $1+r_y=1{,}1^2=1{,}21$, så $y$ vokser med $21\\,\\%$.</div>

<h2>Forskrift ud fra to punkter</h2>
<div class="rule">$$a=\\frac{\\ln(y_2/y_1)}{\\ln(x_2/x_1)}\\qquad b=\\frac{y_1}{x_1^{\\,a}}$$</div>

<h2>Sammenligning af vækstmodeller</h2>
<table class="vt"><thead><tr><th>Model</th><th>Forskrift</th><th>Når $x$ vokser…</th></tr></thead>
<tbody>
<tr><td>Lineær</td><td>$ax+b$</td><td>med et tal, vokser $y$ med et fast <b>tal</b></td></tr>
<tr><td>Eksponentiel</td><td>$b\\cdot a^x$</td><td>med et tal, vokser $y$ med en fast <b>procent</b></td></tr>
<tr><td>Potens</td><td>$b\\cdot x^a$</td><td>med en procent, vokser $y$ med en fast <b>procent</b></td></tr>
</tbody></table>`;

export default {
  id: 'potens',
  title: 'Potensfunktioner',
  short: 'Potens',
  formula: 'f(x)=b\\cdot x^a',
  desc: 'Grafernes form, proportionalitet, procent-procent-reglen og forskrift ud fra to punkter.',
  learn,
  explore,
  exercises,
};
