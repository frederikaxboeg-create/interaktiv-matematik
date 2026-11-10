import { Graph } from '../graph.js';
import { el, math, slider, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, rintNZ, pick, shuffle, tn, par, polyTex, num } from '../util.js';

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { mode: 'kvadrat', a: 4, b: 2, sign: '+', k: 6 };
  const g = new Graph(graphBox, { xmin: -1, xmax: 8, ymin: -1, ymax: 8, pan: true });

  g.setScene(() => {
    if (s.mode === 'kvadrat') {
      const { a, b } = s, T = a + b;
      return [
        { type: 'polygon', points: [[0, 0], [a, 0], [a, a], [0, a]], color: '--c1', alpha: 0.35, stroke: true, width: 2 },
        { type: 'polygon', points: [[a, 0], [T, 0], [T, a], [a, a]], color: '--c3', alpha: 0.3, stroke: true, width: 2 },
        { type: 'polygon', points: [[0, a], [a, a], [a, T], [0, T]], color: '--c3', alpha: 0.3, stroke: true, width: 2 },
        { type: 'polygon', points: [[a, a], [T, a], [T, T], [a, T]], color: '--c2', alpha: 0.35, stroke: true, width: 2 },
        { type: 'text', x: a / 2, y: a / 2, text: 'a²', align: 'center', color: '--c1', font: '700 18px sans-serif' },
        { type: 'text', x: a + b / 2, y: a / 2, text: 'ab', align: 'center', color: '--c3', font: '700 16px sans-serif' },
        { type: 'text', x: a / 2, y: a + b / 2, text: 'ab', align: 'center', color: '--c3', font: '700 16px sans-serif' },
        { type: 'text', x: a + b / 2, y: a + b / 2, text: 'b²', align: 'center', color: '--c2', font: '700 16px sans-serif' },
        { type: 'point', x: a, y: 0, color: '--c1', label: 'a', ldy: 18, snap: 0.5, drag: (x) => { s.a = Math.max(0.5, x); update(); } },
        { type: 'point', x: T, y: 0, color: '--c2', label: 'a + b', ldy: 18, snap: 0.5, drag: (x) => { s.b = Math.max(0.5, x - s.a); update(); } },
      ];
    }
    const k = s.k;
    const items = [
      { type: 'fn', f: (x) => k * x, color: '--c1', width: 3 },
      { type: 'fn', f: (x) => k / x, color: '--c2', width: 3, xmin: 0.01 },
    ];
    for (const x of [1, 2, 3]) items.push({ type: 'point', x, y: k / x, color: '--c2', r: 4 }, { type: 'point', x, y: k * x, color: '--c1', r: 4 });
    return items;
  });

  const sk = slider({ label: 'k', min: 0.5, max: 10, step: 0.5, value: s.k, onInput: (v) => { s.k = v; update(); } });
  sk.row.hidden = true;
  const modeCtl = segmented([{ value: 'kvadrat', label: 'Kvadratsætninger' }, { value: 'prop', label: 'Proportionalitet' }], s.mode, (v) => {
    s.mode = v; sk.row.hidden = v !== 'prop';
    g.setView(v === 'kvadrat' ? { xmin: -1, xmax: 8, ymin: -1, ymax: 8 } : { xmin: -0.5, xmax: 8, ymin: -1, ymax: 14 });
    update();
  });
  const info = el('div', { class: 'formula' });
  panel.append(
    hint('Træk i punkterne for at ændre $a$ og $b$, og se hvorfor $(a+b)^2$ ikke er $a^2+b^2$.'),
    modeCtl, el('div', { class: 'sliders' }, sk.row), info,
    card('Husk', `
      <ul>
        <li>$(a+b)^2=a^2+b^2+2ab$ og $(a-b)^2=a^2+b^2-2ab$</li>
        <li>$(a+b)(a-b)=a^2-b^2$</li>
        <li>Regningsarternes hierarki: parenteser, potenser og rødder, gange og division, plus og minus.</li>
      </ul>`),
  );

  function update() {
    if (s.mode === 'kvadrat') {
      const { a, b } = s;
      info.innerHTML = math(`<div class="result">$$(a+b)^2=a^2+b^2+2ab$$</div>
        $$(${tn(a)}+${tn(b)})^2=${tn((a + b) ** 2)}$$
        $$${tn(a)}^2+${tn(b)}^2+2\\cdot${tn(a)}\\cdot${tn(b)}=${tn(a * a)}+${tn(b * b)}+${tn(2 * a * b)}=${tn((a + b) ** 2)}$$
        <p>Det store kvadrat har siden $a+b$. Det består af ét $a^2$-kvadrat (blåt), ét $b^2$-kvadrat (orange) og <b>to</b> rektangler $ab$ (grønne).</p>`);
    } else {
      const k = s.k;
      info.innerHTML = math(`
        <p><b style="color:var(--c1)">Ligefrem proportionalitet</b> $y=${tn(k)}\\cdot x$: $\\frac{y}{x}=${tn(k)}$ er konstant.</p>
        <p><b style="color:var(--c2)">Omvendt proportionalitet</b> $y=\\frac{${tn(k)}}{x}$: $x\\cdot y=${tn(k)}$ er konstant.</p>
        <table class="vt"><thead><tr><th>$x$</th><th>$${tn(k)}x$</th><th>$\\frac{${tn(k)}}{x}$</th></tr></thead><tbody>${[1, 2, 3, 4].map((x) => `<tr><td>${x}</td><td>${num(k * x)}</td><td>${num(k / x)}</td></tr>`).join('')}</tbody></table>
        <p class="muted">Fordobles $x$, fordobles $y$ ved ligefrem proportionalitet – men halveres ved omvendt.</p>`);
    }
    g.draw();
  }
  update();
}

// ---------- opgaver ----------
const exercises = [
  {
    id: 'talmaengde',
    title: 'Talmængder',
    make() {
      const v = pick([
        { t: '7', s: 'N' }, { t: '0', s: 'N' }, { t: '-3', s: 'Z' }, { t: '\\sqrt{9}', s: 'N' }, { t: '-\\sqrt{16}', s: 'Z' },
        { t: '\\frac23', s: 'Q' }, { t: '0{,}25', s: 'Q' }, { t: '-1{,}5', s: 'Q' }, { t: '0{,}\\overline{3}', s: 'Q' },
        { t: '\\sqrt{2}', s: 'R' }, { t: '\\pi', s: 'R' }, { t: '\\sqrt{5}+1', s: 'R' },
      ]);
      const names = { N: 'de naturlige tal $\\mathbb{N}$', Z: 'de hele tal $\\mathbb{Z}$', Q: 'de rationale tal $\\mathbb{Q}$', R: 'de reelle tal $\\mathbb{R}$' };
      return {
        prompt: `Hvad er den mindste talmængde, som tallet $${v.t}$ tilhører?`,
        choices: ['N', 'Z', 'Q', 'R'].map((k) => ({ html: names[k], correct: k === v.s })),
        hint: '$\\mathbb{N}\\subset\\mathbb{Z}\\subset\\mathbb{Q}\\subset\\mathbb{R}$. Rationale tal kan skrives som en brøk af hele tal; $\\sqrt2$ og $\\pi$ kan ikke.',
        solution: `$${v.t}$ ligger i ${names[v.s]}${v.s === 'R' ? ' – det er et irrationalt tal, som ikke kan skrives som en brøk' : ''}.`,
      };
    },
  },
  {
    id: 'hierarki',
    title: 'Regningsarternes hierarki',
    make() {
      const a = rint(2, 9), b = rint(2, 5), c = rint(2, 4), d = rint(1, 9), e = rint(1, 4);
      const v = pick([0, 1, 2]);
      if (v === 0) return { prompt: `Beregn $${a}+${b}\\cdot${c}^2-${d}$.`, fields: [{ label: '\\text{svar}', answer: a + b * c * c - d }], hint: 'Potenser før gange, gange før plus og minus.', solution: `$$${a}+${b}\\cdot${c * c}-${d}=${a}+${b * c * c}-${d}=${a + b * c * c - d}$$` };
      if (v === 1) return { prompt: `Beregn $(${a}+${b})\\cdot${c}-${d * e}:${e}$.`, fields: [{ label: '\\text{svar}', answer: (a + b) * c - d }], hint: 'Parenteser først, så gange og division, til sidst plus og minus.', solution: `$$${a + b}\\cdot${c}-${d}=${(a + b) * c}-${d}=${(a + b) * c - d}$$` };
      return { prompt: `Beregn $-${c}^2+(${-d})^2$.`, fields: [{ label: '\\text{svar}', answer: -c * c + d * d }], hint: 'Pas på: $-3^2=-(3^2)=-9$, men $(-3)^2=9$.', solution: `$$-${c}^2+(${-d})^2=-${c * c}+${d * d}=${-c * c + d * d}$$` };
    },
  },
  {
    id: 'kvadratsaetning',
    title: 'Kvadratsætninger',
    make() {
      const a = rint(1, 6), k = pick([1, 2, 3]), sgn = pick([1, -1, 0]);
      const kx = k === 1 ? 'x' : `${k}x`;
      if (sgn === 0) return {
        prompt: `Faktorisér $${k * k === 1 ? '' : k * k}x^2-${a * a}$.`,
        choices: shuffle([
          { html: `$(${kx}+${a})(${kx}-${a})$`, correct: true },
          { html: `$(${kx}-${a})^2$` }, { html: `$(${kx}+${a})^2$` }, { html: `$(${kx}-${a * a})(${kx}+1)$` },
        ]),
        hint: 'Tredje kvadratsætning: $a^2-b^2=(a+b)(a-b)$.',
        solution: `$$${k * k === 1 ? '' : k * k}x^2-${a * a}=(${kx})^2-${a}^2=(${kx}+${a})(${kx}-${a})$$`,
      };
      const right = polyTex([k * k, sgn * 2 * k * a, a * a]);
      return {
        prompt: `Gang parentesen ud: $(${kx}${sgn > 0 ? '+' : '-'}${a})^2$.`,
        choices: shuffle([
          { html: `$${right}$`, correct: true },
          { html: `$${polyTex([k * k, 0, a * a])}$` },
          { html: `$${polyTex([k * k, sgn * k * a, a * a])}$` },
          { html: `$${polyTex([k * k, -sgn * 2 * k * a, a * a])}$` },
        ]),
        hint: `${sgn > 0 ? '$(a+b)^2=a^2+b^2+2ab$' : '$(a-b)^2=a^2+b^2-2ab$'}. Husk det dobbelte produkt!`,
        solution: `$$(${kx}${sgn > 0 ? '+' : '-'}${a})^2=(${kx})^2+${a}^2${sgn > 0 ? '+' : '-'}2\\cdot${kx}\\cdot${a}=${right}$$`,
      };
    },
  },
  {
    id: 'potensregler',
    title: 'Potensregneregler',
    make() {
      const m = rint(2, 7), n = rint(2, 5);
      const v = pick(['gange', 'dividere', 'potens', 'rod', 'negativ']);
      const map = {
        gange: { q: `a^{${m}}\\cdot a^{${n}}`, e: m + n, why: `a^m\\cdot a^n=a^{m+n}` },
        dividere: { q: `\\frac{a^{${m + n}}}{a^{${n}}}`, e: m, why: `\\frac{a^m}{a^n}=a^{m-n}` },
        potens: { q: `\\left(a^{${m}}\\right)^{${n}}`, e: m * n, why: `(a^m)^n=a^{m\\cdot n}` },
        rod: { q: `\\sqrt[${n + 1}]{a^{${m}}}`, e: m / (n + 1), why: `\\sqrt[n]{a^m}=a^{\\frac mn}` },
        negativ: { q: `\\frac{1}{a^{${m}}}`, e: -m, why: `\\frac{1}{a^n}=a^{-n}` },
      }[v];
      return {
        prompt: `Skriv $${map.q}$ som én potens $a^k$. Bestem $k$. (Brøker må skrives som fx 2/3.)`,
        fields: [{ label: 'k', answer: map.e, tol: 0.0001 }],
        hint: `Brug reglen $${map.why}$.`,
        solution: `$$${map.q}=a^{${Number.isInteger(map.e) ? map.e : `\\frac{${m}}{${n + 1}}`}}$$ fordi $${map.why}$.`,
      };
    },
  },
  {
    id: 'proportional',
    title: 'Ligefrem og omvendt proportionalitet',
    make() {
      const k = rint(2, 12), type = pick(['lige', 'omvendt', 'ingen']);
      const xs = [1, 2, 3, 4, 6].slice(0, 4);
      const ys = xs.map((x) => (type === 'lige' ? k * x : type === 'omvendt' ? (k * 12) / x : k + 2 * x));
      const labels = { lige: 'Ligefrem proportional', omvendt: 'Omvendt proportional', ingen: 'Ingen af delene' };
      return {
        prompt: `Er $y$ ligefrem eller omvendt proportional med $x$? $$\\begin{array}{c|cccc} x & ${xs.join(' & ')}\\\\\\hline y & ${ys.map((y) => tn(y)).join(' & ')}\\end{array}$$`,
        choices: Object.entries(labels).map(([t, html]) => ({ html, correct: t === type })),
        hint: 'Ligefrem: $\\frac yx$ er konstant. Omvendt: $x\\cdot y$ er konstant.',
        solution: type === 'lige' ? `$\\frac yx=${k}$ i alle søjler, så $y=${k}x$ – ligefrem proportional.` : type === 'omvendt' ? `$x\\cdot y=${k * 12}$ i alle søjler, så $y=\\frac{${k * 12}}{x}$ – omvendt proportional.` : `Hverken $\\frac yx$ eller $x\\cdot y$ er konstant (fx $\\frac{${tn(ys[0])}}{1}\\ne\\frac{${tn(ys[1])}}{2}$).`,
      };
    },
  },
  {
    id: 'broeker',
    title: 'Brøkregning',
    make() {
      const a = rint(1, 7), b = rint(2, 9), c = rint(1, 7), d = rint(2, 9), op = pick(['+', '-', '\\cdot', ':']);
      const val = op === '+' ? a / b + c / d : op === '-' ? a / b - c / d : op === '\\cdot' ? (a * c) / (b * d) : (a * d) / (b * c);
      return {
        prompt: `Beregn $\\dfrac{${a}}{${b}}${op}\\dfrac{${c}}{${d}}$. (Du må svare med en brøk, fx 17/12.)`,
        fields: [{ label: '\\text{svar}', answer: val, tol: 0.0001 }],
        hint: op === '+' || op === '-' ? 'Find en fællesnævner: $\\frac ab\\pm\\frac cd=\\frac{ad\\pm bc}{bd}$.' : op === ':' ? 'At dividere med en brøk er at gange med den omvendte: $\\frac ab:\\frac cd=\\frac ab\\cdot\\frac dc$.' : 'Gang tæller med tæller og nævner med nævner.',
        solution: `$$\\frac{${a}}{${b}}${op}\\frac{${c}}{${d}}=${op === '+' ? `\\frac{${a * d}+${b * c}}{${b * d}}` : op === '-' ? `\\frac{${a * d}-${b * c}}{${b * d}}` : op === '\\cdot' ? `\\frac{${a * c}}{${b * d}}` : `\\frac{${a}}{${b}}\\cdot\\frac{${d}}{${c}}=\\frac{${a * d}}{${b * c}}`}\\approx ${tn(val, 4)}$$`,
      };
    },
  },
  {
    id: 'reducer',
    title: 'Reducér udtryk',
    make() {
      const a = rint(2, 6), b = rint(1, 5), c = rint(2, 5), d = rint(1, 6);
      // a(x + b) - c(x - d) = (a - c)x + ab + cd
      const x0 = rint(-3, 3);
      return {
        prompt: `Reducér $${a}(x+${b})-${c}(x-${d})$, og beregn værdien for $x=${x0}$.`,
        fields: [{ label: '\\text{svar}', answer: (a - c) * x0 + a * b + c * d }],
        hint: 'Gang parenteserne ud – pas på minus foran den anden parentes, som skifter fortegn på begge led.',
        solution: `$$${a}x+${a * b}-${c}x+${c * d}=${polyTex([a - c, a * b + c * d])}$$ For $x=${x0}$: $${tn((a - c) * x0 + a * b + c * d)}$.`,
      };
    },
  },
];

const learn = `
<h2>Talmængder</h2>
<table class="vt"><tbody>
<tr><td>$\\mathbb{N}$</td><td>Naturlige tal</td><td>$0,1,2,3,\\dots$</td></tr>
<tr><td>$\\mathbb{Z}$</td><td>Hele tal</td><td>$\\dots,-2,-1,0,1,2,\\dots$</td></tr>
<tr><td>$\\mathbb{Q}$</td><td>Rationale tal</td><td>Brøker $\\frac pq$ af hele tal, fx $\\frac23$, $-1{,}5$, $0{,}\\overline3$</td></tr>
<tr><td>$\\mathbb{R}$</td><td>Reelle tal</td><td>Alle tal på tallinjen, også irrationale som $\\sqrt2$ og $\\pi$</td></tr>
</tbody></table>
<p>$\\mathbb{N}\\subset\\mathbb{Z}\\subset\\mathbb{Q}\\subset\\mathbb{R}$. Intervaller skrives fx $[2;5[$ = alle tal fra 2 (med) til 5 (uden).</p>

<h2>Regningsarternes hierarki</h2>
<ol><li>Parenteser</li><li>Potenser og rødder</li><li>Gange og division</li><li>Plus og minus</li></ol>
<div class="example">$2+3\\cdot4^2=2+3\\cdot16=50$, og $-3^2=-9$, men $(-3)^2=9$.</div>

<h2>Algebra: parenteser og kvadratsætninger</h2>
<div class="rule">$$(a+b)^2=a^2+b^2+2ab\\qquad(a-b)^2=a^2+b^2-2ab\\qquad(a+b)(a-b)=a^2-b^2$$</div>
<p>Minus foran en parentes skifter fortegn på alle led: $-(x-3)=-x+3$. At <b>faktorisere</b> er det modsatte af at gange ud – fx $x^2-9=(x+3)(x-3)$.</p>

<h2>Potenser og rødder</h2>
<div class="rule">$$a^m\\cdot a^n=a^{m+n}\\qquad\\frac{a^m}{a^n}=a^{m-n}\\qquad(a^m)^n=a^{mn}\\qquad(ab)^n=a^nb^n$$
$$a^0=1\\qquad a^{-n}=\\frac1{a^n}\\qquad\\sqrt[n]{a}=a^{\\frac1n}\\qquad\\sqrt[n]{a^m}=a^{\\frac mn}$$</div>

<h2>Brøker</h2>
<div class="rule">$$\\frac ab+\\frac cd=\\frac{ad+bc}{bd}\\qquad\\frac ab\\cdot\\frac cd=\\frac{ac}{bd}\\qquad\\frac ab:\\frac cd=\\frac ab\\cdot\\frac dc$$</div>

<h2>Ligefrem og omvendt proportionalitet</h2>
<ul>
  <li>$y$ er <b>ligefrem proportional</b> med $x$, hvis $y=k\\cdot x$ – dvs. $\\frac yx=k$ er konstant. Grafen er en ret linje gennem $(0,0)$.</li>
  <li>$y$ er <b>omvendt proportional</b> med $x$, hvis $y=\\frac kx$ – dvs. $x\\cdot y=k$ er konstant. Grafen er en hyperbel.</li>
</ul>`;

export default {
  id: 'tal',
  title: 'Tal og algebra',
  short: 'Tal og algebra',
  formula: '(a+b)^2',
  desc: 'Talmængder, regningsarternes hierarki, kvadratsætninger, potens- og rodregler, brøker og proportionalitet.',
  learn,
  explore,
  exercises,
};
