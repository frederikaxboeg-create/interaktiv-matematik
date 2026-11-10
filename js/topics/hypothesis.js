import { Graph } from '../graph.js';
import { el, math, slider, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, pick, shuffle, tn, num, near } from '../util.js';
import { binomPmf, binomCdf } from '../stats.js';

/** Kritisk mængde for en binomialtest. Returnerer { lo, hi }: forkast hvis X ≤ lo eller X ≥ hi. */
export function critical(n, p, alpha, alt) {
  const a = alt === 'to' ? alpha / 2 : alpha;
  let lo = -1, hi = n + 1;
  if (alt !== 'hoejre') { while (lo + 1 <= n && binomCdf(n, p, lo + 1) <= a) lo++; }
  if (alt !== 'venstre') { while (hi - 1 >= 0 && 1 - binomCdf(n, p, hi - 2) <= a) hi--; }
  return { lo, hi };
}
export function pValue(n, p, x, alt) {
  const le = binomCdf(n, p, x), ge = 1 - binomCdf(n, p, x - 1);
  return alt === 'venstre' ? le : alt === 'hoejre' ? ge : Math.min(1, 2 * Math.min(le, ge));
}
const ALT = { to: 'p\\ne p_0', venstre: 'p<p_0', hoejre: 'p>p_0' };

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { n: 50, p: 0.5, alpha: 0.05, alt: 'to', x: 33 };
  const g = new Graph(graphBox, { xmin: -1, xmax: 51, ymin: -0.01, ymax: 0.13, equalAspect: false });
  const fit = () => {
    let max = 0;
    for (let k = 0; k <= s.n; k++) max = Math.max(max, binomPmf(s.n, s.p, k));
    const mu = s.n * s.p, sdv = Math.sqrt(s.n * s.p * (1 - s.p));
    g.setView({ xmin: Math.max(-1, mu - 5 * sdv - 2), xmax: Math.min(s.n + 1, mu + 5 * sdv + 2), ymin: -max * 0.08, ymax: max * 1.25 });
  };

  g.setScene(() => {
    const { lo, hi } = critical(s.n, s.p, s.alpha, s.alt), items = [];
    for (let k = 0; k <= s.n; k++) {
      const y = binomPmf(s.n, s.p, k), crit = k <= lo || k >= hi;
      items.push({ type: 'polygon', points: [[k - 0.42, 0], [k + 0.42, 0], [k + 0.42, y], [k - 0.42, y]], color: crit ? '--c2' : '--c1', alpha: k === s.x ? 0.95 : crit ? 0.55 : 0.35, stroke: k === s.x, width: 2.5 });
    }
    items.push({ type: 'point', x: s.x, y: 0, color: '--c4', label: `x = ${s.x}`, ldy: 16, drag: (x) => { s.x = Math.max(0, Math.min(s.n, Math.round(x))); sx.set(s.x); update(); } });
    return items;
  });

  const sn = slider({ label: 'n', min: 10, max: 200, step: 1, value: s.n, format: (v) => `${v}`, onInput: (v) => { s.n = v; s.x = Math.min(s.x, v); sx.input.max = v; sx.set(s.x); fit(); update(); } });
  const sp = slider({ label: 'p_0', min: 0.05, max: 0.95, step: 0.01, value: s.p, onInput: (v) => { s.p = v; fit(); update(); } });
  const sx = slider({ label: 'x', min: 0, max: s.n, step: 1, value: s.x, format: (v) => `${v}`, onInput: (v) => { s.x = v; update(); } });
  const altCtl = segmented([{ value: 'venstre', label: 'p < p₀' }, { value: 'to', label: 'p ≠ p₀' }, { value: 'hoejre', label: 'p > p₀' }], s.alt, (v) => { s.alt = v; update(); });
  const alphaCtl = segmented([{ value: '0.05', label: 'α = 5 %' }, { value: '0.01', label: 'α = 1 %' }, { value: '0.1', label: 'α = 10 %' }], String(s.alpha), (v) => { s.alpha = Number(v); update(); });
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Søjlerne er fordelingen af $X$, hvis nulhypotesen er sand. Orange søjler er det <b>kritiske område</b>. Træk i observationen $x$.'),
    el('div', { class: 'sliders' }, sn.row, sp.row), altCtl, alphaCtl, el('div', { class: 'sliders' }, sx.row), info,
    card('Husk', `
      <ul>
        <li>$H_0$: $p=p_0$. Alternativ $H_1$: $p\\ne p_0$, $p<p_0$ eller $p>p_0$.</li>
        <li><b>p-værdi</b>: sandsynligheden for et resultat, der er mindst lige så ekstremt som det observerede, hvis $H_0$ er sand.</li>
        <li>p-værdi $<\\alpha$ (eller $x$ i det kritiske område): <b>forkast</b> $H_0$.</li>
      </ul>`),
  );

  function update() {
    const { n, p, alpha, alt, x } = s;
    const { lo, hi } = critical(n, p, alpha, alt), pv = pValue(n, p, x, alt);
    const crit = [lo >= 0 ? `\\{0,\\dots,${lo}\\}` : null, hi <= n ? `\\{${hi},\\dots,${n}\\}` : null].filter(Boolean).join('\\cup') || '\\emptyset';
    const reject = pv < alpha;
    const pvTex = alt === 'venstre' ? `P(X\\le ${x})` : alt === 'hoejre' ? `P(X\\ge ${x})` : `2\\cdot\\min\\big(P(X\\le ${x}),\\,P(X\\ge ${x})\\big)`;
    info.innerHTML = math(`
      $$H_0:\\;p=${tn(p)}\\qquad H_1:\\;${ALT[alt].replace('p_0', tn(p))}$$
      $$X\\sim b(${n},\\,${tn(p)}),\\qquad E(X)=${tn(n * p)}$$
      <p class="muted">Kritisk mængde ved signifikansniveau $${tn(alpha * 100)}\\,\\%$:</p>$$K=${crit}$$
      <p class="muted">p-værdi for observationen $x=${x}$:</p>$$${pvTex}\\approx ${tn(pv, 4)}$$
      <p><span class="badge ${reject ? 'b-bad' : 'b-ok'}">${reject ? 'forkast H₀' : 'forkast ikke H₀'}</span> ${reject ? `p-værdien er mindre end $${tn(alpha)}$ – resultatet er <b>signifikant</b>.` : `p-værdien er større end $${tn(alpha)}$ – der er ikke belæg for at forkaste $H_0$.`}</p>`);
    g.draw();
  }
  fit();
  update();
}

// ---------- opgaver ----------
const CONTEXTS = [
  { txt: 'En mønt påstås at være fair. Den kastes $n$ gange, og der kommer $x$ gange plat.', p: 0.5 },
  { txt: 'En terning påstås at være fair. Den kastes $n$ gange, og der kommer $x$ seksere.', p: 1 / 6 },
  { txt: 'Et firma påstår, at 20 % af kunderne er utilfredse. Blandt $n$ adspurgte er $x$ utilfredse.', p: 0.2 },
  { txt: 'Det oplyses, at 30 % af eleverne cykler i skole. I en stikprøve på $n$ elever cykler $x$.', p: 0.3 },
];
const pTex = (p) => (Math.abs(p - 1 / 6) < 1e-9 ? '\\tfrac16' : tn(p));

const exercises = [
  {
    id: 'hypoteser',
    title: 'Opstil hypoteserne',
    make() {
      const c = pick(CONTEXTS);
      const right = `$H_0:\\;p=${pTex(c.p)}$`;
      return {
        prompt: `${c.txt.replace('$n$', 'nogle').replace('$x$', 'et antal')} Hvad er nulhypotesen?`,
        choices: shuffle([
          { html: right, correct: true },
          { html: `$H_0:\\;p\\ne${pTex(c.p)}$` },
          { html: `$H_0:\\;p>${pTex(c.p)}$` },
          { html: '$H_0:\\;x=n$' },
        ]),
        hint: 'Nulhypotesen er påstanden, man tester – den "kedelige" antagelse om sandsynligheden.',
        solution: `Nulhypotesen er påstanden: ${right}. Alternativhypotesen er typisk $H_1:\\;p\\ne${pTex(c.p)}$.`,
      };
    },
  },
  {
    id: 'pvaerdi',
    title: 'Beregn p-værdien',
    make() {
      const c = pick(CONTEXTS), n = pick([20, 30, 40, 50]), mu = n * c.p;
      const high = Math.random() < 0.5;
      const x = high ? Math.round(mu + rint(2, 6)) : Math.max(0, Math.round(mu - rint(2, 5)));
      const pv = high ? 1 - binomCdf(n, c.p, x - 1) : binomCdf(n, c.p, x);
      return {
        prompt: `${c.txt.replace('$n$', `$${n}$`).replace('$x$', `$${x}$`)} Test $H_0: p=${pTex(c.p)}$ mod $H_1: p${high ? '>' : '<'}${pTex(c.p)}$. Bestem p-værdien. Afrund til fire decimaler.`,
        fields: [{ label: 'p\\text{-værdi}', answer: pv, tol: 0.00006 }],
        hint: `Under $H_0$ er $X\\sim b(${n},\\,${pTex(c.p)})$. p-værdien er $P(X${high ? '\\ge' : '\\le'} ${x})$.`,
        solution: `$$P(X${high ? '\\ge' : '\\le'} ${x})${high ? `=1-P(X\\le ${x - 1})` : ''}\\approx ${tn(pv, 4)}$$`,
      };
    },
  },
  {
    id: 'konklusion',
    title: 'Konklusion',
    make() {
      const alpha = pick([0.05, 0.01]), pv = pick([0.003, 0.021, 0.038, 0.072, 0.18, 0.0004, 0.012]);
      const reject = pv < alpha;
      return {
        prompt: `En hypotesetest giver p-værdien $${tn(pv, 4)}$. Signifikansniveauet er $${tn(alpha * 100)}\\,\\%$. Hvad er konklusionen?`,
        choices: [
          { html: 'Nulhypotesen forkastes.', correct: reject },
          { html: 'Nulhypotesen forkastes ikke.', correct: !reject },
        ],
        hint: 'Sammenlign p-værdien med signifikansniveauet $\\alpha$.',
        solution: `$${tn(pv, 4)}${reject ? '<' : '\\ge'}${tn(alpha)}$, så nulhypotesen ${reject ? 'forkastes – resultatet er signifikant' : 'forkastes ikke – resultatet kan skyldes tilfældigheder'}.`,
      };
    },
  },
  {
    id: 'kritisk',
    title: 'Kritisk mængde',
    make() {
      const n = pick([20, 25, 30, 40, 50]), p = pick([0.5, 0.3, 0.2, 0.4]), alpha = 0.05;
      const { hi } = critical(n, p, alpha, 'hoejre');
      return {
        prompt: `$X\\sim b(${n},\\,${tn(p)})$ under $H_0$. Testen er højresidet ($H_1: p>${tn(p)}$) med signifikansniveau $5\\,\\%$. Hvad er det mindste antal $k$, så $X\\ge k$ ligger i det kritiske område?`,
        fields: [{ label: 'k', answer: hi }],
        hint: 'Find det mindste $k$ med $P(X\\ge k)\\le 0{,}05$.',
        solution: `$$P(X\\ge ${hi - 1})\\approx ${tn(1 - binomCdf(n, p, hi - 2), 4)}>0{,}05,\\qquad P(X\\ge ${hi})\\approx ${tn(1 - binomCdf(n, p, hi - 1), 4)}\\le0{,}05$$ Det kritiske område er $\\{${hi},\\dots,${n}\\}$.`,
      };
    },
  },
  {
    id: 'estimat',
    title: 'Estimat og konfidensinterval',
    make() {
      const n = pick([100, 200, 400, 500, 1000]), x = Math.round(n * (0.1 + Math.random() * 0.6));
      const ph = x / n, half = 1.96 * Math.sqrt((ph * (1 - ph)) / n);
      return {
        prompt: `I en stikprøve på $${n}$ personer svarer $${x}$ ja. Bestem et estimat $\\hat p$ for andelen og et $95\\,\\%$-konfidensinterval. Afrund til tre decimaler.`,
        fields: [{ label: '\\hat p', answer: ph, tol: 0.0006 }, { label: '\\text{nedre}', answer: ph - half, tol: 0.0011 }, { label: '\\text{øvre}', answer: ph + half, tol: 0.0011 }],
        hint: '$\\hat p=\\dfrac{x}{n}$ og $95\\,\\%$-konfidensintervallet er $\\hat p\\pm1{,}96\\sqrt{\\dfrac{\\hat p(1-\\hat p)}{n}}$.',
        solution: `$$\\hat p=\\frac{${x}}{${n}}=${tn(ph, 3)},\\qquad ${tn(ph, 3)}\\pm1{,}96\\sqrt{\\frac{${tn(ph, 3)}\\cdot${tn(1 - ph, 3)}}{${n}}}=${tn(ph, 3)}\\pm${tn(half, 3)}$$ Intervallet er $[${tn(ph - half, 3)};\\,${tn(ph + half, 3)}]$.`,
      };
    },
  },
  {
    id: 'fejltype',
    title: 'Type I- og type II-fejl',
    make() {
      const t1 = Math.random() < 0.5;
      return {
        prompt: `Hvad er en <b>type ${t1 ? 'I' : 'II'}-fejl</b>?`,
        choices: shuffle([
          { html: 'At forkaste $H_0$, selvom $H_0$ er sand.', correct: t1 },
          { html: 'At undlade at forkaste $H_0$, selvom $H_0$ er falsk.', correct: !t1 },
          { html: 'At forkaste $H_0$, når $H_0$ er falsk.' },
          { html: 'At regne p-værdien forkert.' },
        ]),
        solution: 'Type I-fejl: $H_0$ forkastes, selvom den er sand (sandsynligheden er højst $\\alpha$). Type II-fejl: $H_0$ forkastes ikke, selvom den er falsk.',
      };
    },
  },
  {
    id: 'traekkritisk',
    title: 'Find det kritiske område',
    interactive: true,
    make() {
      const n = pick([20, 30, 40]), p = pick([0.5, 0.3, 0.4]);
      const { hi } = critical(n, p, 0.05, 'hoejre');
      const st = { k: Math.round(n * p) };
      let max = 0;
      for (let k = 0; k <= n; k++) max = Math.max(max, binomPmf(n, p, k));
      return {
        prompt: `$X\\sim b(${n},\\,${tn(p)})$. Træk grænsen, så de orange søjler bliver det kritiske område for en <b>højresidet</b> test med signifikansniveau $5\\,\\%$.`,
        graph: {
          view: { xmin: -1, xmax: n + 1, ymin: -max * 0.1, ymax: max * 1.25, equalAspect: false },
          state: st,
          scene: (s) => {
            const items = [];
            for (let k = 0; k <= n; k++) {
              const y = binomPmf(n, p, k);
              items.push({ type: 'polygon', points: [[k - 0.42, 0], [k + 0.42, 0], [k + 0.42, y], [k - 0.42, y]], color: k >= s.k ? '--c2' : '--c1', alpha: k >= s.k ? 0.6 : 0.35 });
            }
            items.push({ type: 'point', x: s.k - 0.5, y: 0, color: '--c4', label: `P(X ≥ ${s.k}) ≈ ${num(1 - binomCdf(n, p, s.k - 1), 4)}`, ldy: -18, drag: (x) => { s.k = Math.max(1, Math.min(n, Math.round(x + 0.5))); } });
            return items;
          },
        },
        check: (s) => s.k === hi,
        hint: 'Det kritiske område skal være så stort som muligt, men sandsynligheden for at havne i det må højst være $5\\,\\%$.',
        solution: `$P(X\\ge ${hi})\\approx ${tn(1 - binomCdf(n, p, hi - 1), 4)}\\le0{,}05$, men $P(X\\ge ${hi - 1})\\approx ${tn(1 - binomCdf(n, p, hi - 2), 4)}>0{,}05$. Det kritiske område er $\\{${hi},\\dots,${n}\\}$.`,
      };
    },
  },
];

const learn = `
<h2>Idéen i en hypotesetest</h2>
<p>Man har en påstand om en sandsynlighed $p$ – fx "mønten er fair, $p=0{,}5$". Man laver $n$ forsøg og tæller antallet $x$ af successer. Er resultatet så usandsynligt, at påstanden ikke er troværdig?</p>
<ol>
  <li><b>Nulhypotese</b> $H_0:\\;p=p_0$ og <b>alternativhypotese</b> $H_1$: $p\\ne p_0$ (tosidet), $p<p_0$ eller $p>p_0$ (ensidet).</li>
  <li>Vælg et <b>signifikansniveau</b> $\\alpha$, typisk $5\\,\\%$.</li>
  <li>Under $H_0$ er antallet $X\\sim b(n,\\,p_0)$.</li>
  <li>Beregn <b>p-værdien</b> – eller find det <b>kritiske område</b>.</li>
  <li><b>Konklusion</b>: forkast $H_0$, hvis p-værdien er mindre end $\\alpha$.</li>
</ol>

<h2>p-værdi</h2>
<p>p-værdien er sandsynligheden – hvis $H_0$ er sand – for at få et resultat, der er <i>mindst lige så ekstremt</i> som det observerede:</p>
<div class="rule">$$p>p_0:\\;P(X\\ge x)\\qquad p<p_0:\\;P(X\\le x)\\qquad p\\ne p_0:\\;2\\cdot\\min\\big(P(X\\le x),P(X\\ge x)\\big)$$</div>
<div class="example">En mønt kastes 50 gange og giver 33 plat. Tosidet test: $$2\\cdot P(X\\ge33)\\approx 2\\cdot0{,}0164=0{,}0328<0{,}05$$ Nulhypotesen forkastes – mønten er næppe fair.</div>

<h2>Kritisk område (forkastelsesområde)</h2>
<p>Det kritiske område er de værdier af $X$, der får os til at forkaste $H_0$. Det vælges så stort som muligt, men så sandsynligheden for at havne i det (når $H_0$ er sand) højst er $\\alpha$ – ved tosidet test $\\frac\\alpha2$ i hver side. Resten er <b>acceptområdet</b>.</p>

<h2>Fejltyper</h2>
<ul>
  <li><b>Type I-fejl</b>: $H_0$ forkastes, selvom den er sand. Sandsynligheden er højst $\\alpha$.</li>
  <li><b>Type II-fejl</b>: $H_0$ forkastes ikke, selvom den er falsk.</li>
</ul>

<h2>Estimation af $p$</h2>
<p>Den bedste gæt på den ukendte sandsynlighed er $\\hat p=\\dfrac{x}{n}$. Et $95\\,\\%$-<b>konfidensinterval</b> er</p>
<div class="rule">$$\\hat p\\pm1{,}96\\sqrt{\\frac{\\hat p(1-\\hat p)}{n}}$$</div>`;

export default {
  id: 'hypotesetest',
  title: 'Hypotesetest',
  short: 'Hypotesetest',
  formula: 'H_0:\\;p=p_0',
  desc: 'Nul- og alternativhypotese, signifikansniveau, p-værdi, kritisk område, fejltyper og konfidensinterval for p.',
  learn,
  explore,
  exercises,
};
