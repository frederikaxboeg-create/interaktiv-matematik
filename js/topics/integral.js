import { Graph } from '../graph.js';
import { el, math, tex, slider, toggle, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, rintNZ, pick, shuffle, tn, par, polyTex, round, num, near, clamp } from '../util.js';

/** Numerisk integral med Simpsons metode. */
export function integrate(f, a, b, n = 400) {
  if (a === b) return 0;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}

const PRESETS = [
  { name: 'x²', f: (x) => x * x, F: (x) => x ** 3 / 3, tex: 'x^2', Ftex: '\\tfrac13x^3' },
  { name: '½x² − 2', f: (x) => 0.5 * x * x - 2, F: (x) => x ** 3 / 6 - 2 * x, tex: '\\tfrac12x^2-2', Ftex: '\\tfrac16x^3-2x' },
  { name: '4 − x²', f: (x) => 4 - x * x, F: (x) => 4 * x - x ** 3 / 3, tex: '4-x^2', Ftex: '4x-\\tfrac13x^3' },
  { name: 'eˣ', f: Math.exp, F: Math.exp, tex: 'e^x', Ftex: 'e^x' },
  { name: 'sin(x)', f: Math.sin, F: (x) => -Math.cos(x), tex: '\\sin(x)', Ftex: '-\\cos(x)' },
  { name: '1/x', f: (x) => 1 / x, F: Math.log, tex: '\\frac1x', Ftex: '\\ln(x)', pos: true },
];

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { p: PRESETS[2], a: -1, b: 2, riemann: false, n: 6, rule: 'mid', showF: false, volume: false };
  const g = new Graph(graphBox, { xmin: -5, xmax: 5, ymin: -4, ymax: 6 });

  const clampX = (x) => (s.p.pos ? Math.max(0.1, x) : x);
  g.setScene(() => {
    const { f, F } = s.p;
    const items = [{ type: 'area', f, a: s.a, b: s.b, color: '--c1', colorNeg: '--c2', alpha: 0.22 }];
    if (s.riemann) {
      const w = (s.b - s.a) / s.n;
      for (let i = 0; i < s.n; i++) {
        const x0 = s.a + i * w, xs = s.rule === 'left' ? x0 : s.rule === 'right' ? x0 + w : x0 + w / 2;
        const y = f(xs);
        if (!Number.isFinite(y)) continue;
        items.push({ type: 'polygon', points: [[x0, 0], [x0 + w, 0], [x0 + w, y], [x0, y]], color: '--c3', alpha: 0.25, stroke: true, width: 1.25 });
      }
    }
    if (s.showF) items.push({ type: 'fn', f: F, color: '--c4', width: 2, dash: true });
    if (s.volume) {
      // omdrejningslegeme: spejlet graf og tværsnit (cirkler set fra siden)
      items.push({ type: 'fn', f: (x) => -f(x), color: '--c1', width: 2, dash: true, xmin: Math.min(s.a, s.b), xmax: Math.max(s.a, s.b) });
      const k = 9;
      for (let i = 0; i <= k; i++) {
        const x = s.a + ((s.b - s.a) * i) / k, y = f(x);
        if (Number.isFinite(y)) items.push({ type: 'ellipse', x, y: 0, ry: Math.abs(y), color: '--c4', width: 1.2, alpha: 0.08, fill: i === k });
      }
    }
    items.push({ type: 'fn', f, color: '--c1', width: 3 });
    items.push({ type: 'point', x: s.a, y: 0, color: '--c5', label: `a = ${num(s.a, 1)}`, ldy: 18, snap: 0.1, drag: (x) => { s.a = clampX(round(x, 1)); update(); } });
    items.push({ type: 'point', x: s.b, y: 0, color: '--c5', label: `b = ${num(s.b, 1)}`, ldy: 18, snap: 0.1, drag: (x) => { s.b = clampX(round(x, 1)); update(); } });
    return items;
  });

  const chips = el('div', { class: 'chips small' });
  const renderChips = () => chips.replaceChildren(...PRESETS.map((p) => {
    const b = el('button', { type: 'button', class: 'chip' + (p === s.p ? ' active' : '') }, p.name);
    b.addEventListener('click', () => {
      s.p = p;
      if (p.pos) { s.a = Math.max(0.5, s.a); s.b = Math.max(s.a + 1, s.b); }
      renderChips(); update();
    });
    return b;
  }));
  renderChips();

  const sn = slider({ label: 'n', min: 1, max: 50, step: 1, value: s.n, format: (v) => `${v}`, onInput: (v) => { s.n = v; update(); } });
  const ruleCtl = segmented([{ value: 'left', label: 'Venstre' }, { value: 'mid', label: 'Midt' }, { value: 'right', label: 'Højre' }], s.rule, (v) => { s.rule = v; update(); });
  const riemannBox = el('div', { class: 'sliders', hidden: true }, sn.row, ruleCtl);
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Træk grænserne $a$ og $b$ langs $x$-aksen. Blåt areal tæller positivt, orange negativt.'),
    chips,
    info,
    el('div', { class: 'toggles' },
      toggle('Tilnærm med rektangler (Riemann-sum)', s.riemann, (v) => { s.riemann = v; riemannBox.hidden = !v; update(); }),
      toggle('Vis stamfunktionen <i>F</i>', s.showF, (v) => { s.showF = v; update(); }),
      toggle('Omdrejningslegeme (drej om <i>x</i>-aksen)', s.volume, (v) => { s.volume = v; update(); }),
    ),
    riemannBox,
    card('Husk', `
      <ul>
        <li>$F$ er en stamfunktion til $f$, hvis $F'(x)=f(x)$.</li>
        <li>$\\displaystyle\\int_a^b f(x)\\,dx=F(b)-F(a)$</li>
        <li>Er $f\\ge 0$ på $[a;b]$, er integralet arealet under grafen.</li>
      </ul>`),
  );

  function update() {
    const { f, F } = s.p;
    const I = F(s.b) - F(s.a);
    let rs = '';
    if (s.riemann) {
      const w = (s.b - s.a) / s.n;
      let sum = 0;
      for (let i = 0; i < s.n; i++) {
        const x0 = s.a + i * w;
        sum += f(s.rule === 'left' ? x0 : s.rule === 'right' ? x0 + w : x0 + w / 2) * w;
      }
      rs = `<p class="muted">Summen af de ${s.n} rektangler:</p>$$\\sum_{i=1}^{${s.n}} f(x_i)\\,\\Delta x\\approx ${tn(sum, 4)}$$<p class="muted">Afvigelse: $${tn(Math.abs(sum - I), 4)}$ – gør $n$ større!</p>`;
    }
    if (s.volume) {
      const V = Math.PI * integrate((x) => f(x) ** 2, s.a, s.b);
      rs += `<p class="muted">Rumfanget når grafen drejes $360^\\circ$ om $x$-aksen:</p>$$V=\\pi\\int_{${tn(s.a, 1)}}^{${tn(s.b, 1)}} f(x)^2\\,dx\\approx ${tn(V, 3)}$$`;
    }
    info.innerHTML = math(`
      $$f(x)=${s.p.tex}\\qquad F(x)=${s.p.Ftex}$$
      $$\\int_{${tn(s.a, 1)}}^{${tn(s.b, 1)}} f(x)\\,dx=F(${tn(s.b, 1)})-F(${tn(s.a, 1)})$$
      <div class="result">$$=${tn(F(s.b), 3)}-${par(round(F(s.a), 3), 3)}\\approx ${tn(I, 3)}$$</div>
      ${rs}`);
    g.draw();
  }
  update();
}

// ---------- opgaver ----------

const STAM = [
  () => { const n = rint(2, 6); return { f: `x^{${n}}`, right: `\\frac{1}{${n + 1}}x^{${n + 1}}`, wrong: [`${n}x^{${n - 1}}`, `x^{${n + 1}}`, `\\frac{1}{${n}}x^{${n}}`] }; },
  () => { const k = rint(2, 9); return { f: `${k}`, right: `${k}x`, wrong: ['0', `\\frac{${k}}{2}x^2`, `${k}`] }; },
  () => { const k = rint(2, 5); return { f: `e^{${k}x}`, right: `\\frac{1}{${k}}e^{${k}x}`, wrong: [`${k}e^{${k}x}`, `e^{${k}x}`, `\\frac{1}{${k}x+1}e^{${k}x+1}`] }; },
  () => ({ f: '\\frac{1}{x}', right: '\\ln(x)', wrong: ['-\\frac{1}{x^2}', '\\frac{1}{x^2}', 'e^x'] }),
  () => ({ f: '\\cos(x)', right: '\\sin(x)', wrong: ['-\\sin(x)', '-\\cos(x)', '\\cos(x)'] }),
  () => ({ f: '\\sin(x)', right: '-\\cos(x)', wrong: ['\\cos(x)', '-\\sin(x)', '\\sin(x)'] }),
  () => ({ f: '\\sqrt{x}', right: '\\tfrac23x^{3/2}', wrong: ['\\frac{1}{2\\sqrt x}', 'x^{3/2}', '\\tfrac32x^{1/2}'] }),
];

const exercises = [
  {
    id: 'stam',
    title: 'Find stamfunktionen',
    make() {
      const r = pick(STAM)();
      return {
        prompt: `Hvilken funktion er en stamfunktion til $f(x)=${r.f}$?`,
        choices: shuffle([{ html: `$F(x)=${r.right}$`, correct: true }, ...r.wrong.map((w) => ({ html: `$F(x)=${w}$` }))]),
        hint: 'Differentiér svarmulighederne: den rigtige giver $f(x)$ tilbage.',
        solution: `$$F(x)=${r.right}+k$$ Tjek: differentierer man $F$, får man $${r.f}$.`,
      };
    },
  },
  {
    id: 'bestemt',
    title: 'Bestemt integral',
    make() {
      const c2 = pick([0, 3, -3, 6]), c1 = pick([-4, -2, 0, 2, 4]), c0 = rint(-4, 4);
      const a = rint(-2, 1), b = a + rint(1, 3);
      const F = (x) => (c2 / 3) * x ** 3 + (c1 / 2) * x ** 2 + c0 * x;
      const I = F(b) - F(a);
      const coeffs = [c2, c1, c0];
      if (coeffs.every((c) => c === 0)) coeffs[2] = 2;
      return {
        prompt: `Beregn $\\displaystyle\\int_{${a}}^{${b}}\\left(${polyTex(coeffs)}\\right)dx$.`,
        fields: [{ label: '\\int', answer: F(b) - F(a) }],
        hint: 'Find en stamfunktion $F$ ledvis med $\\int x^n\\,dx=\\frac{1}{n+1}x^{n+1}$, og beregn $F(b)-F(a)$.',
        solution: `$$F(x)=${polyTex([c2 / 3, c1 / 2, c0, 0])}$$ $$\\int_{${a}}^{${b}}=F(${b})-F(${a})=${tn(F(b))}-${par(F(a))}=${tn(I)}$$`,
      };
    },
  },
  {
    id: 'areal',
    title: 'Areal under en parabel',
    make() {
      const r1 = rint(-3, 1), r2 = r1 + rint(2, 4), k = pick([1, 0.5, 2]);
      const f = (x) => -k * (x - r1) * (x - r2);
      const A = (k * (r2 - r1) ** 3) / 6;
      const coeffs = [-k, k * (r1 + r2), -k * r1 * r2];
      return {
        prompt: `Grafen for $f(x)=${polyTex(coeffs)}$ og $x$-aksen afgrænser et område. Bestem arealet. Afrund til to decimaler.`,
        graph: {
          view: { xmin: r1 - 2, xmax: r2 + 2, ymin: -2, ymax: f((r1 + r2) / 2) + 2, equalAspect: false },
          scene: (st, rev) => [
            { type: 'area', f, a: r1, b: r2, color: '--c1', alpha: 0.25 },
            { type: 'fn', f, color: '--c1', width: 3 },
            rev && { type: 'point', x: r1, y: 0, color: '--c2', label: `${r1}`, ldy: 16 },
            rev && { type: 'point', x: r2, y: 0, color: '--c2', label: `${r2}`, ldy: 16 },
          ],
        },
        fields: [{ label: 'A', answer: A, tol: 0.011 }],
        hint: 'Find først nulpunkterne – de er grænserne. Integrér derefter $f$ mellem dem.',
        solution: `Nulpunkterne er $x=${r1}$ og $x=${r2}$, og $f\\ge0$ imellem dem. $$A=\\int_{${r1}}^{${r2}}f(x)\\,dx\\approx ${tn(A)}$$`,
      };
    },
  },
  {
    id: 'regler',
    title: 'Regneregler for integraler',
    make() {
      const I1 = rintNZ(-6, 8), I2 = rintNZ(-6, 8), k = rintNZ(-3, 4), m = rintNZ(-3, 3), b = rint(2, 5);
      const res = k * I1 + m * I2;
      return {
        prompt: `Det oplyses, at $\\int_0^{${b}} f(x)\\,dx=${I1}$ og $\\int_0^{${b}} g(x)\\,dx=${I2}$. Beregn $\\displaystyle\\int_0^{${b}}\\big(${k === 1 ? '' : k === -1 ? '-' : k}f(x)${m < 0 ? '-' : '+'}${Math.abs(m) === 1 ? '' : Math.abs(m)}g(x)\\big)\\,dx$.`,
        fields: [{ label: '\\int', answer: res }],
        hint: 'Integralet af en sum er summen af integralerne, og konstanter kan sættes uden for.',
        solution: `$$${k}\\cdot${par(I1)}${m < 0 ? '-' : '+'}${Math.abs(m)}\\cdot${par(I2)}=${res}$$`,
      };
    },
  },
  {
    id: 'mellem',
    title: 'Areal mellem to grafer',
    make() {
      const m = rint(-2, 2), n = rint(-2, 3), k = pick([1, 1, 2, 0.5]);
      const r1 = rint(-3, 0), r2 = r1 + rint(2, 4);
      const g = (x) => m * x + n, f = (x) => g(x) - k * (x - r1) * (x - r2);
      const fc = [-k, k * (r1 + r2) + m, n - k * r1 * r2];
      const A = (k * (r2 - r1) ** 3) / 6;
      const top = Math.max(f((r1 + r2) / 2), g(r1), g(r2)), bot = Math.min(g(r1), g(r2), f(r1), f(r2));
      return {
        prompt: `Graferne for $f(x)=${polyTex(fc)}$ og $g(x)=${polyTex([m, n])}$ afgrænser et område. Bestem arealet. Afrund til to decimaler.`,
        graph: {
          view: { xmin: r1 - 2, xmax: r2 + 2, ymin: bot - 2, ymax: top + 2, equalAspect: false },
          scene: (st, rev) => [
            { type: 'area', f, g, a: r1, b: r2, color: '--c1', alpha: 0.25 },
            { type: 'fn', f, color: '--c1', width: 3 },
            { type: 'fn', f: g, color: '--c2', width: 3 },
            rev && { type: 'point', x: r1, y: g(r1), color: '--c3', label: `x = ${r1}` },
            rev && { type: 'point', x: r2, y: g(r2), color: '--c3', label: `x = ${r2}` },
          ],
        },
        fields: [{ label: 'A', answer: A, tol: 0.011 }],
        hint: 'Find skæringspunkterne ved at løse $f(x)=g(x)$. Arealet er $\\int_a^b\\big(f(x)-g(x)\\big)\\,dx$, hvor $f$ er den øverste graf.',
        solution: `$$f(x)=g(x)\\;\\Leftrightarrow\\;${polyTex([-k, k * (r1 + r2), -k * r1 * r2])}=0\\;\\Leftrightarrow\\;x=${r1}\\;\\vee\\;x=${r2}$$ $$A=\\int_{${r1}}^{${r2}}\\big(f(x)-g(x)\\big)\\,dx=\\int_{${r1}}^{${r2}}\\left(${polyTex([-k, k * (r1 + r2), -k * r1 * r2])}\\right)dx\\approx ${tn(A)}$$`,
      };
    },
  },
  {
    id: 'rumfang',
    title: 'Omdrejningslegemer',
    make() {
      const v = pick(['kegle', 'rod', 'cylinder', 'parabel']);
      const b = rint(2, 5);
      let fTex, f2Tex, V, F2;
      if (v === 'kegle') { const k = pick([0.5, 1, 2]); fTex = polyTex([k, 0]); f2Tex = `${polyTex([k * k, 0, 0])}`; V = (Math.PI * k * k * b ** 3) / 3; F2 = `${tn(k * k / 3, 4)}x^3`; }
      else if (v === 'rod') { fTex = '\\sqrt{x}'; f2Tex = 'x'; V = (Math.PI * b * b) / 2; F2 = '\\tfrac12x^2'; }
      else if (v === 'cylinder') { const c = rint(1, 4); fTex = `${c}`; f2Tex = `${c * c}`; V = Math.PI * c * c * b; F2 = `${c * c}x`; }
      else { fTex = 'x^2'; f2Tex = 'x^4'; V = (Math.PI * b ** 5) / 5; F2 = '\\tfrac15x^5'; }
      return {
        prompt: `Grafen for $f(x)=${fTex}$ på intervallet $[0;${b}]$ drejes $360^\\circ$ om $x$-aksen. Bestem rumfanget af omdrejningslegemet. Afrund til to decimaler.`,
        fields: [{ label: 'V', answer: V, rel: 0.0005 }],
        hint: '$V=\\pi\\int_a^b f(x)^2\\,dx$',
        solution: `$$V=\\pi\\int_0^{${b}}\\left(${fTex}\\right)^2dx=\\pi\\int_0^{${b}}${f2Tex}\\,dx=\\pi\\Big[${F2}\\Big]_0^{${b}}\\approx ${tn(V)}$$`,
      };
    },
  },
  {
    id: 'substitution',
    title: 'Integration ved substitution',
    make() {
      const bank = [
        () => { const n = rint(2, 5); return { f: `2x\\,(x^2+1)^{${n}}`, t: 't=x^2+1', right: `\\frac{1}{${n + 1}}(x^2+1)^{${n + 1}}`, wrong: [`(x^2+1)^{${n + 1}}`, `\\frac{2x}{${n + 1}}(x^2+1)^{${n + 1}}`, `${n}(x^2+1)^{${n - 1}}`] }; },
        () => ({ f: '2x\\,e^{x^2}', t: 't=x^2', right: 'e^{x^2}', wrong: ['2x\\,e^{x^2}', 'x^2e^{x^2}', 'e^{2x}'] }),
        () => ({ f: '\\cos(x)\\,e^{\\sin(x)}', t: 't=\\sin(x)', right: 'e^{\\sin(x)}', wrong: ['\\sin(x)\\,e^{\\sin(x)}', 'e^{\\cos(x)}', '-e^{\\sin(x)}'] }),
        () => ({ f: '\\frac{2x}{x^2+1}', t: 't=x^2+1', right: '\\ln(x^2+1)', wrong: ['\\frac{1}{x^2+1}', '2x\\ln(x^2+1)', '\\ln(2x)'] }),
        () => ({ f: '3x^2\\sqrt{x^3+1}', t: 't=x^3+1', right: '\\tfrac23(x^3+1)^{3/2}', wrong: ['\\tfrac32(x^3+1)^{3/2}', '(x^3+1)^{1/2}', 'x^3\\sqrt{x^3+1}'] }),
        () => { const k = rint(2, 5); return { f: `\\sin(${k}x)`, t: `t=${k}x`, right: `-\\frac{1}{${k}}\\cos(${k}x)`, wrong: [`-${k}\\cos(${k}x)`, `\\frac{1}{${k}}\\cos(${k}x)`, `-\\cos(${k}x)`] }; },
      ];
      const r = pick(bank)();
      return {
        prompt: `Bestem $\\displaystyle\\int ${r.f}\\,dx$. (Brug substitutionen $${r.t}$.)`,
        choices: shuffle([{ html: `$${r.right}+k$`, correct: true }, ...r.wrong.map((w) => ({ html: `$${w}+k$` }))]),
        hint: 'Sæt $t$ lig den indre funktion. Så er $dt=t\'(x)\\,dx$, og integralet bliver et simpelt integral i $t$.',
        solution: `Med $${r.t}$ bliver integralet et standardintegral i $t$. Til sidst indsættes $t$ igen: $$\\int ${r.f}\\,dx=${r.right}+k$$ Tjek ved at differentiere – kædereglen giver integranden tilbage.`,
      };
    },
  },
  {
    id: 'traekb',
    title: 'Træk grænsen, så arealet passer',
    interactive: true,
    make() {
      const k = pick([0.5, 1, 2]), bTarget = pick([2, 3, 4]);
      const f = (x) => k * x;
      const A = (k * bTarget * bTarget) / 2;
      const st = { b: 1 };
      return {
        prompt: `Træk grænsen $b$, så arealet under grafen for $f(x)=${polyTex([k, 0])}$ fra $0$ til $b$ bliver $${tn(A)}$.`,
        graph: {
          view: { xmin: -1, xmax: 6, ymin: -1, ymax: k * 5 + 1, equalAspect: false },
          state: st,
          scene: (s, rev) => [
            { type: 'area', f, a: 0, b: s.b, color: '--c1', alpha: 0.25 },
            { type: 'fn', f, color: '--c1', width: 3 },
            rev && { type: 'vline', x: bTarget, color: '--c3', width: 2, dash: true },
            { type: 'point', x: s.b, y: 0, color: '--c5', label: 'b', ldy: 16, snap: 0.5, drag: (x) => { s.b = clamp(x, 0.5, 5.5); } },
          ],
        },
        check: (s) => near(s.b, bTarget),
        hint: `Arealet er $\\int_0^b ${polyTex([k, 0])}\\,dx=${tn(k / 2)}b^2$. Løs $${tn(k / 2)}b^2=${tn(A)}$.`,
        solution: `$$\\int_0^b ${polyTex([k, 0])}\\,dx=${tn(k / 2)}b^2=${tn(A)}\\quad\\Leftrightarrow\\quad b=${bTarget}$$`,
      };
    },
  },
];

const learn = `
<h2>Stamfunktion</h2>
<p>$F$ er en <b>stamfunktion</b> til $f$, hvis $F'(x)=f(x)$. Integration er altså "omvendt differentiation". Er $F$ en stamfunktion, er $F+k$ det også – derfor skriver man $+k$ i det ubestemte integral.</p>
<div class="rule">$$\\int f(x)\\,dx=F(x)+k$$</div>
<table class="vt"><thead><tr><th>$f(x)$</th><th>$\\int f(x)\\,dx$</th></tr></thead><tbody>
<tr><td>$k$</td><td>$kx$</td></tr>
<tr><td>$x^n\\;(n\\ne-1)$</td><td>$\\frac{1}{n+1}x^{n+1}$</td></tr>
<tr><td>$\\frac1x$</td><td>$\\ln(x)$</td></tr>
<tr><td>$e^{kx}$</td><td>$\\frac1k e^{kx}$</td></tr>
<tr><td>$\\cos(x)$</td><td>$\\sin(x)$</td></tr>
<tr><td>$\\sin(x)$</td><td>$-\\cos(x)$</td></tr>
</tbody></table>
<p><b>Regneregler:</b> $\\int(f\\pm g)\\,dx=\\int f\\,dx\\pm\\int g\\,dx$ og $\\int k\\cdot f\\,dx=k\\int f\\,dx$.</p>

<h2>Bestemt integral</h2>
<div class="rule">$$\\int_a^b f(x)\\,dx=\\big[F(x)\\big]_a^b=F(b)-F(a)$$</div>
<div class="example">$$\\int_0^3 x^2\\,dx=\\left[\\tfrac13x^3\\right]_0^3=\\tfrac13\\cdot27-0=9$$</div>

<h2>Areal</h2>
<p>Er $f(x)\\ge0$ på $[a;b]$, er $\\int_a^b f(x)\\,dx$ arealet mellem grafen og $x$-aksen. Ligger grafen <b>under</b> $x$-aksen, bliver integralet negativt. Arealet mellem to grafer, hvor $f\\ge g$:</p>
<div class="rule">$$A=\\int_a^b\\big(f(x)-g(x)\\big)\\,dx$$</div>

<h2>Hvorfor virker det? Riemann-summer</h2>
<p>Del intervallet op i $n$ smalle rektangler med bredde $\\Delta x$. Summen af rektanglernes arealer $\\sum f(x_i)\\Delta x$ nærmer sig integralet, når $n\\to\\infty$. Prøv det under <b>Udforsk</b>.</p>

<h2>Integration ved substitution</h2>
<div class="rule">$$\\int f\\big(g(x)\\big)\\cdot g'(x)\\,dx=\\int f(t)\\,dt,\\quad t=g(x)$$</div>
<div class="example">$\\int 2x\\,e^{x^2}dx$: sæt $t=x^2$, så $dt=2x\\,dx$, og integralet bliver $\\int e^t\\,dt=e^t+k=e^{x^2}+k$.</div>

<h2>Omdrejningslegemer</h2>
<p>Drejes grafen for $f$ på $[a;b]$ $360^\\circ$ om $x$-aksen, er rumfanget</p>
<div class="rule">$$V=\\pi\\int_a^b f(x)^2\\,dx$$</div>`;

export default {
  id: 'integral',
  title: 'Integralregning',
  short: 'Integral',
  formula: '\\int_a^b f(x)\\,dx',
  desc: 'Stamfunktioner, bestemt integral, areal under grafer, Riemann-summer, substitution og omdrejningslegemer.',
  learn,
  explore,
  exercises,
};
