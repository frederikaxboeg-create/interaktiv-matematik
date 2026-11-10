import { Graph } from '../graph.js';
import { el, math, tex, slider, toggle, exploreLayout, card, hint, escapeHtml } from '../ui.js';
import { rint, pick, shuffle, tn, pt, eq, polyTex, linTex, round, num, plus, near } from '../util.js';
import { tryCompile } from '../parser.js';

/** Numerisk differentialkvotient (central differens). */
export function nd(f, x) {
  const h = 1e-5 * Math.max(1, Math.abs(x));
  return (f(x + h) - f(x - h)) / (2 * h);
}

const PRESETS = [
  { name: 'x²', f: (x) => x * x, tex: 'x^2', dtex: '2x', x0: 1 },
  { name: 'x³ − 3x', f: (x) => x ** 3 - 3 * x, tex: 'x^3-3x', dtex: '3x^2-3', x0: 1.5 },
  { name: 'sin(x)', f: Math.sin, tex: '\\sin(x)', dtex: '\\cos(x)', x0: 1 },
  { name: 'eˣ', f: Math.exp, tex: 'e^x', dtex: 'e^x', x0: 0.5 },
  { name: 'ln(x)', f: Math.log, tex: '\\ln(x)', dtex: '\\dfrac{1}{x}', x0: 1 },
  { name: '√x', f: Math.sqrt, tex: '\\sqrt{x}', dtex: '\\dfrac{1}{2\\sqrt{x}}', x0: 2 },
  { name: '1/x', f: (x) => 1 / x, tex: '\\dfrac{1}{x}', dtex: '-\\dfrac{1}{x^2}', x0: 1 },
  { name: 'Egen…', custom: true },
];

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { preset: PRESETS[1], custom: 'x^3/4 - x', customF: null, x0: 1.5, tangent: true, secant: false, logh: 0, deriv: false };
  s.customF = tryCompile(s.custom).f;
  const g = new Graph(graphBox, { xmin: -6, xmax: 6, ymin: -5, ymax: 5 });
  const F = () => (s.preset.custom ? s.customF : s.preset.f) || (() => NaN);

  g.setScene(() => {
    const f = F();
    const items = [{ type: 'fn', f, color: '--c1', width: 3 }];
    if (s.deriv) items.push({ type: 'fn', f: (x) => nd(f, x), color: '--c3', width: 2, dash: true });
    const y0 = f(s.x0), m = nd(f, s.x0);
    if (!Number.isFinite(y0)) return items;
    if (s.tangent && Number.isFinite(m)) items.push({ type: 'line', x1: s.x0, y1: y0, x2: s.x0 + 1, y2: y0 + m, color: '--c2', width: 2.5 });
    if (s.secant) {
      const h = 10 ** s.logh, x1 = s.x0 + h, y1 = f(x1);
      if (Number.isFinite(y1)) {
        items.push({ type: 'line', x1: s.x0, y1: y0, x2: x1, y2: y1, color: '--c4', width: 2 });
        items.push({ type: 'segment', x1: s.x0, y1: y0, x2: x1, y2: y0, color: '--c4', width: 1.5, dash: [3, 4], label: 'h' });
        items.push({ type: 'segment', x1: x1, y1: y0, x2: x1, y2: y1, color: '--c4', width: 1.5, dash: [3, 4] });
        items.push({ type: 'point', x: x1, y: y1, color: '--c4', label: 'Q' });
      }
    }
    if (s.deriv && Number.isFinite(m)) {
      items.push({ type: 'segment', x1: s.x0, y1: y0, x2: s.x0, y2: m, color: '--c3', width: 1.5, dash: [3, 4] });
      items.push({ type: 'point', x: s.x0, y: m, color: '--c3', r: 5, label: `f'(x₀) = ${num(m)}` });
    }
    items.push({
      type: 'point', x: s.x0, y: y0, color: '--c2', label: 'P',
      drag: (x) => { x = round(x, 2); if (Number.isFinite(f(x))) { s.x0 = x; update(); } },
    });
    return items;
  });

  // funktionsvalg
  const chips = el('div', { class: 'chips small' });
  const customRow = el('div', { class: 'custom-fn', hidden: true });
  const customInput = el('input', { type: 'text', value: s.custom, spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Egen funktion' });
  const customErr = el('div', { class: 'err' });
  customRow.append(el('label', { class: 'fn-input' }, el('span', { html: tex('f(x)=') }), customInput), customErr);
  customInput.addEventListener('input', () => {
    const r = tryCompile(customInput.value);
    customErr.textContent = r.error ?? '';
    if (r.f) { s.custom = customInput.value; s.customF = r.f; }
    update();
  });
  const renderChips = () => {
    chips.replaceChildren(...PRESETS.map((p) => {
      const b = el('button', { type: 'button', class: 'chip' + (p === s.preset ? ' active' : '') }, p.name);
      b.addEventListener('click', () => {
        s.preset = p;
        if (!p.custom) s.x0 = p.x0;
        customRow.hidden = !p.custom;
        renderChips();
        update();
      });
      return b;
    }));
  };
  renderChips();

  const hSlider = slider({
    label: 'h', min: -2, max: 0.5, step: 0.01, value: s.logh,
    format: (v) => tn(10 ** v, 10 ** v < 0.1 ? 3 : 2),
    onInput: (v) => { s.logh = v; update(); },
  });
  hSlider.row.hidden = true;
  const formula = el('div', { class: 'formula' });

  panel.append(
    hint('Vælg en funktion og træk punktet $P$ langs grafen.'),
    chips,
    customRow,
    formula,
    el('div', { class: 'toggles' },
      toggle('Tangent', s.tangent, (v) => { s.tangent = v; update(); }),
      toggle('Sekant gennem <i>P</i> og <i>Q</i>', s.secant, (v) => { s.secant = v; hSlider.row.hidden = !v; update(); }),
      toggle("Graf for <i>f'</i>", s.deriv, (v) => { s.deriv = v; update(); }),
    ),
    hSlider.row,
    card('Husk', `
      <ul>
        <li>$f'(x_0)$ er <b>tangentens hældning</b> i punktet $(x_0\\,;\\,f(x_0))$.</li>
        <li>Sekantens hældning $\\dfrac{f(x_0+h)-f(x_0)}{h}$ nærmer sig $f'(x_0)$, når $h\\to 0$.</li>
        <li>Tangentens ligning: $y=f'(x_0)(x-x_0)+f(x_0)$.</li>
        <li>$f'>0$: voksende. $f'<0$: aftagende. $f'=0$: vandret tangent.</li>
      </ul>`),
  );

  function update() {
    const f = F();
    const x0 = s.x0, y0 = f(x0), m = nd(f, x0);
    const p = s.preset;
    const fLine = p.custom
      ? `<p class="fn-line">${tex('f(x)=')} <code>${escapeHtml(s.custom)}</code></p>`
      : `$$f(x)=${p.tex}\\qquad f'(x)=${p.dtex}$$`;
    if (!Number.isFinite(y0) || !Number.isFinite(m)) {
      formula.innerHTML = math(`${fLine}<p>Funktionen er ikke defineret (eller ikke differentiabel) i $x_0=${tn(x0)}$. Træk punktet et andet sted hen.</p>`);
      g.draw();
      return;
    }
    const q = y0 - m * x0;
    const mono = Math.abs(m) < 0.005
      ? '<span class="badge b-mid">vandret tangent</span>'
      : m > 0 ? '<span class="badge b-ok">voksende</span>' : '<span class="badge b-bad">aftagende</span>';
    let sec = '';
    if (s.secant) {
      const h = 10 ** s.logh, ms = (f(x0 + h) - y0) / h;
      sec = `<p class="muted">Sekantens hældning med $h=${tn(h, 3)}$:</p>
        $$\\frac{f(x_0+h)-f(x_0)}{h}\\approx ${tn(ms, 4)}$$
        <p class="muted">Afstand til $f'(x_0)$: $${tn(Math.abs(ms - m), 4)}$ – gør $h$ mindre!</p>`;
    }
    formula.innerHTML = math(`
      ${fLine}
      $$x_0=${tn(x0)},\\quad f(x_0)${eq(y0)}${tn(y0)}$$
      <div class="result">$$f'(${tn(x0)})${eq(m)}${tn(m)}$$</div>
      <p>${mono} Tangenten i $P$:</p>
      $$y=${tn(m)}(${polyTex([1, -x0])})${plus(y0)}\\;\\approx\\;${linTex(round(m, 2), round(q, 2))}$$
      ${sec}`);
    g.draw();
  }
  update();
}

// ---------- opgaver ----------

const RULES = [
  () => { const n = rint(3, 7); return { f: `x^{${n}}`, right: `${n}x^{${n - 1}}`, wrong: [`x^{${n - 1}}`, `${n}x^{${n + 1}}`, `\\frac{x^{${n + 1}}}{${n + 1}}`], why: `Potensreglen: $(x^n)'=n\\cdot x^{n-1}$, så $(x^{${n}})'=${n}x^{${n - 1}}$.` }; },
  () => {
    const k = rint(2, 5), n = rint(2, 4);
    const p = n - 1 === 1 ? 'x' : `x^{${n - 1}}`;
    return {
      f: `${k}x^{${n}}`, right: `${k * n}${p}`, wrong: [`${k}${p}`, `${k * n}x^{${n}}`, `\\frac{${k}}{${n + 1}}x^{${n + 1}}`],
      why: `En konstant faktor bliver stående: $(${k}x^{${n}})'=${k}\\cdot ${n}${p}=${k * n}${p}$.`,
    };
  },
  () => { const k = rint(2, 5); return { f: `e^{${k}x}`, right: `${k}e^{${k}x}`, wrong: [`e^{${k}x}`, `${k}x\\,e^{${k}x-1}`, `\\frac{1}{${k}}e^{${k}x}`], why: `$(e^{kx})'=k\\cdot e^{kx}$, så $(e^{${k}x})'=${k}e^{${k}x}$.` }; },
  () => ({ f: '\\ln(x)', right: '\\frac{1}{x}', wrong: ['e^{x}', 'x\\ln(x)-x', '\\frac{\\ln(x)}{x}'], why: "$(\\ln x)'=\\dfrac1x$ for $x>0$." }),
  () => ({ f: '\\sin(x)', right: '\\cos(x)', wrong: ['-\\cos(x)', '-\\sin(x)', '\\sin(x)'], why: "$(\\sin x)'=\\cos x$." }),
  () => ({ f: '\\cos(x)', right: '-\\sin(x)', wrong: ['\\sin(x)', '-\\cos(x)', '\\cos(x)'], why: "$(\\cos x)'=-\\sin x$. Husk minusset!" }),
  () => ({ f: '\\sqrt{x}', right: '\\frac{1}{2\\sqrt{x}}', wrong: ['2\\sqrt{x}', '\\frac{1}{\\sqrt{x}}', '\\frac{2}{3}x^{3/2}'], why: "$\\sqrt x=x^{1/2}$, så $(\\sqrt x)'=\\frac12 x^{-1/2}=\\dfrac{1}{2\\sqrt x}$." }),
  () => ({ f: '\\frac{1}{x}', right: '-\\frac{1}{x^2}', wrong: ['\\frac{1}{x^2}', '\\ln(x)', '-\\frac{1}{x}'], why: "$\\frac1x=x^{-1}$, så $(x^{-1})'=-1\\cdot x^{-2}=-\\dfrac{1}{x^2}$." }),
  () => ({ f: 'x\\cdot e^{x}', right: '(x+1)\\,e^{x}', wrong: ['e^{x}', 'x\\cdot e^{x-1}', '1\\cdot e^{x}+x'], why: "Produktreglen: $(f\\cdot g)'=f'g+fg'$, så $(x\\cdot e^x)'=1\\cdot e^x+x\\cdot e^x=(x+1)e^x$." }),
  () => ({ f: 'x^2\\ln(x)', right: '2x\\ln(x)+x', wrong: ['\\frac{2x}{x}', '2x\\ln(x)', '\\frac{x^2}{x}'], why: "Produktreglen: $(x^2\\ln x)'=2x\\ln x+x^2\\cdot\\frac1x=2x\\ln x+x$." }),
  () => { const k = rint(2, 4); return { f: `(${k}x+1)^3`, right: `${3 * k}(${k}x+1)^2`, wrong: [`3(${k}x+1)^2`, `(${k}x+1)^2`, `${k}(${k}x+1)^3`], why: `Kædereglen: $(f(g(x)))'=f'(g(x))\\cdot g'(x)$, så $((${k}x+1)^3)'=3(${k}x+1)^2\\cdot${k}=${3 * k}(${k}x+1)^2$.` }; },
  () => ({ f: 'e^{x^2}', right: '2x\\,e^{x^2}', wrong: ['e^{x^2}', 'x^2e^{x^2-1}', '2e^{x^2}'], why: "Kædereglen: ydre funktion $e^u$, indre $u=x^2$ med $u'=2x$. Så $(e^{x^2})'=e^{x^2}\\cdot2x$." }),
  () => ({ f: '\\ln(x^2+1)', right: '\\frac{2x}{x^2+1}', wrong: ['\\frac{1}{x^2+1}', '\\frac{1}{2x}', '2x\\ln(x^2+1)'], why: "Kædereglen: $(\\ln u)'=\\frac{u'}{u}$, så $(\\ln(x^2+1))'=\\dfrac{2x}{x^2+1}$." }),
  () => { const a = rint(2, 5); return { f: `${a}^{x}`, right: `${a}^{x}\\cdot\\ln(${a})`, wrong: [`x\\cdot ${a}^{x-1}`, `${a}^{x}`, `\\frac{${a}^{x}}{\\ln(${a})}`], why: `$(a^x)'=a^x\\cdot\\ln(a)$. Bemærk: potensreglen gælder ikke, når $x$ står i eksponenten.` }; },
];

const exercises = [
  {
    id: 'poly',
    title: 'Differentiér et polynomium',
    make() {
      const c3 = pick([0, 0, 1, -1, 2]);
      let c2 = rint(-4, 4);
      const c1 = rint(-6, 6), c0 = rint(-5, 5);
      if (c3 === 0 && c2 === 0) c2 = pick([1, 2, 3, -1, -2]);
      const x0 = rint(-3, 3);
      const d = 3 * c3 * x0 * x0 + 2 * c2 * x0 + c1;
      return {
        prompt: `Givet $f(x)=${polyTex([c3, c2, c1, c0])}$. Bestem $f'(${tn(x0)})$.`,
        fields: [{ label: `f'(${x0})`, answer: d }],
        hint: "Differentiér ledvis: $(x^n)'=n\\cdot x^{n-1}$, og en konstant differentieres til 0. Indsæt bagefter $x_0$.",
        solution: `$$f'(x)=${polyTex([3 * c3, 2 * c2, c1])}$$ $$f'(${tn(x0)})=${tn(d)}$$`,
      };
    },
  },
  {
    id: 'tangent',
    title: 'Tangentens ligning',
    make() {
      const a = pick([1, -1, 2, -2, 0.5]), b = rint(-4, 4), c = rint(-4, 4), x0 = rint(-3, 3);
      const f = (x) => a * x * x + b * x + c;
      const y0 = f(x0), m = 2 * a * x0 + b, q = y0 - m * x0;
      return {
        prompt: `Bestem en ligning for tangenten til grafen for $f(x)=${polyTex([a, b, c])}$ i punktet $P${pt(x0, y0)}$. Skriv den på formen $y=\\alpha x+\\beta$.`,
        graph: {
          view: { xmin: x0 - 7, xmax: x0 + 7, ymin: y0 - 5, ymax: y0 + 5 },
          scene: (st, rev) => [
            { type: 'fn', f, color: '--c1', width: 3 },
            rev && { type: 'line', x1: x0, y1: y0, x2: x0 + 1, y2: y0 + m, color: '--c2', width: 2.5 },
            { type: 'point', x: x0, y: y0, color: '--c2', label: 'P' },
          ],
        },
        fields: [{ label: '\\alpha', answer: m }, { label: '\\beta', answer: q }],
        hint: "Tangentens ligning er $y=f'(x_0)(x-x_0)+f(x_0)$. Start med at finde $f'(x)$.",
        solution: `$$f'(x)=${polyTex([2 * a, b])},\\qquad f'(${tn(x0)})=${tn(m)}$$ $$y=${tn(m)}(${polyTex([1, -x0])})${y0 < 0 ? '-' : '+'}${tn(Math.abs(y0))}=${linTex(m, q)}$$ Altså $\\alpha=${tn(m)}$ og $\\beta=${tn(q)}$.`,
      };
    },
  },
  {
    id: 'rules',
    title: 'Regneregler',
    make() {
      const r = pick(RULES)();
      return {
        prompt: `Hvad er $f'(x)$, når $f(x)=${r.f}$?`,
        choices: shuffle([{ html: `$${r.right}$`, correct: true }, ...r.wrong.map((w) => ({ html: `$${w}$` }))]),
        solution: r.why,
      };
    },
  },
  {
    id: 'extrema',
    title: 'Vandrette tangenter',
    make() {
      let r1, r2;
      do { r1 = rint(-3, 3); r2 = rint(-3, 3); } while (r1 === r2 || (r1 + r2) % 2 !== 0);
      const c0 = rint(-3, 3);
      const coeffs = [1, -1.5 * (r1 + r2), 3 * r1 * r2, c0];
      return {
        prompt: `Givet $f(x)=${polyTex(coeffs)}$. Bestem de $x$-værdier, hvor grafen for $f$ har vandret tangent.`,
        fields: [{ label: 'x_1', answer: r1 }, { label: 'x_2', answer: r2 }],
        unordered: true,
        hint: "Vandret tangent betyder, at hældningen er 0. Løs altså $f'(x)=0$.",
        solution: `$$f'(x)=${polyTex([3, -3 * (r1 + r2), 3 * r1 * r2])}=0$$ Divider med 3: $$${polyTex([1, -(r1 + r2), r1 * r2])}=0$$ Løsningerne er $x=${Math.min(r1, r2)}$ og $x=${Math.max(r1, r2)}$.`,
      };
    },
  },
  {
    id: 'drawtangent',
    title: 'Tegn tangenten',
    interactive: true,
    make() {
      const a = pick([0.5, -0.5, 1, -1]), b = rint(-2, 2), c = rint(-2, 2), x0 = rint(-2, 2);
      const f = (x) => a * x * x + b * x + c;
      const y0 = f(x0), m = 2 * a * x0 + b;
      const st = { y: y0 + (m === 0 ? 2 : 0) };
      return {
        prompt: `Træk punktet $Q$ op eller ned, så linjen gennem $P$ og $Q$ bliver <b>tangent</b> til grafen for $f(x)=${polyTex([a, b, c])}$ i $P$.`,
        graph: {
          view: { xmin: x0 - 5, xmax: x0 + 5, ymin: y0 - 4, ymax: y0 + 4 },
          state: st,
          scene: (s, rev) => [
            { type: 'fn', f, color: '--c1', width: 3 },
            rev && { type: 'line', x1: x0, y1: y0, x2: x0 + 1, y2: y0 + m, color: '--c3', width: 2, dash: true },
            { type: 'line', x1: x0, y1: y0, x2: x0 + 1, y2: s.y, color: '--c2', width: 2.5 },
            { type: 'vline', x: x0 + 1, color: '--g-grid', width: 1, dash: [3, 4] },
            { type: 'point', x: x0, y: y0, color: '--c1', label: 'P' },
            { type: 'point', x: x0 + 1, y: s.y, color: '--c2', label: 'Q', snap: 0.5, drag: (x, y) => { s.y = y; } },
          ],
        },
        check: (s) => near(s.y, y0 + m),
        hint: `$Q$ ligger 1 til højre for $P$, så $Q$ skal ligge $f'(${x0})$ højere end $P$. Find $f'(x)$ først.`,
        solution: `$$f'(x)=${polyTex([2 * a, b])},\\qquad f'(${x0})=${tn(m)}$$ Tangenten stiger $${tn(m)}$ for hvert skridt til højre, så $Q$ skal ligge i $${pt(x0 + 1, y0 + m)}$.`,
      };
    },
  },
  {
    id: 'findslope',
    title: 'Find punktet med en given hældning',
    interactive: true,
    make() {
      const a = pick([0.5, -0.5]), b = rint(-2, 2), c = rint(-2, 2), x0 = rint(-3, 3);
      const f = (x) => a * x * x + b * x + c;
      const k = 2 * a * x0 + b;
      let start;
      do start = rint(-5, 5); while (start === x0);
      const xs = [-6, 6].map(f).concat(f(-b / (2 * a)));
      const lo = Math.min(...xs), hi = Math.max(...xs), pad = (hi - lo) * 0.12 + 1;
      return {
        prompt: `Træk punktet $P$ langs grafen for $f(x)=${polyTex([a, b, c])}$, så tangenten i $P$ får hældningen $${tn(k)}$.`,
        graph: {
          view: { xmin: -6, xmax: 6, ymin: lo - pad, ymax: hi + pad, equalAspect: false },
          state: { x: start },
          scene: (st, rev) => [
            { type: 'fn', f, color: '--c1', width: 3 },
            { type: 'line', x1: st.x, y1: f(st.x), x2: st.x + 1, y2: f(st.x) + 2 * a * st.x + b, color: '--c2', width: 2.5 },
            rev && { type: 'point', x: x0, y: f(x0), color: '--c3', r: 6, label: `x = ${x0}`, ldy: 18 },
            { type: 'point', x: st.x, y: f(st.x), color: '--c2', label: 'P', drag: (x) => { st.x = Math.max(-6, Math.min(6, Math.round(x * 2) / 2)); } },
          ],
        },
        check: (st) => Math.abs(st.x - x0) < 1e-9,
        hint: `Løs ligningen $f'(x)=${tn(k)}$. Her er $f'(x)=${polyTex([2 * a, b])}$.`,
        solution: `$$f'(x)=${polyTex([2 * a, b])}=${tn(k)}\\quad\\Leftrightarrow\\quad x=${tn(x0)}$$ Punktet er $P${pt(x0, f(x0))}$.`,
      };
    },
  },
];

const learn = `
<h2>Differentialkvotient</h2>
<p>Differentialkvotienten $f'(x_0)$ er <b>hældningen af tangenten</b> til grafen i punktet $(x_0\\,;\\,f(x_0))$ – eller funktionens <b>væksthastighed</b> i $x_0$. Den defineres som grænseværdien af sekanthældningen:</p>
<div class="rule">$$f'(x_0)=\\lim_{h\\to0}\\frac{f(x_0+h)-f(x_0)}{h}$$</div>
<p>Grænseværdien skal eksistere – og $f$ skal være <b>kontinuert</b> i $x_0$ – før funktionen kan differentieres der.</p>

<h2>Regneregler</h2>
<table class="vt"><thead><tr><th>$f(x)$</th><th>$f'(x)$</th></tr></thead><tbody>
<tr><td>$k$</td><td>$0$</td></tr>
<tr><td>$x^n$</td><td>$n\\cdot x^{n-1}$</td></tr>
<tr><td>$e^{kx}$</td><td>$k\\cdot e^{kx}$</td></tr>
<tr><td>$a^x$</td><td>$a^x\\cdot\\ln a$</td></tr>
<tr><td>$\\ln x$</td><td>$\\frac1x$</td></tr>
<tr><td>$\\sqrt x$</td><td>$\\frac{1}{2\\sqrt x}$</td></tr>
<tr><td>$\\sin x$</td><td>$\\cos x$</td></tr>
<tr><td>$\\cos x$</td><td>$-\\sin x$</td></tr>
</tbody></table>
<div class="rule">$$(f\\pm g)'=f'\\pm g'\\qquad (k\\cdot f)'=k\\cdot f'$$
$$\\textbf{Produktreglen:}\\;(f\\cdot g)'=f'\\cdot g+f\\cdot g'\\qquad \\textbf{Kædereglen:}\\;\\big(f(g(x))\\big)'=f'(g(x))\\cdot g'(x)$$</div>
<div class="example">$$\\big((3x+1)^4\\big)'=4(3x+1)^3\\cdot3=12(3x+1)^3$$</div>

<h2>Tangentens ligning</h2>
<div class="rule">$$y=f'(x_0)\\,(x-x_0)+f(x_0)$$</div>
<div class="example">$f(x)=x^2$ i $x_0=3$: $f(3)=9$, $f'(x)=2x$, $f'(3)=6$. Tangenten er $y=6(x-3)+9=6x-9$.</div>

<h2>Monotoni og ekstrema</h2>
<ul>
  <li>$f'(x)>0$ på et interval: $f$ er <b>voksende</b> der.</li>
  <li>$f'(x)<0$: $f$ er <b>aftagende</b>.</li>
  <li>$f'(x)=0$: vandret tangent – et muligt <b>lokalt maksimum eller minimum</b>.</li>
</ul>
<p>Fremgangsmåde: løs $f'(x)=0$, lav en <b>fortegnslinje</b> for $f'$, og aflæs monotoniforhold og ekstrema. Ved <b>optimering</b> finder man det $x$, der giver den største eller mindste værdi.</p>

<h2>Newtons metode</h2>
<p>Nulpunkter kan findes numerisk ved gentagne gange at følge tangenten ned til $x$-aksen:</p>
<div class="rule">$$x_{n+1}=x_n-\\frac{f(x_n)}{f'(x_n)}$$</div>`;

export default {
  id: 'differential',
  learn,
  title: 'Differentialregning',
  short: 'Differential',
  formula: "f'(x_0)",
  desc: 'Tangenter, sekanter og regneregler. Se sekanten blive til en tangent, når h går mod 0.',
  explore,
  exercises,
};
