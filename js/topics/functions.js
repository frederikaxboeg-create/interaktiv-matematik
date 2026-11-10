import { Graph } from '../graph.js';
import { el, math, slider, toggle, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, rintNZ, pick, shuffle, tn, par, polyTex, round, num, near, plus } from '../util.js';

// grundfunktioner med et "ankerpunkt", der flytter sig med forskydningen
const BASES = {
  x2: { label: 'x²', f: (x) => x * x, tex: (u) => `\\left(${u}\\right)^2`, plain: 'x^2', anchor: [0, 0] },
  sqrt: { label: '√x', f: Math.sqrt, tex: (u) => `\\sqrt{${u}}`, plain: '\\sqrt{x}', anchor: [0, 0] },
  inv: { label: '1/x', f: (x) => 1 / x, tex: (u) => `\\frac{1}{${u}}`, plain: '\\frac1x', anchor: [0, 0], asym: true },
  abs: { label: '|x|', f: Math.abs, tex: (u) => `\\left|${u}\\right|`, plain: '|x|', anchor: [0, 0] },
  exp: { label: 'eˣ', f: Math.exp, tex: (u) => `e^{${u}}`, plain: 'e^x', anchor: [0, 1] },
  ln: { label: 'ln x', f: Math.log, tex: (u) => `\\ln\\left(${u}\\right)`, plain: '\\ln(x)', anchor: [1, 0] },
  x3: { label: 'x³', f: (x) => x ** 3, tex: (u) => `\\left(${u}\\right)^3`, plain: 'x^3', anchor: [0, 0] },
};
const inner = (h) => (h === 0 ? 'x' : `x${h > 0 ? '-' : '+'}${tn(Math.abs(h))}`);
function shiftTex(B, a, h, k) {
  const body = h === 0 && B.tex('x').includes('\\left(x\\right)') ? B.plain : B.tex(inner(h));
  return `${a === 1 ? '' : a === -1 ? '-' : tn(a)}${body}${k ? plus(k) : ''}`;
}

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { mode: 'forskyd', base: 'x2', a: 1, h: 2, k: -1, outer: 'x2', inner: 'lin' };
  const g = new Graph(graphBox, { xmin: -8, xmax: 8, ymin: -6, ymax: 7 });
  const INNER = { lin: { tex: '2x-1', f: (x) => 2 * x - 1 }, sin: { tex: '\\sin(x)', f: Math.sin }, sq: { tex: 'x^2-2', f: (x) => x * x - 2 }, half: { tex: '\\tfrac12x', f: (x) => x / 2 } };

  g.setScene(() => {
    if (s.mode === 'forskyd') {
      const B = BASES[s.base], [ax, ay] = B.anchor;
      const items = [
        { type: 'fn', f: B.f, color: '--g-axis', width: 1.5, dash: true },
        { type: 'fn', f: (x) => s.a * B.f(x - s.h) + s.k, color: '--c1', width: 3 },
        { type: 'segment', x1: ax, y1: ay, x2: ax + s.h, y2: ay + s.k, color: '--c4', width: 1.5, dash: [3, 4], arrow: true },
      ];
      if (B.asym) items.push({ type: 'vline', x: s.h, color: '--c3', width: 1.5, dash: true }, { type: 'hline', y: s.k, color: '--c3', width: 1.5, dash: true });
      items.push({ type: 'point', x: ax + s.h, y: ay * s.a + s.k, color: '--c2', label: `(${num(ax + s.h)}; ${num(ay * s.a + s.k)})`, snap: 0.5, drag: (x, y) => { s.h = x - ax; s.k = y - ay * s.a; sh.set(s.h); sk.set(s.k); update(); } });
      return items;
    }
    const O = BASES[s.outer], I = INNER[s.inner];
    return [
      { type: 'fn', f: I.f, color: '--c3', width: 2, dash: true },
      { type: 'fn', f: O.f, color: '--g-axis', width: 1.5, dash: true },
      { type: 'fn', f: (x) => O.f(I.f(x)), color: '--c1', width: 3 },
    ];
  });

  const baseChips = el('div', { class: 'chips small' });
  const renderBase = () => baseChips.replaceChildren(...Object.entries(BASES).map(([key, B]) => {
    const b = el('button', { type: 'button', class: 'chip' + (key === (s.mode === 'forskyd' ? s.base : s.outer) ? ' active' : '') }, B.label);
    b.addEventListener('click', () => { if (s.mode === 'forskyd') s.base = key; else s.outer = key; renderBase(); update(); });
    return b;
  }));
  const innerCtl = segmented(Object.entries(INNER).map(([k2, v]) => ({ value: k2, label: v.tex.replace(/\\tfrac12/, '½').replace(/\\sin/, 'sin').replace(/\^2/, '²') })), s.inner, (v) => { s.inner = v; update(); });
  const sa = slider({ label: 'a', min: -3, max: 3, step: 0.5, value: s.a, onInput: (v) => { s.a = v; update(); } });
  const sh = slider({ label: 'h', min: -6, max: 6, step: 0.5, value: s.h, onInput: (v) => { s.h = v; update(); } });
  const sk = slider({ label: 'k', min: -5, max: 5, step: 0.5, value: s.k, onInput: (v) => { s.k = v; update(); } });
  const shiftBox = el('div', { class: 'sliders' }, sa.row, sh.row, sk.row);
  const compBox = el('div', { class: 'explore-panel', hidden: true }, el('div', { class: 'panel-label' }, 'Indre funktion g(x)'), innerCtl);
  const modeCtl = segmented([{ value: 'forskyd', label: 'Forskydning' }, { value: 'sammensat', label: 'Sammensat funktion' }], s.mode, (v) => {
    s.mode = v; shiftBox.hidden = v !== 'forskyd'; compBox.hidden = v !== 'sammensat'; renderBase(); update();
  });
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Vælg en grundfunktion. Træk i det orange punkt for at parallelforskyde grafen – eller skift til sammensatte funktioner.'),
    modeCtl, el('div', { class: 'panel-label' }, 'Grundfunktion / ydre funktion f'), baseChips, shiftBox, compBox, info,
    card('Husk', `
      <ul>
        <li>$f(x-h)+k$ er grafen for $f$ <b>forskudt</b> $h$ til højre og $k$ op.</li>
        <li>$a\\cdot f(x)$ strækker grafen lodret (og spejler i $x$-aksen, hvis $a<0$).</li>
        <li>Sammensat funktion: $(f\\circ g)(x)=f\\big(g(x)\\big)$ – først $g$, så $f$.</li>
      </ul>`),
  );

  function update() {
    if (s.mode === 'forskyd') {
      const B = BASES[s.base];
      info.innerHTML = math(`<p class="muted">Grundfunktion (stiplet): $f(x)=${B.plain}$</p>
        <div class="result">$$g(x)=${shiftTex(B, s.a, s.h, s.k)}$$</div>
        <p>Grafen er forskudt $${tn(s.h)}$ ${s.h >= 0 ? 'mod højre' : 'mod venstre'} og $${tn(Math.abs(s.k))}$ ${s.k >= 0 ? 'op' : 'ned'}${s.a !== 1 ? `, og strakt med faktor $${tn(s.a)}$` : ''}.</p>`);
    } else {
      const O = BASES[s.outer], I = INNER[s.inner];
      info.innerHTML = math(`<p class="muted">Ydre $f(x)=${O.plain}$ (grå), indre $g(x)=${I.tex}$ (grøn).</p>
        <div class="result">$$f\\big(g(x)\\big)=${O.tex(I.tex)}$$</div>
        <p class="muted">Bemærk: $g\\big(f(x)\\big)$ er noget andet – rækkefølgen betyder noget.</p>`);
    }
    g.draw();
  }
  renderBase();
  update();
}

// ---------- opgaver ----------
const exercises = [
  {
    id: 'forskydning',
    title: 'Parallelforskydning',
    make() {
      const key = pick(['x2', 'sqrt', 'inv', 'abs', 'exp']), B = BASES[key];
      const h = rintNZ(-4, 4), k = rint(-4, 4);
      const right = shiftTex(B, 1, h, k);
      const wrongs = [shiftTex(B, 1, -h, k), shiftTex(B, 1, h, -k || 1), shiftTex(B, 1, k || 1, h)].filter((w) => w !== right);
      return {
        prompt: `Grafen for $f(x)=${B.plain}$ forskydes $${Math.abs(h)}$ ${h > 0 ? 'til højre' : 'til venstre'}${k ? ` og $${Math.abs(k)}$ ${k > 0 ? 'op' : 'ned'}` : ''}. Hvad er forskriften for den nye funktion?`,
        choices: shuffle([{ html: `$${right}$`, correct: true }, ...[...new Set(wrongs)].slice(0, 3).map((w) => ({ html: `$${w}$` }))]),
        hint: 'Forskydning $h$ mod højre: erstat $x$ med $x-h$. Forskydning $k$ op: læg $k$ til.',
        solution: `$$f(x-${par(h)})${k ? plus(k) : ''}=${right}$$ Bemærk fortegnet: til højre giver <b>minus</b> inde i funktionen.`,
      };
    },
  },
  {
    id: 'aflaesforskyd',
    title: 'Aflæs forskydningen',
    make() {
      const key = pick(['x2', 'sqrt', 'abs', 'x2']), B = BASES[key], h = rint(-4, 4), k = rint(-3, 3);
      return {
        prompt: `Den blå graf er grafen for $f(x)=${B.plain}$ forskudt. Forskriften er $g(x)=${B.tex('x-h')}+k$. Aflæs $h$ og $k$.`,
        graph: {
          view: { xmin: -8, xmax: 8, ymin: -5, ymax: 7 },
          scene: (st, rev) => [
            { type: 'fn', f: B.f, color: '--g-axis', width: 1.5, dash: true },
            { type: 'fn', f: (x) => B.f(x - h) + k, color: '--c1', width: 3 },
            rev && { type: 'point', x: h, y: k, color: '--c2', label: `(${h}; ${k})` },
          ],
        },
        fields: [{ label: 'h', answer: h }, { label: 'k', answer: k }],
        hint: `Grundfunktionens "hjørne" $(0,0)$ er flyttet til $(h,k)$. Find det tilsvarende punkt på den blå graf.`,
        solution: `Punktet $(0,0)$ er flyttet til $(${h},${k})$, så $h=${h}$ og $k=${k}$: $$g(x)=${shiftTex(B, 1, h, k)}$$`,
      };
    },
  },
  {
    id: 'sammensat',
    title: 'Sammensatte funktioner',
    make() {
      const a = rintNZ(-3, 3), b = rint(-4, 4), x0 = rint(-3, 3), c = rint(-3, 3);
      const fTex = polyTex([1, 0, c]), gTex = polyTex([a, b]);
      if (Math.random() < 0.5) {
        const gv = a * x0 + b, val = gv * gv + c;
        return {
          prompt: `Givet $f(x)=${fTex}$ og $g(x)=${gTex}$. Beregn $f\\big(g(${x0})\\big)$.`,
          fields: [{ label: `f(g(${x0}))`, answer: val }],
          hint: 'Beregn først den indre funktion $g(' + x0 + ')$, og sæt resultatet ind i $f$.',
          solution: `$$g(${x0})=${tn(gv)},\\qquad f(${tn(gv)})=${par(gv)}^2${plus(c)}=${val}$$`,
        };
      }
      const right = `(${gTex})^2${c ? plus(c) : ''}`;
      return {
        prompt: `Givet $f(x)=${fTex}$ og $g(x)=${gTex}$. Hvad er $f\\big(g(x)\\big)$?`,
        choices: shuffle([
          { html: `$${right}$`, correct: true },
          { html: `$${a === 1 ? '' : a === -1 ? '-' : a}(${fTex})${b ? plus(b) : ''}$` },
          { html: `$${polyTex([a, b])}${c ? plus(c) : ''}$` },
          { html: `$(${fTex})(${gTex})$` },
        ]),
        hint: 'Sæt hele $g(x)$ ind på $x$\'s plads i $f$.',
        solution: `$$f\\big(g(x)\\big)=\\big(g(x)\\big)^2${c ? plus(c) : ''}=${right}$$ (Det andet svar, $g(f(x))$, er noget andet!)`,
      };
    },
  },
  {
    id: 'dm',
    title: 'Definitionsmængde',
    make() {
      const t = rintNZ(-5, 5);
      const v = pick([
        { f: `\\sqrt{${polyTex([1, -t])}}`, right: `x\\ge ${t}`, w: [`x>${t}`, `x\\ne ${t}`, `x\\ge ${-t}`], why: `Under kvadratroden må der ikke stå et negativt tal: $x-${par(t)}\\ge0$.` },
        { f: `\\ln(${polyTex([1, -t])})`, right: `x>${t}`, w: [`x\\ge ${t}`, `x\\ne ${t}`, `x>${-t}`], why: `Logaritmen er kun defineret for positive tal: $x-${par(t)}>0$.` },
        { f: `\\frac{1}{${polyTex([1, -t])}}`, right: `x\\ne ${t}`, w: [`x>${t}`, `x\\ge ${t}`, `x\\ne ${-t}`], why: `Man må ikke dividere med 0: $x-${par(t)}\\ne0$.` },
      ]);
      return {
        prompt: `Hvad er definitionsmængden for $f(x)=${v.f}$?`,
        choices: shuffle([{ html: `$${v.right}$`, correct: true }, ...v.w.map((w) => ({ html: `$${w}$` }))]),
        hint: 'Hvilke $x$-værdier kan man ikke sætte ind? (Kvadratrod af negativt tal, logaritme af 0 eller negativt, division med 0.)',
        solution: `${v.why} Altså $\\text{Dm}(f)$: $${v.right}$.`,
      };
    },
  },
  {
    id: 'logaritmer',
    title: 'Logaritmeregler',
    make() {
      const v = pick(['log10', 'ln', 'regel', 'regel2']);
      if (v === 'log10') { const n = rint(-3, 5); return { prompt: `Bestem $\\log(${tn(10 ** n, 4)})$.`, fields: [{ label: '\\log', answer: n }], hint: '$\\log(10^n)=n$', solution: `$$\\log(${tn(10 ** n, 4)})=\\log(10^{${n}})=${n}$$` }; }
      if (v === 'ln') { const n = rint(-4, 6); return { prompt: `Bestem $\\ln(e^{${n}})$.`, fields: [{ label: '\\ln', answer: n }], hint: '$\\ln$ og $e^x$ ophæver hinanden.', solution: `$$\\ln(e^{${n}})=${n}$$` }; }
      const a = pick([2, 3, 5]), la = Math.log10(a);
      if (v === 'regel') { const k = rint(2, 4); return {
        prompt: `Det oplyses, at $\\log(${a})\\approx${tn(la, 4)}$. Bestem $\\log(${a ** k})$ uden lommeregner. Afrund til fire decimaler.`,
        fields: [{ label: '\\log', answer: k * la, tol: 0.0006 }],
        hint: '$\\log(a^k)=k\\cdot\\log(a)$',
        solution: `$$\\log(${a ** k})=\\log(${a}^{${k}})=${k}\\cdot\\log(${a})\\approx ${tn(k * la, 4)}$$`,
      }; }
      return {
        prompt: `Det oplyses, at $\\log(${a})\\approx${tn(la, 4)}$. Bestem $\\log(${a * 10})$. Afrund til fire decimaler.`,
        fields: [{ label: '\\log', answer: la + 1, tol: 0.0006 }],
        hint: '$\\log(a\\cdot b)=\\log(a)+\\log(b)$, og $\\log(10)=1$.',
        solution: `$$\\log(${a * 10})=\\log(${a})+\\log(10)\\approx ${tn(la, 4)}+1=${tn(la + 1, 4)}$$`,
      };
    },
  },
  {
    id: 'polynomium',
    title: 'Polynomier',
    make() {
      let r = [rint(-4, 4), rint(-4, 4), rint(-4, 4)];
      while (new Set(r).size < 3) r = [rint(-4, 4), rint(-4, 4), rint(-4, 4)];
      const k = pick([0.25, 0.5, -0.25, -0.5]);
      const f = (x) => k * (x - r[0]) * (x - r[1]) * (x - r[2]);
      let lo = Infinity, hi = -Infinity;
      for (let x = -5; x <= 5; x += 0.1) { lo = Math.min(lo, f(x)); hi = Math.max(hi, f(x)); }
      return {
        prompt: 'Grafen viser et tredjegradspolynomium. Aflæs de tre nulpunkter.',
        graph: { view: { xmin: -6, xmax: 6, ymin: Math.max(lo, -12) - 1, ymax: Math.min(hi, 12) + 1, equalAspect: false }, scene: () => [{ type: 'fn', f, color: '--c1', width: 3 }] },
        fields: r.map((x, i) => ({ label: `x_${i + 1}`, answer: x })),
        unordered: true,
        hint: 'Nulpunkterne er der, hvor grafen skærer $x$-aksen. Et polynomium af grad $n$ har højst $n$ nulpunkter.',
        solution: `Grafen skærer $x$-aksen i $x=${[...r].sort((a, b) => a - b).join('$, $x=')}$. Polynomiet kan skrives $f(x)=${tn(k)}(${polyTex([1, -r[0]])})(${polyTex([1, -r[1]])})(${polyTex([1, -r[2]])})$.`,
      };
    },
  },
  {
    id: 'traekforskyd',
    title: 'Forskyd grafen',
    interactive: true,
    make() {
      const key = pick(['x2', 'sqrt', 'abs', 'inv']), B = BASES[key], h = rint(-4, 4), k = rint(-3, 3);
      const st = { h: 0, k: 0 };
      if (h === 0 && k === 0) st.h = 2;
      return {
        prompt: `Træk i punktet, så den blå graf bliver grafen for $g(x)=${shiftTex(B, 1, h, k)}$.`,
        graph: {
          view: { xmin: -8, xmax: 8, ymin: -6, ymax: 7 },
          state: st,
          scene: (s, rev) => [
            { type: 'fn', f: B.f, color: '--g-axis', width: 1.5, dash: true },
            rev && { type: 'fn', f: (x) => B.f(x - h) + k, color: '--c3', width: 2.5, dash: true },
            { type: 'fn', f: (x) => B.f(x - s.h) + s.k, color: '--c1', width: 3 },
            B.asym && { type: 'vline', x: s.h, color: '--c3', width: 1, dash: [3, 4] },
            { type: 'point', x: s.h, y: s.k, color: '--c2', snap: 0.5, drag: (x, y) => { s.h = x; s.k = y; } },
          ],
        },
        check: (s) => near(s.h, h) && near(s.k, k),
        hint: '$f(x-h)+k$ er forskudt $h$ til højre og $k$ op. Læs $h$ og $k$ ud af forskriften – pas på fortegnet inde i funktionen.',
        solution: `$h=${h}$ og $k=${k}$, så punktet skal flyttes til $(${h},${k})$.`,
      };
    },
  },
];

const learn = `
<h2>Funktionsbegrebet</h2>
<p>En <b>funktion</b> $f$ knytter til hvert tal $x$ i <b>definitionsmængden</b> $\\text{Dm}(f)$ præcis ét tal $f(x)$. Mængden af alle funktionsværdier er <b>værdimængden</b> $\\text{Vm}(f)$.</p>
<ul>
  <li>$\\sqrt{x}$ kræver $x\\ge0$, $\\ln x$ kræver $x>0$, og $\\frac1x$ kræver $x\\ne0$.</li>
</ul>

<h2>Parallelforskydning og strækning</h2>
<div class="rule">$$g(x)=a\\cdot f(x-h)+k$$</div>
<ul>
  <li>$h$: forskydning <b>vandret</b> – mod højre når $h>0$ (bemærk minus!).</li>
  <li>$k$: forskydning <b>lodret</b> – op når $k>0$.</li>
  <li>$a$: lodret strækning, og spejling i $x$-aksen når $a<0$.</li>
</ul>
<div class="example">Grafen for $f(x)=x^2$ forskudt 3 til højre og 2 ned: $g(x)=(x-3)^2-2$. Toppunktet flytter fra $(0,0)$ til $(3,-2)$.</div>

<h2>Sammensatte funktioner</h2>
<div class="rule">$$(f\\circ g)(x)=f\\big(g(x)\\big)$$</div>
<p>Først beregnes den <b>indre</b> funktion $g(x)$, og resultatet sættes ind i den <b>ydre</b> funktion $f$. Rækkefølgen betyder noget: normalt er $f(g(x))\\ne g(f(x))$. Den afledede findes med <b>kædereglen</b>: $\\big(f(g(x))\\big)'=f'(g(x))\\cdot g'(x)$.</p>
<div class="example">$f(x)=x^2$ og $g(x)=2x+1$: $f(g(x))=(2x+1)^2$, men $g(f(x))=2x^2+1$.</div>

<h2>Logaritmefunktioner</h2>
<p>$\\log(x)$ er den omvendte funktion til $10^x$, og $\\ln(x)$ er den omvendte til $e^x$: $\\log(10^x)=x$ og $\\ln(e^x)=x$. Begge er kun defineret for $x>0$ og er voksende.</p>
<div class="rule">$$\\log(a\\cdot b)=\\log a+\\log b\\qquad \\log\\left(\\frac ab\\right)=\\log a-\\log b\\qquad \\log(a^k)=k\\cdot\\log a$$</div>
<p>Samme regler gælder for $\\ln$.</p>

<h2>Polynomier</h2>
<p>Et polynomium af grad $n$ er $f(x)=a_nx^n+\\dots+a_1x+a_0$. Det har højst $n$ nulpunkter, og kendes nulpunkterne $r_1,\\dots,r_n$, kan det skrives $a_n(x-r_1)\\cdots(x-r_n)$.</p>`;

export default {
  id: 'funktioner',
  title: 'Funktioner – grundbegreber',
  short: 'Funktioner',
  formula: 'f\\big(g(x)\\big)',
  desc: 'Definitions- og værdimængde, parallelforskydning, sammensatte funktioner, logaritmefunktioner og polynomier.',
  learn,
  explore,
  exercises,
};
