import { Graph } from '../graph.js';
import { el, math, tex, slider, toggle, exploreLayout, card, hint } from '../ui.js';
import { rint, rintNZ, pick, shuffle, tn, par, pt, polyTex, round, num, near, plus } from '../util.js';
import { parse, toFnVars } from '../cas.js';
import { attachPreview } from '../mathinput.js';

/** Løs y' = f(x, y) numerisk (Runge–Kutta 4) fra (x0, y0) hen til x1. */
function rk4(f, x0, y0, x1, n = 400) {
  const pts = [[x0, y0]];
  const h = (x1 - x0) / n;
  let x = x0, y = y0;
  for (let i = 0; i < n; i++) {
    const k1 = f(x, y), k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
    if (!Number.isFinite(y) || Math.abs(y) > 1e4) break;
    pts.push([x, y]);
  }
  return pts;
}
function solutionCurve(f, x0, y0, xmin, xmax) {
  const back = rk4(f, x0, y0, xmin).reverse();
  const fwd = rk4(f, x0, y0, xmax);
  return [...back, ...fwd.slice(1)];
}
function euler(f, x0, y0, h, steps) {
  const pts = [[x0, y0]];
  let x = x0, y = y0;
  for (let i = 0; i < steps; i++) {
    y += h * f(x, y);
    x += h;
    if (!Number.isFinite(y) || Math.abs(y) > 1e4) break;
    pts.push([x, y]);
  }
  return pts;
}
/** Linjeelementer (retningsfelt) som korte streger. */
function slopeField(f, view, cols = 22) {
  const step = (view.xmax - view.xmin) / cols;
  const L = step * 0.36;
  const items = [];
  for (let x = Math.ceil(view.xmin / step) * step; x <= view.xmax; x += step) {
    for (let y = Math.ceil(view.ymin / step) * step; y <= view.ymax; y += step) {
      const m = f(x, y);
      if (!Number.isFinite(m)) continue;
      const dx = L / Math.sqrt(1 + m * m), dy = m * dx;
      items.push({ type: 'segment', x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy, color: '--g-axis', width: 1.4, alpha: 0.45 });
    }
  }
  return items;
}

const TYPES = {
  ky: {
    label: "y' = k·y",
    params: { k: [-1, 1, 0.05, 0.3] },
    f: (p) => (x, y) => p.k * y,
    de: (p) => `y'=${tn(p.k)}\\cdot y`,
    exact: (p, x0, y0) => { const c = y0 * Math.exp(-p.k * x0); return `y=${tn(c, 3)}\\cdot e^{${polyTex([p.k, 0])}}`; },
    eq: () => [0],
  },
  bay: {
    label: "y' = b − a·y",
    params: { b: [-4, 8, 0.5, 3], a: [0.1, 2, 0.1, 0.6] },
    f: (p) => (x, y) => p.b - p.a * y,
    de: (p) => `y'=${tn(p.b)}-${tn(p.a)}\\cdot y`,
    exact: (p, x0, y0) => { const L = p.b / p.a, c = (y0 - L) * Math.exp(p.a * x0); return `y=${tn(L, 3)}${plus(c, 3)}\\cdot e^{${polyTex([-p.a, 0])}}`; },
    eq: (p) => [p.b / p.a],
  },
  log: {
    label: 'Logistisk',
    params: { a: [0.02, 1, 0.02, 0.2], M: [1, 7, 0.5, 5] },
    f: (p) => (x, y) => p.a * y * (p.M - y),
    de: (p) => `y'=${tn(p.a)}\\cdot y\\cdot(${tn(p.M)}-y)`,
    exact: (p, x0, y0) => {
      if (y0 <= 0) return y0 === 0 ? 'y=0' : null;
      const C = (p.M / y0 - 1) * Math.exp(p.a * p.M * x0);
      return `y=\\dfrac{${tn(p.M)}}{1${plus(C, 3)}\\cdot e^{${polyTex([-p.a * p.M, 0], 'x', 3)}}}`;
    },
    eq: (p) => [0, p.M],
  },
  fx: {
    label: "y' = f(x)",
    params: { a: [-2, 2, 0.1, 0.5], b: [-3, 3, 0.1, -1] },
    f: (p) => (x) => p.a * x + p.b,
    de: (p) => `y'=${polyTex([p.a, p.b])}`,
    exact: (p, x0, y0) => { const c = y0 - (p.a / 2) * x0 * x0 - p.b * x0; return `y=${polyTex([p.a / 2, p.b, round(c, 3)])}`; },
    eq: () => [],
  },
  custom: { label: 'Egen', params: {} },
};

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = {
    type: 'bay', P: { x: 0, y: 0.5 }, field: true, curve: true, euler: false, h: 1, eqLines: true,
    p: Object.fromEntries(Object.entries(TYPES).map(([k, t]) => [k, Object.fromEntries(Object.entries(t.params).map(([n, v]) => [n, v[3]]))])),
    custom: 'x - y', customF: null,
  };
  s.customF = toFnVars(parse(s.custom), ['x', 'y']);
  const g = new Graph(graphBox, { xmin: -3, xmax: 10, ymin: -2, ymax: 7.5 });
  const F = () => (s.type === 'custom' ? s.customF : TYPES[s.type].f(s.p[s.type])) ?? (() => NaN);

  g.setScene(() => {
    const f = F(), v = g.view;
    const items = s.field ? slopeField(f, v) : [];
    const T = TYPES[s.type];
    if (s.eqLines && T.eq) for (const y of T.eq(s.p[s.type])) items.push({ type: 'hline', y, color: '--c3', width: 2, dash: true });
    if (s.curve) items.push({ type: 'path', points: solutionCurve(f, s.P.x, s.P.y, v.xmin, v.xmax), color: '--c1', width: 3 });
    if (s.euler) {
      const pts = euler(f, s.P.x, s.P.y, s.h, Math.ceil((v.xmax - s.P.x) / s.h));
      items.push({ type: 'path', points: pts, color: '--c2', width: 2 });
      pts.slice(1).forEach(([x, y]) => items.push({ type: 'point', x, y, color: '--c2', r: 3.5 }));
    }
    items.push({ type: 'point', x: s.P.x, y: s.P.y, color: '--c1', label: `(${num(s.P.x)}; ${num(s.P.y)})`, snap: 0.25, drag: (x, y) => { s.P = { x, y }; update(); } });
    return items;
  });

  const chips = el('div', { class: 'chips small' });
  const sliders = el('div', { class: 'sliders' });
  const customInput = el('input', { type: 'text', value: s.custom, spellcheck: 'false', autocomplete: 'off', 'aria-label': "Egen differentialligning y' = f(x, y)" });
  const customErr = el('div', { class: 'err' });
  const customRow = el('div', { class: 'custom-fn', hidden: true },
    el('label', { class: 'fn-input' }, el('span', { html: tex("y'=") }), customInput),
    attachPreview(customInput, { prefix: "y'=" }), customErr);
  customInput.addEventListener('input', () => {
    try { s.customF = toFnVars(parse(customInput.value), ['x', 'y']); s.custom = customInput.value; customErr.textContent = ''; }
    catch (e) { customErr.textContent = e.message; }
    update();
  });

  const renderControls = () => {
    chips.replaceChildren(...Object.entries(TYPES).map(([k, t]) => {
      const b = el('button', { type: 'button', class: 'chip' + (k === s.type ? ' active' : '') }, t.label);
      b.addEventListener('click', () => { s.type = k; renderControls(); update(); });
      return b;
    }));
    const T = TYPES[s.type];
    sliders.replaceChildren(...Object.entries(T.params).map(([n, [min, max, step]]) => slider({
      label: n, min, max, step, value: s.p[s.type][n], onInput: (v) => { s.p[s.type][n] = v; update(); },
    }).row));
    sliders.hidden = !Object.keys(T.params).length;
    customRow.hidden = s.type !== 'custom';
  };

  const hSlider = slider({ label: 'h', min: 0.1, max: 2, step: 0.1, value: s.h, onInput: (v) => { s.h = v; update(); } });
  hSlider.row.hidden = true;
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('De små streger er <b>linjeelementer</b>: deres hældning er $y\'$ i punktet. Træk i startpunktet, så følger løsningskurven felterne.'),
    chips, sliders, customRow, info,
    el('div', { class: 'toggles' },
      toggle('Retningsfelt (linjeelementer)', s.field, (v) => { s.field = v; update(); }),
      toggle('Løsningskurve gennem punktet', s.curve, (v) => { s.curve = v; update(); }),
      toggle('Ligevægtsløsninger', s.eqLines, (v) => { s.eqLines = v; update(); }),
      toggle('Eulers metode', s.euler, (v) => { s.euler = v; hSlider.row.hidden = !v; update(); }),
    ),
    hSlider.row,
    card('Husk', `
      <ul>
        <li>$y'=k\\cdot y$ har løsningerne $y=c\\cdot e^{kx}$.</li>
        <li>$y'=b-a\\cdot y$ har løsningerne $y=\\frac{b}{a}+c\\cdot e^{-ax}$.</li>
        <li>$y'=a\\cdot y\\cdot(M-y)$ har løsningerne $y=\\dfrac{M}{1+c\\cdot e^{-aMx}}$.</li>
        <li>Euler: $y_{n+1}=y_n+h\\cdot f(x_n,y_n)$</li>
      </ul>`),
  );

  function update() {
    const f = F(), { x, y } = s.P, m = f(x, y);
    const T = TYPES[s.type], p = s.p[s.type];
    const de = s.type === 'custom' ? null : T.de(p);
    const ex = s.type === 'custom' ? null : T.exact(p, x, y);
    const eqs = T.eq ? T.eq(p) : [];
    let eulerTxt = '';
    if (s.euler) {
      const pts = euler(f, x, y, s.h, 4);
      eulerTxt = `<table class="vt"><thead><tr><th>$x_n$</th><th>Euler $y_n$</th><th>Løsning</th></tr></thead><tbody>${
        pts.map(([xx, yy]) => `<tr><td>${num(xx, 2)}</td><td>${num(yy, 3)}</td><td class="muted">${xx === x ? num(y, 3) : num(rk4(f, x, y, xx, 200).at(-1)[1], 3)}</td></tr>`).join('')}</tbody></table>`;
    }
    info.innerHTML = math(`
      ${de ? `$$${de}$$` : `<p class="fn-line">${tex("y'=")} <code>${s.custom.replace(/[<>&]/g, '')}</code></p>`}
      <p class="muted">Hældningen (linjeelementet) i punktet $${pt(x, y)}$:</p>
      $$y'=${tn(m, 3)}$$
      ${ex ? `<p class="muted">Løsningen gennem punktet:</p><div class="result">$$${ex}$$</div>` : '<p class="muted">Løsningskurven er fundet numerisk.</p>'}
      ${eqs.length ? `<p>Ligevægt (vandret løsning, $y'=0$): ${eqs.map((v) => `$y=${tn(v)}$`).join(' og ')}</p>` : ''}
      ${eulerTxt}`);
    g.draw();
  }
  renderControls();
  update();
}

// ---------- opgaver ----------

const LIN_TEMPLATES = [
  { tex: 'x\\cdot y-2', f: (x, y) => x * y - 2 },
  { tex: 'x+y', f: (x, y) => x + y },
  { tex: '2x-y', f: (x, y) => 2 * x - y },
  { tex: 'y^2-x', f: (x, y) => y * y - x },
  { tex: 'x^2-2y', f: (x, y) => x * x - 2 * y },
  { tex: '3y-x\\cdot y', f: (x, y) => 3 * y - x * y },
  { tex: '\\frac{y}{x}+1', f: (x, y) => y / x + 1, xNZ: true },
];

const exercises = [
  {
    id: 'tjek',
    title: 'Er det en løsning?',
    make() {
      const v = pick(['ky', 'ky', 'bay', 'fx']);
      let de, fx, ok, why;
      if (v === 'ky') {
        const k = pick([2, 3, -1, 0.5, -2]), c = pick([2, 3, 5]);
        ok = Math.random() < 0.5;
        const k2 = ok ? k : pick([k + 1, -k, 2 * k].filter((z) => z !== k));
        de = `y'=${tn(k)}y`; fx = `${c}e^{${tn(k2)}x}`;
        why = `$$f'(x)=${tn(c * k2)}e^{${tn(k2)}x}\\qquad ${tn(k)}\\cdot f(x)=${tn(k * c)}e^{${tn(k2)}x}$$ ${ok ? 'De er ens, så $f$ er en løsning.' : 'De er forskellige, så $f$ er ikke en løsning.'}`;
      } else if (v === 'bay') {
        const a = pick([1, 2]), L = rint(2, 6), b = a * L, c = pick([3, 5, -2]);
        ok = Math.random() < 0.5;
        const sign = ok ? '-' : '';
        de = `y'=${b}-${a === 1 ? '' : a}y`; fx = `${L}${c < 0 ? '-' : '+'}${Math.abs(c)}e^{${sign}${a === 1 ? '' : a}x}`;
        why = `Indsæt i begge sider: $f'(x)=${tn(ok ? -a * c : a * c)}e^{${sign}${a === 1 ? '' : a}x}$ og $${b}-${a === 1 ? '' : a}f(x)=${b}-${a * L}${a * c < 0 ? '+' : '-'}${Math.abs(a * c)}e^{${sign}${a === 1 ? '' : a}x}=${tn(-a * c)}e^{${sign}${a === 1 ? '' : a}x}$. ${ok ? 'De er ens – det er en løsning.' : 'De er forskellige – det er ikke en løsning.'}`;
      } else {
        const a = rintNZ(-3, 4), c = rint(-5, 5);
        ok = Math.random() < 0.5;
        de = `y'=${polyTex([2 * a, 0])}`; fx = ok ? polyTex([a, 0, c]) : polyTex([2 * a, 0, c]);
        why = `$f'(x)=${ok ? polyTex([2 * a, 0]) : polyTex([4 * a, 0])}$, ${ok ? 'som er lig højresiden. Det er en løsning.' : `som ikke er lig $${polyTex([2 * a, 0])}$. Det er ikke en løsning.`}`;
      }
      return {
        prompt: `Er $f(x)=${fx}$ en løsning til differentialligningen $${de}$?`,
        choices: [{ html: 'Ja', correct: ok }, { html: 'Nej', correct: !ok }],
        hint: 'Differentiér $f$, og indsæt både $f(x)$ og $f\'(x)$ i ligningen. Er venstre og højre side ens for alle $x$?',
        solution: why,
      };
    },
  },
  {
    id: 'linjeelement',
    title: 'Linjeelementer',
    make() {
      const t = pick(LIN_TEMPLATES);
      const x0 = t.xNZ ? rintNZ(-3, 3) : rint(-3, 3), y0 = rint(-3, 3);
      return {
        prompt: `En funktion $f$ er løsning til $y'=${t.tex}$, og grafen går gennem $P${pt(x0, y0)}$. Bestem hældningen for tangenten i $P$.`,
        fields: [{ label: "f'(" + x0 + ')', answer: t.f(x0, y0) }],
        hint: 'Differentialligningen fortæller direkte hældningen: indsæt $x$ og $y$ fra punktet på højresiden.',
        solution: `$$y'=${t.tex.replace(/x/g, `(${x0})`).replace(/y/g, `(${y0})`)}=${tn(t.f(x0, y0))}$$ Linjeelementet i $P$ er $(${x0},${y0};\\,${tn(t.f(x0, y0))})$.`,
      };
    },
  },
  {
    id: 'yfx',
    title: "y' = f(x)",
    make() {
      const a = pick([2, 4, 6, -2, -4]), b = rint(-4, 4), x0 = rint(-2, 2), y0 = rint(-5, 5), x1 = rint(-3, 4);
      const F = (x) => (a / 2) * x * x + b * x;
      const c = y0 - F(x0), y1 = F(x1) + c;
      return {
        prompt: `Bestem den løsning $f$ til $y'=${polyTex([a, b])}$, hvis graf går gennem $${pt(x0, y0)}$. Beregn $f(${x1})$.`,
        fields: [{ label: `f(${x1})`, answer: y1 }],
        hint: "Når $y'=f(x)$, er løsningerne stamfunktionerne: $y=\\int f(x)\\,dx+c$. Brug punktet til at finde $c$.",
        solution: `$$y=${polyTex([a / 2, b])}+c$$ Punktet giver $${tn(y0)}=${tn(F(x0))}+c$, så $c=${tn(c)}$. $$f(${x1})=${tn(F(x1))}${plus(c)}=${tn(y1)}$$`,
      };
    },
  },
  {
    id: 'vaekst',
    title: "y' = k·y",
    make() {
      const k = pick([0.05, 0.1, 0.2, 0.3, -0.1, -0.2, 0.5]), y0 = pick([2, 5, 10, 100, 250]), x1 = rint(2, 10);
      const y1 = y0 * Math.exp(k * x1);
      return {
        prompt: `Bestem løsningen til $y'=${tn(k)}\\cdot y$ med $y(0)=${y0}$, og beregn $y(${x1})$. Afrund til to decimaler.`,
        fields: [{ label: `y(${x1})`, answer: y1, tol: 0.011 }],
        hint: '$y\'=k\\cdot y$ har den fuldstændige løsning $y=c\\cdot e^{kx}$. Begyndelsesværdien giver $c$.',
        solution: `$$y=c\\cdot e^{${tn(k)}x},\\qquad y(0)=c=${y0}$$ $$y(${x1})=${y0}\\cdot e^{${tn(k)}\\cdot ${x1}}\\approx ${tn(y1)}$$`,
      };
    },
  },
  {
    id: 'afkoling',
    title: "y' = b − a·y (afkøling)",
    make() {
      const k = pick([0.05, 0.08, 0.1, 0.15]), T0 = pick([80, 90, 95]), Tr = pick([18, 20, 22]), t = pick([5, 10, 15, 20]);
      const T = Tr + (T0 - Tr) * Math.exp(-k * t);
      if (Math.random() < 0.3) {
        return {
          prompt: `Temperaturen $T$ (i °C) af en kop te opfylder $T'=${tn(k * Tr)}-${tn(k)}\\cdot T$. Hvilken temperatur nærmer teen sig (ligevægten)?`,
          fields: [{ label: 'T', answer: Tr }],
          hint: 'I ligevægt ændrer temperaturen sig ikke: $T\'=0$.',
          solution: `$$0=${tn(k * Tr)}-${tn(k)}T\\quad\\Leftrightarrow\\quad T=\\frac{${tn(k * Tr)}}{${tn(k)}}=${Tr}$$ Teen nærmer sig rumtemperaturen ${Tr} °C.`,
        };
      }
      return {
        prompt: `En kop kaffe på $${T0}^\\circ\\text{C}$ står i et rum på $${Tr}^\\circ\\text{C}$. Temperaturen $T$ efter $t$ minutter opfylder $T'=-${tn(k)}\\cdot(T-${Tr})$. Bestem $T(${t})$. Afrund til én decimal.`,
        fields: [{ label: `T(${t})`, answer: T, tol: 0.06 }],
        hint: '$T\'=-k(T-T_r)$ har løsningen $T=T_r+c\\cdot e^{-kt}$. Find $c$ fra starttemperaturen.',
        solution: `$$T=${Tr}+c\\cdot e^{-${tn(k)}t},\\qquad T(0)=${T0}\\;\\Rightarrow\\; c=${T0 - Tr}$$ $$T(${t})=${Tr}+${T0 - Tr}\\cdot e^{-${tn(k)}\\cdot${t}}\\approx ${tn(T, 1)}$$`,
      };
    },
  },
  {
    id: 'logistisk',
    title: 'Logistisk vækst',
    make() {
      const M = pick([200, 500, 1000, 800]), a = pick([0.0002, 0.0005, 0.001, 0.002]), v = pick(['hurtigst', 'hastighed', 'baereevne']);
      const fmt = (z) => tn(z, 4);
      const de = `N'=${fmt(a)}\\cdot N\\cdot(${M}-N)`;
      if (v === 'hurtigst') return {
        prompt: `En population $N$ vokser logistisk efter $${de}$. For hvilken værdi af $N$ vokser populationen hurtigst?`,
        fields: [{ label: 'N', answer: M / 2 }],
        hint: 'Væksthastigheden $N\'$ er et andengradspolynomium i $N$. Find toppunktet.',
        solution: `$N'=${fmt(a)}N(${M}-N)$ har nulpunkterne $N=0$ og $N=${M}$, så toppunktet ligger midt imellem: $N=${M / 2}$.`,
      };
      if (v === 'baereevne') return {
        prompt: `En population $N$ vokser logistisk efter $${de}$. Hvad er bæreevnen – den værdi, populationen nærmer sig?`,
        fields: [{ label: 'M', answer: M }],
        hint: 'Find de ligevægte, hvor $N\'=0$.',
        solution: `$N'=0$ for $N=0$ og $N=${M}$. Populationen nærmer sig bæreevnen $M=${M}$.`,
      };
      const N = pick([M / 10, M / 4, M / 2, (3 * M) / 4]);
      const r = a * N * (M - N);
      return {
        prompt: `En population $N$ vokser logistisk efter $${de}$. Hvor hurtigt vokser populationen, når $N=${N}$?`,
        fields: [{ label: "N'", answer: r, rel: 0.001 }],
        hint: 'Indsæt $N$ på højresiden.',
        solution: `$$N'=${fmt(a)}\\cdot ${N}\\cdot(${M}-${N})=${tn(r, 2)}$$`,
      };
    },
  },
  {
    id: 'euler',
    title: 'Eulers metode',
    make() {
      const t = pick([
        { tex: 'x+y', f: (x, y) => x + y },
        { tex: '2y', f: (x, y) => 2 * y },
        { tex: 'y-x', f: (x, y) => y - x },
        { tex: 'x\\cdot y', f: (x, y) => x * y },
      ]);
      const h = pick([0.1, 0.5, 0.2]), y0 = pick([1, 2]);
      const y1 = y0 + h * t.f(0, y0), y2 = y1 + h * t.f(h, y1);
      return {
        prompt: `Brug Eulers metode med skridtlængde $h=${tn(h)}$ på $y'=${t.tex}$ med $y(0)=${y0}$. Beregn tilnærmelsen til $y(${tn(2 * h)})$ (to skridt).`,
        fields: [{ label: `y_2`, answer: y2, tol: 0.0006 }],
        hint: 'Euler: $y_{n+1}=y_n+h\\cdot f(x_n,y_n)$. Tag ét skridt ad gangen.',
        solution: `$$y_1=${y0}+${tn(h)}\\cdot f(0,\\,${y0})=${y0}+${tn(h)}\\cdot${par(t.f(0, y0), 4)}=${tn(y1, 4)}$$ $$y_2=${tn(y1, 4)}+${tn(h)}\\cdot f(${tn(h)},\\,${tn(y1, 4)})=${tn(y2, 4)}$$`,
      };
    },
  },
  {
    id: 'model',
    title: 'Opstil en model',
    make() {
      const k = pick([0.02, 0.05, 0.1, 0.3]);
      const cases = [
        { text: `Væksthastigheden for en bakteriekultur $y$ er proportional med antallet af bakterier, med proportionalitetsfaktor $${tn(k)}$.`, right: `y'=${tn(k)}\\cdot y` },
        { text: `En kop te køles af. Temperaturen $T$ aftager med en hastighed, der er proportional med forskellen til rummets temperatur på $20^\\circ\\text{C}$, med faktor $${tn(k)}$.`, right: `T'=-${tn(k)}\\cdot(T-20)` },
        { text: `En population $N$ vokser med en hastighed, der er proportional med både $N$ og med afstanden til bæreevnen 500, med faktor $${tn(k)}$.`, right: `N'=${tn(k)}\\cdot N\\cdot(500-N)` },
        { text: `Vandstanden $h$ i et kar stiger med en konstant hastighed på $${tn(k)}$ m pr. minut.`, right: `h'=${tn(k)}` },
      ];
      const c = pick(cases);
      const all = [`y'=${tn(k)}\\cdot y`, `T'=-${tn(k)}\\cdot(T-20)`, `N'=${tn(k)}\\cdot N\\cdot(500-N)`, `h'=${tn(k)}`];
      const wrong = { [all[0]]: [`y'=${tn(k)}`, `y'=${tn(k)}\\cdot x`, `y=${tn(k)}\\cdot y`], [all[1]]: [`T'=${tn(k)}\\cdot T`, `T'=-${tn(k)}\\cdot T+${tn(k)}`, `T'=-${tn(k)}\\cdot(20-T)`], [all[2]]: [`N'=${tn(k)}\\cdot(500-N)`, `N'=${tn(k)}\\cdot N`, `N'=500\\cdot N\\cdot(${tn(k)}-N)`], [all[3]]: [`h'=${tn(k)}\\cdot h`, `h=${tn(k)}`, `h'=${tn(k)}\\cdot t`] };
      return {
        prompt: `${c.text} Hvilken differentialligning beskriver situationen?`,
        choices: shuffle([{ html: `$${c.right}$`, correct: true }, ...wrong[c.right].map((w) => ({ html: `$${w}$` }))]),
        hint: '"Væksthastighed" er den afledede. "Proportional med" betyder "lig en konstant gange".',
        solution: `$$${c.right}$$ Venstresiden er væksthastigheden, og højresiden oversætter sætningen direkte.`,
      };
    },
  },
  {
    id: 'traeklinjeelement',
    title: 'Tegn linjeelementet',
    interactive: true,
    make() {
      const t = pick(LIN_TEMPLATES.filter((x) => !x.xNZ));
      let x0, y0, m;
      do { x0 = rint(-2, 2); y0 = rint(-2, 2); m = t.f(x0, y0); } while (Math.abs(m) > 3.5 || !Number.isInteger(m * 2));
      const st = { y: y0 + (m === 0 ? 1 : 0) };
      return {
        prompt: `Træk punktet $Q$, så stregen fra $P$ bliver linjeelementet for $y'=${t.tex}$ i $P${pt(x0, y0)}$.`,
        graph: {
          view: { xmin: x0 - 4, xmax: x0 + 4, ymin: y0 - 4, ymax: y0 + 4 },
          state: st,
          scene: (s, rev) => [
            rev && { type: 'line', x1: x0, y1: y0, x2: x0 + 1, y2: y0 + m, color: '--c3', width: 2, dash: true },
            { type: 'line', x1: x0, y1: y0, x2: x0 + 1, y2: s.y, color: '--c2', width: 2.5 },
            { type: 'vline', x: x0 + 1, color: '--g-grid', width: 1, dash: [3, 4] },
            { type: 'point', x: x0, y: y0, color: '--c1', label: 'P' },
            { type: 'point', x: x0 + 1, y: s.y, color: '--c2', label: 'Q', snap: 0.5, drag: (x, y) => { s.y = y; } },
          ],
        },
        check: (s) => near(s.y, y0 + m),
        hint: 'Beregn hældningen $y\'$ ved at indsætte punktets koordinater. $Q$ ligger 1 til højre, så den skal ligge $y\'$ højere end $P$.',
        solution: `$$y'=${tn(m)}$$ så $Q$ skal ligge i $${pt(x0 + 1, y0 + m)}$.`,
      };
    },
  },
  {
    id: 'traekligevaegt',
    title: 'Find ligevægten',
    interactive: true,
    make() {
      const a = pick([0.5, 1, 2]), L = pick([1, 1.5, 2, 2.5, 3, 4, 5]), b = a * L;
      const f = (x, y) => b - a * y;
      const st = { y: L > 2.5 ? 0.5 : 5.5 };
      return {
        prompt: `Retningsfeltet hører til $y'=${tn(b)}-${tn(a)}\\cdot y$. Træk den vandrette linje hen til <b>ligevægtsløsningen</b>.`,
        graph: {
          view: { xmin: -3, xmax: 7, ymin: -1, ymax: 7 },
          state: st,
          scene: (s, rev) => [
            ...slopeField(f, { xmin: -3, xmax: 7, ymin: -1, ymax: 7 }, 18),
            rev && { type: 'hline', y: L, color: '--c3', width: 2, dash: true },
            { type: 'hline', y: s.y, color: '--c1', width: 3 },
            { type: 'point', x: 0, y: s.y, color: '--c1', label: `y = ${num(s.y)}`, snap: 0.5, drag: (x, y) => { s.y = y; } },
          ],
        },
        check: (s) => near(s.y, L),
        hint: 'Ligevægt betyder, at $y$ ikke ændrer sig: $y\'=0$. Hvor er linjeelementerne vandrette?',
        solution: `$$0=${tn(b)}-${tn(a)}y\\quad\\Leftrightarrow\\quad y=\\frac{${tn(b)}}{${tn(a)}}=${tn(L)}$$ Over ligevægten er $y'<0$, under er $y'>0$ – løsningerne nærmer sig $y=${tn(L)}$.`,
      };
    },
  },
];

const learn = `
<h2>Hvad er en differentialligning?</h2>
<p>En <b>differentialligning</b> er en ligning, hvor den ubekendte er en <b>funktion</b>, og hvor den afledede indgår. Fx betyder $y'=2y$: "find de funktioner, hvis væksthastighed er dobbelt så stor som funktionsværdien".</p>
<p>En funktion $f$ er en <b>løsning</b>, hvis ligningen passer, når man indsætter $f(x)$ for $y$ og $f'(x)$ for $y'$.</p>
<div class="example">Er $f(x)=3e^{2x}$ en løsning til $y'=2y$? $$f'(x)=6e^{2x}\\qquad 2\\cdot f(x)=6e^{2x}$$ Ja – de to sider er ens.</div>

<h2>Fuldstændig og partikulær løsning</h2>
<p>Den <b>fuldstændige løsning</b> er alle løsninger – den indeholder en konstant $c$. Kender man et punkt på grafen (en <b>begyndelsesbetingelse</b>, fx $y(0)=5$), finder man $c$ og får den <b>partikulære løsning</b>.</p>

<h2>De fire standardtyper</h2>
<table class="vt"><thead><tr><th>Differentialligning</th><th>Fuldstændig løsning</th><th>Model</th></tr></thead><tbody>
<tr><td>$y'=f(x)$</td><td>$y=\\int f(x)\\,dx+c$</td><td>Kendt væksthastighed</td></tr>
<tr><td>$y'=k\\cdot y$</td><td>$y=c\\cdot e^{kx}$</td><td>Eksponentiel vækst/henfald</td></tr>
<tr><td>$y'=b-a\\cdot y$</td><td>$y=\\dfrac{b}{a}+c\\cdot e^{-ax}$</td><td>Forskudt eksponentiel (afkøling)</td></tr>
<tr><td>$y'=a\\cdot y\\cdot(M-y)$</td><td>$y=\\dfrac{M}{1+c\\cdot e^{-aMx}}$</td><td>Logistisk vækst med bæreevne $M$</td></tr>
</tbody></table>
<div class="example">$y'=0{,}3y$ med $y(0)=4$: $$y=c\\cdot e^{0{,}3x},\\quad y(0)=c=4,\\quad y=4e^{0{,}3x}$$</div>

<h2>Kvalitativ analyse: linjeelementer og retningsfelt</h2>
<p>Differentialligningen $y'=f(x,y)$ fortæller hældningen af løsningskurven i <i>ethvert</i> punkt. Tegner man små streger med den hældning, får man et <b>retningsfelt</b>, og løsningskurverne følger stregerne. Prøv under <b>Udforsk</b>.</p>
<ul>
  <li>Et <b>linjeelement</b> $(x_0,y_0;\\,y')$ er et punkt sammen med hældningen dér.</li>
  <li><b>Ligevægtsløsninger</b> er konstante løsninger, hvor $y'=0$, fx $y=\\frac{b}{a}$ for $y'=b-ay$ og $y=0$, $y=M$ for den logistiske.</li>
  <li>Ved logistisk vækst vokser $y$ hurtigst, når $y=\\frac{M}{2}$.</li>
</ul>

<h2>Separationsmetoden</h2>
<p>Kan ligningen skrives som $y'=g(x)\\cdot h(y)$, kan man <b>separere variablene</b>:</p>
<div class="rule">$$\\frac{dy}{dx}=g(x)\\cdot h(y)\\quad\\Rightarrow\\quad\\int\\frac{1}{h(y)}\\,dy=\\int g(x)\\,dx$$</div>
<div class="example">$y'=x\\cdot y$: $$\\int\\frac1y\\,dy=\\int x\\,dx\\;\\Rightarrow\\;\\ln|y|=\\tfrac12x^2+k\\;\\Rightarrow\\;y=c\\cdot e^{\\frac12x^2}$$</div>

<h2>Eulers metode</h2>
<p>Kan ligningen ikke løses eksakt, kan løsningen tilnærmes numerisk. Start i $(x_0,y_0)$ og gå små skridt $h$ langs linjeelementerne:</p>
<div class="rule">$$x_{n+1}=x_n+h\\qquad y_{n+1}=y_n+h\\cdot f(x_n,y_n)$$</div>
<p>Jo mindre $h$, jo bedre tilnærmelse.</p>

<h2>Opstilling af modeller</h2>
<ul>
  <li>"Væksthastigheden" eller "ændringen pr. tid" er den afledede, fx $y'$ eller $T'$.</li>
  <li>"Proportional med $y$" betyder $k\\cdot y$.</li>
  <li>"Proportional med forskellen til 20" betyder $k\\cdot(20-y)$.</li>
</ul>`;

export default {
  id: 'differentialligninger',
  title: 'Differentialligninger',
  short: 'Diff.ligninger',
  formula: "y'=k\\cdot y",
  desc: 'Løsninger og løsningskurver, retningsfelter, de fire standardtyper, separation, Eulers metode og modeller.',
  learn,
  explore,
  exercises,
};
