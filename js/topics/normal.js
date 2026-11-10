import { Graph } from '../graph.js';
import { el, math, slider, toggle, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, pick, shuffle, tn, num, near, clamp } from '../util.js';
import { binom } from './probability.js';

// ---------- matematik ----------
const SQ2PI = Math.sqrt(2 * Math.PI);
export const density = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s)) / (s * SQ2PI);

/** Fejlfunktionen (Abramowitz & Stegun 7.1.26, fejl < 1,5·10⁻⁷). */
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
/** Fordelingsfunktionen P(X ≤ x) for N(μ, σ). */
export const cdf = (x, mu = 0, s = 1) => (x === Infinity ? 1 : x === -Infinity ? 0 : 0.5 * (1 + erf((x - mu) / (s * Math.SQRT2))));

/** Omvendt standardnormalfordeling (Acklams algoritme). */
export function invPhi(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425, hi = 1 - lo;
  let q, r;
  if (p < lo) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > hi) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ---------- udforsk ----------
function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { mode: 'normal', mu: 0, sigma: 1, a: -1, b: 1, kind: 'between', bands: false, std: false, n: 40, p: 0.3 };
  const g = new Graph(graphBox, { xmin: -4, xmax: 4, ymin: -0.04, ymax: 0.5, equalAspect: false });

  const fit = () => {
    if (s.mode === 'normal') {
      const peak = density(s.mu, s.mu, s.sigma);
      g.setView({ xmin: s.mu - 4.2 * s.sigma, xmax: s.mu + 4.2 * s.sigma, ymin: -peak * 0.09, ymax: peak * 1.25 });
    } else {
      const mu = s.n * s.p, sd = Math.sqrt(s.n * s.p * (1 - s.p));
      let max = 0;
      for (let k = 0; k <= s.n; k++) max = Math.max(max, binom(s.n, s.p, k));
      max = Math.max(max, density(mu, mu, sd));
      g.setView({ xmin: Math.max(-1, mu - 5 * sd), xmax: Math.min(s.n + 1, mu + 5 * sd), ymin: -max * 0.08, ymax: max * 1.2 });
    }
  };
  const range = () => (s.kind === 'le' ? [-Infinity, s.b] : s.kind === 'ge' ? [s.a, Infinity] : [s.a, s.b]);

  g.setScene(() => {
    const v = g.view;
    if (s.mode === 'binom') {
      const mu = s.n * s.p, sd = Math.sqrt(s.n * s.p * (1 - s.p));
      const items = [];
      for (let k = 0; k <= s.n; k++) {
        const y = binom(s.n, s.p, k);
        items.push({ type: 'polygon', points: [[k - 0.45, 0], [k + 0.45, 0], [k + 0.45, y], [k - 0.45, y]], color: '--c1', alpha: 0.4 });
      }
      items.push({ type: 'fn', f: (x) => density(x, mu, sd), color: '--c2', width: 3 });
      items.push({ type: 'vline', x: mu, color: '--c3', width: 1.5, dash: true });
      return items;
    }
    const f = (x) => density(x, s.mu, s.sigma);
    const [lo, hi] = range();
    const items = [];
    if (s.bands) {
      [[3, '--c4', 0.07], [2, '--c5', 0.1], [1, '--c3', 0.14]].forEach(([k, c, al]) => {
        items.push({ type: 'area', f, a: s.mu - k * s.sigma, b: s.mu + k * s.sigma, color: c, alpha: al });
      });
    } else {
      items.push({ type: 'area', f, a: Math.max(lo, v.xmin - 1), b: Math.min(hi, v.xmax + 1), color: '--c1', alpha: 0.3 });
    }
    if (s.std) items.push({ type: 'fn', f: (x) => density(x, 0, 1), color: '--g-axis', width: 1.5, dash: true });
    items.push({ type: 'fn', f, color: '--c1', width: 3 });
    items.push({ type: 'vline', x: s.mu, color: '--c3', width: 1.5, dash: true });
    // vendetangenter ved μ ± σ
    for (const k of [-1, 1]) items.push({ type: 'point', x: s.mu + k * s.sigma, y: f(s.mu + k * s.sigma), color: '--c3', r: 3.5 });
    if (!s.bands) {
      if (s.kind !== 'le') items.push({ type: 'point', x: s.a, y: 0, color: '--c2', label: `a = ${num(s.a)}`, ldy: 16, drag: (x) => { s.a = Math.round(x * 10) / 10; if (s.kind === 'between' && s.a > s.b) s.b = s.a; update(); } });
      if (s.kind !== 'ge') items.push({ type: 'point', x: s.b, y: 0, color: '--c2', label: `b = ${num(s.b)}`, ldy: 16, drag: (x) => { s.b = Math.round(x * 10) / 10; if (s.kind === 'between' && s.b < s.a) s.a = s.b; update(); } });
    }
    return items;
  });

  const modeCtl = segmented([{ value: 'normal', label: 'Normalfordeling' }, { value: 'binom', label: 'Binomial ≈ normal' }], s.mode, (v) => {
    s.mode = v; normalBox.hidden = v !== 'normal'; binomBox.hidden = v !== 'binom'; fit(); update();
  });
  const sMu = slider({ label: '\\mu', min: -10, max: 200, step: 0.5, value: s.mu, onInput: (v) => { const d = v - s.mu; s.mu = v; s.a += d; s.b += d; fit(); update(); } });
  const sSigma = slider({ label: '\\sigma', min: 0.2, max: 30, step: 0.1, value: s.sigma, onInput: (v) => { const r = v / s.sigma; s.a = s.mu + (s.a - s.mu) * r; s.b = s.mu + (s.b - s.mu) * r; s.sigma = v; fit(); update(); } });
  const kindCtl = segmented([{ value: 'le', label: 'P(X ≤ b)' }, { value: 'between', label: 'P(a ≤ X ≤ b)' }, { value: 'ge', label: 'P(X ≥ a)' }], s.kind, (v) => { s.kind = v; update(); });
  const normalBox = el('div', { class: 'explore-panel' },
    el('div', { class: 'sliders' }, sMu.row, sSigma.row),
    kindCtl,
    el('div', { class: 'toggles' },
      toggle('68–95–99,7-reglen', s.bands, (v) => { s.bands = v; update(); }),
      toggle('Vis standardnormalfordelingen N(0, 1)', s.std, (v) => { s.std = v; update(); }),
    ));
  const sN = slider({ label: 'n', min: 5, max: 150, step: 1, value: s.n, format: (v) => `${v}`, onInput: (v) => { s.n = v; fit(); update(); } });
  const sP = slider({ label: 'p', min: 0.02, max: 0.98, step: 0.01, value: s.p, onInput: (v) => { s.p = v; fit(); update(); } });
  const binomBox = el('div', { class: 'sliders', hidden: true }, sN.row, sP.row);
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Træk grænserne $a$ og $b$ langs $x$-aksen. Det farvede areal er sandsynligheden.'),
    modeCtl, normalBox, binomBox, info,
    card('Husk', `
      <ul>
        <li>Arealet under tæthedsfunktionen er sandsynligheden – hele arealet er 1.</li>
        <li>$\\mu$ er midten (middelværdien), $\\sigma$ er afstanden fra midten ud til vendepunkterne.</li>
        <li>$P(X\\le b)=\\Phi\\left(\\frac{b-\\mu}{\\sigma}\\right)$ og $P(a\\le X\\le b)=P(X\\le b)-P(X\\le a)$</li>
        <li>For en kontinuert fordeling er $P(X=a)=0$, så $\\le$ og $<$ giver det samme.</li>
      </ul>`),
  );

  function update() {
    if (s.mode === 'binom') {
      const mu = s.n * s.p, sd = Math.sqrt(s.n * s.p * (1 - s.p));
      const ok = sd > 3;
      info.innerHTML = math(`
        $$X\\sim b(${s.n},\\,${tn(s.p)})$$
        $$\\mu=n\\cdot p=${tn(mu)},\\qquad \\sigma=\\sqrt{n\\,p\\,(1-p)}=${tn(sd)}$$
        <p><span class="badge ${ok ? 'b-ok' : 'b-bad'}">σ ${ok ? '&gt;' : '≤'} 3</span> ${ok ? 'Binomialfordelingen kan tilnærmes godt med en normalfordeling.' : 'Tilnærmelsen er dårlig – fordelingen er for skæv eller smal. Gør $n$ større.'}</p>
        <p class="muted">Søjlerne er binomialfordelingen, kurven er normalfordelingen med samme $\\mu$ og $\\sigma$.</p>`);
      g.draw();
      return;
    }
    const { mu, sigma } = s;
    let body;
    if (s.bands) {
      body = `<table class="vt"><tbody>
        <tr><td>$\\mu\\pm\\sigma$</td><td>$${tn(mu - sigma)}$ til $${tn(mu + sigma)}$</td><td><b>≈ 68,3 %</b></td></tr>
        <tr><td>$\\mu\\pm2\\sigma$</td><td>$${tn(mu - 2 * sigma)}$ til $${tn(mu + 2 * sigma)}$</td><td><b>≈ 95,4 %</b></td></tr>
        <tr><td>$\\mu\\pm3\\sigma$</td><td>$${tn(mu - 3 * sigma)}$ til $${tn(mu + 3 * sigma)}$</td><td><b>≈ 99,7 %</b></td></tr></tbody></table>`;
    } else {
      const [lo, hi] = range();
      const P = cdf(hi, mu, sigma) - cdf(lo, mu, sigma);
      const z = (x) => (x - mu) / sigma;
      const lbl = s.kind === 'le' ? `P(X\\le ${tn(hi)})` : s.kind === 'ge' ? `P(X\\ge ${tn(lo)})` : `P(${tn(lo)}\\le X\\le ${tn(hi)})`;
      const how = s.kind === 'le' ? `\\Phi\\left(\\frac{${tn(hi)}-${tn(mu)}}{${tn(sigma)}}\\right)=\\Phi(${tn(z(hi))})`
        : s.kind === 'ge' ? `1-\\Phi(${tn(z(lo))})` : `\\Phi(${tn(z(hi))})-\\Phi(${tn(z(lo))})`;
      body = `$$${lbl}=${how}$$<div class="result">$$${lbl}\\approx ${tn(P, 4)}=${tn(P * 100, 2)}\\,\\%$$</div>`;
    }
    info.innerHTML = math(`
      $$X\\sim N(${tn(mu)},\\,${tn(sigma)})\\qquad f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$
      ${body}`);
    g.draw();
  }
  fit();
  update();
}

// ---------- opgaver ----------

const CONTEXTS = [
  { what: 'Højden af danske mænd', unit: 'cm', mu: 181, sigma: 7 },
  { what: 'Højden af danske kvinder', unit: 'cm', mu: 168, sigma: 6 },
  { what: 'Vægten af en pose kaffe', unit: 'g', mu: 500, sigma: 4 },
  { what: 'Tiden det tager at cykle i skole', unit: 'min', mu: 18, sigma: 3 },
  { what: 'Resultatet i en test', unit: 'point', mu: 60, sigma: 12 },
  { what: 'Fødselsvægten af nyfødte', unit: 'g', mu: 3500, sigma: 500 },
];
const ctx = () => pick(CONTEXTS);
const offset = (c) => c.mu + pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]) * c.sigma;

const exercises = [
  {
    id: 'mindre',
    title: 'P(X ≤ a)',
    make() {
      const c = ctx(), a = Math.round(offset(c));
      const P = cdf(a, c.mu, c.sigma), z = (a - c.mu) / c.sigma;
      return {
        prompt: `${c.what} er normalfordelt med $\\mu=${c.mu}$ ${c.unit} og $\\sigma=${c.sigma}$ ${c.unit}. Bestem sandsynligheden for, at en tilfældig værdi er <b>højst</b> $${a}$ ${c.unit}. Afrund til fire decimaler.`,
        fields: [{ label: `P(X\\le ${a})`, answer: P, tol: 0.0006 }],
        hint: 'Standardisér: $z=\\dfrac{a-\\mu}{\\sigma}$, og find $\\Phi(z)$ – eller brug normalfordelingen i CAS.',
        solution: `$$z=\\frac{${a}-${c.mu}}{${c.sigma}}=${tn(z, 4)},\\qquad P(X\\le ${a})=\\Phi(${tn(z, 4)})\\approx ${tn(P, 4)}$$`,
      };
    },
  },
  {
    id: 'mellem',
    title: 'P(a ≤ X ≤ b)',
    make() {
      const c = ctx();
      let a = Math.round(offset(c)), b = Math.round(offset(c));
      if (a > b) [a, b] = [b, a];
      if (a === b) b += Math.max(1, Math.round(c.sigma / 2));
      const P = cdf(b, c.mu, c.sigma) - cdf(a, c.mu, c.sigma);
      return {
        prompt: `${c.what} er normalfordelt med $\\mu=${c.mu}$ og $\\sigma=${c.sigma}$ (${c.unit}). Bestem sandsynligheden for en værdi mellem $${a}$ og $${b}$ ${c.unit}. Afrund til fire decimaler.`,
        fields: [{ label: `P(${a}\\le X\\le ${b})`, answer: P, tol: 0.0006 }],
        hint: '$P(a\\le X\\le b)=P(X\\le b)-P(X\\le a)$',
        solution: `$$P(X\\le ${b})-P(X\\le ${a})\\approx ${tn(cdf(b, c.mu, c.sigma), 4)}-${tn(cdf(a, c.mu, c.sigma), 4)}=${tn(P, 4)}$$`,
      };
    },
  },
  {
    id: 'stoerre',
    title: 'P(X ≥ a)',
    make() {
      const c = ctx(), a = Math.round(offset(c));
      const P = 1 - cdf(a, c.mu, c.sigma);
      return {
        prompt: `${c.what} er normalfordelt med $\\mu=${c.mu}$ og $\\sigma=${c.sigma}$ (${c.unit}). Hvor stor en andel er <b>mindst</b> $${a}$ ${c.unit}? Afrund til fire decimaler.`,
        fields: [{ label: `P(X\\ge ${a})`, answer: P, tol: 0.0006 }],
        hint: 'Brug komplementærhændelsen: $P(X\\ge a)=1-P(X\\le a)$.',
        solution: `$$P(X\\ge ${a})=1-P(X\\le ${a})\\approx 1-${tn(cdf(a, c.mu, c.sigma), 4)}=${tn(P, 4)}$$`,
      };
    },
  },
  {
    id: 'tommelfinger',
    title: '68–95–99,7-reglen',
    make() {
      const k = pick([1, 2, 3]), c = ctx();
      const right = { 1: '68\\,\\%', 2: '95\\,\\%', 3: '99{,}7\\,\\%' }[k];
      return {
        prompt: `${c.what} er normalfordelt med $\\mu=${c.mu}$ og $\\sigma=${c.sigma}$ (${c.unit}). Cirka hvor stor en andel ligger mellem $${c.mu - k * c.sigma}$ og $${c.mu + k * c.sigma}$ ${c.unit}?`,
        choices: shuffle(['50\\,\\%', '68\\,\\%', '95\\,\\%', '99{,}7\\,\\%'].map((o) => ({ html: `$${o}$`, correct: o === right }))),
        hint: `Intervallet er $\\mu\\pm${k === 1 ? '' : k}\\sigma$. Husk tommelfingerreglen 68–95–99,7.`,
        solution: `Intervallet er $\\mu\\pm${k === 1 ? '' : k}\\sigma$, og der ligger ca. $${right}$ af værdierne.`,
      };
    },
  },
  {
    id: 'fraktil',
    title: 'Find grænsen (fraktil)',
    make() {
      const c = ctx(), p = pick([0.1, 0.2, 0.25, 0.75, 0.8, 0.9, 0.95, 0.05]);
      const a = c.mu + c.sigma * invPhi(p);
      return {
        prompt: `${c.what} er normalfordelt med $\\mu=${c.mu}$ og $\\sigma=${c.sigma}$ (${c.unit}). Bestem den værdi $a$, så $${tn(p * 100)}\\,\\%$ ligger under $a$. Afrund til én decimal.`,
        fields: [{ label: 'a', answer: a, tol: 0.06 }],
        hint: `Find $z$, så $\\Phi(z)=${tn(p)}$, og regn tilbage: $a=\\mu+z\\cdot\\sigma$.`,
        solution: `$$\\Phi(z)=${tn(p)}\\;\\Rightarrow\\; z\\approx ${tn(invPhi(p), 4)}$$ $$a=${c.mu}+${tn(invPhi(p), 4)}\\cdot ${c.sigma}\\approx ${tn(a, 1)}$$`,
      };
    },
  },
  {
    id: 'standardiser',
    title: 'Standardisering',
    make() {
      const c = ctx(), x = Math.round(offset(c));
      const z = (x - c.mu) / c.sigma;
      return {
        prompt: `${c.what} er normalfordelt med $\\mu=${c.mu}$ og $\\sigma=${c.sigma}$. Hvor mange standardafvigelser ligger værdien $${x}$ fra middelværdien? (Bestem $z$ – brug minus, hvis den ligger under.)`,
        fields: [{ label: 'z', answer: z, tol: 0.011 }],
        hint: '$z=\\dfrac{x-\\mu}{\\sigma}$',
        solution: `$$z=\\frac{${x}-${c.mu}}{${c.sigma}}=${tn(z, 2)}$$`,
      };
    },
  },
  {
    id: 'aflaes',
    title: 'Aflæs μ og σ',
    make() {
      const mu = rint(-3, 4), sigma = pick([0.5, 1, 1.5, 2]);
      const f = (x) => density(x, mu, sigma), peak = f(mu);
      return {
        prompt: 'Grafen viser tæthedsfunktionen for en normalfordeling. Aflæs middelværdien $\\mu$ og spredningen $\\sigma$.',
        graph: {
          view: { xmin: -9, xmax: 9, ymin: -peak * 0.1, ymax: peak * 1.3, equalAspect: false },
          scene: (st, rev) => [
            { type: 'fn', f, color: '--c1', width: 3 },
            rev && { type: 'vline', x: mu, color: '--c3', width: 1.5, dash: true },
            rev && { type: 'point', x: mu - sigma, y: f(mu - sigma), color: '--c2', label: 'vendepunkt' },
            rev && { type: 'point', x: mu + sigma, y: f(mu + sigma), color: '--c2' },
          ],
        },
        fields: [{ label: '\\mu', answer: mu }, { label: '\\sigma', answer: sigma }],
        hint: '$\\mu$ er der, hvor toppen er. $\\sigma$ er afstanden fra toppen ud til <b>vendepunkterne</b>, hvor kurven skifter fra at krumme nedad til opad.',
        solution: `Toppen er ved $x=${tn(mu)}$, så $\\mu=${tn(mu)}$. Vendepunkterne ligger ved $${tn(mu - sigma)}$ og $${tn(mu + sigma)}$, så $\\sigma=${tn(sigma)}$.`,
      };
    },
  },
  {
    id: 'binomtilnaerm',
    title: 'Binomial ≈ normal',
    make() {
      const n = pick([100, 200, 400, 500, 1000]), p = pick([0.1, 0.2, 0.25, 0.4, 0.5]);
      const mu = n * p, sd = Math.sqrt(n * p * (1 - p));
      return {
        prompt: `$X$ er binomialfordelt med $n=${n}$ og $p=${tn(p)}$. Den skal tilnærmes med en normalfordeling. Bestem $\\mu$ og $\\sigma$. Afrund $\\sigma$ til to decimaler.`,
        fields: [{ label: '\\mu', answer: mu }, { label: '\\sigma', answer: sd, tol: 0.011 }],
        hint: 'Brug binomialfordelingens middelværdi og spredning: $\\mu=np$ og $\\sigma=\\sqrt{np(1-p)}$.',
        solution: `$$\\mu=${n}\\cdot${tn(p)}=${tn(mu)},\\qquad \\sigma=\\sqrt{${n}\\cdot${tn(p)}\\cdot${tn(1 - p)}}\\approx ${tn(sd)}$$ Da $\\sigma>3$, er tilnærmelsen god.`,
      };
    },
  },
  {
    id: 'traekgraense',
    title: 'Træk grænsen',
    interactive: true,
    make() {
      const mu = rint(-2, 2) * 2, sigma = pick([1, 2]), k = pick([-2, -1, 1, 2, 0]);
      const b = mu + k * sigma, P = cdf(b, mu, sigma);
      const f = (x) => density(x, mu, sigma), peak = f(mu);
      const st = { b: mu + (k === 0 ? 1.5 : -k * 0.5) * sigma };
      return {
        prompt: `$X\\sim N(${mu},\\,${sigma})$. Træk grænsen $b$, så $P(X\\le b)\\approx ${tn(P, 4)}$.`,
        graph: {
          view: { xmin: mu - 4.5 * sigma, xmax: mu + 4.5 * sigma, ymin: -peak * 0.1, ymax: peak * 1.25, equalAspect: false },
          state: st,
          scene: (s, rev) => [
            { type: 'area', f, a: mu - 6 * sigma, b: s.b, color: '--c1', alpha: 0.3 },
            { type: 'fn', f, color: '--c1', width: 3 },
            rev && { type: 'vline', x: b, color: '--c3', width: 2, dash: true },
            { type: 'point', x: s.b, y: 0, color: '--c2', label: `b = ${num(s.b)}`, ldy: 16, snap: 0.5, drag: (x) => { s.b = clamp(x, mu - 4 * sigma, mu + 4 * sigma); } },
          ],
        },
        check: (s) => near(s.b, b),
        hint: 'Brug 68–95–99,7-reglen: halvdelen ligger under $\\mu$, og ca. 34 % ligger mellem $\\mu$ og $\\mu+\\sigma$.',
        solution: `$$P(X\\le ${b})=\\Phi\\left(\\frac{${b}-${mu}}{${sigma}}\\right)=\\Phi(${k})\\approx ${tn(P, 4)}$$ så $b=${b}$, dvs. $\\mu${k === 0 ? '' : `${k > 0 ? '+' : '-'}${Math.abs(k) === 1 ? '' : Math.abs(k)}\\sigma`}$.`,
      };
    },
  },
  {
    id: 'traekkurve',
    title: 'Placér klokken',
    interactive: true,
    make() {
      const mu = rint(-3, 3), sigma = pick([0.5, 1, 1.5, 2, 2.5]);
      const st = { mu: mu > 0 ? -3 : 3, sigma: 1 };
      if (st.sigma === sigma) st.sigma = 2;
      const peakMax = density(0, 0, 0.5);
      return {
        prompt: `Træk de to punkter, så kurven bliver tæthedsfunktionen for $N(${mu},\\,${tn(sigma)})$. Det ene punkt styrer toppen ($\\mu$), det andet vendepunktet ($\\mu+\\sigma$).`,
        graph: {
          view: { xmin: -8, xmax: 8, ymin: -0.08, ymax: peakMax * 1.15, equalAspect: false },
          state: st,
          scene: (s, rev) => {
            const f = (x) => density(x, s.mu, s.sigma);
            return [
              rev && { type: 'fn', f: (x) => density(x, mu, sigma), color: '--c3', width: 2.5, dash: true },
              { type: 'fn', f, color: '--c1', width: 3 },
              { type: 'segment', x1: s.mu, y1: 0, x2: s.mu + s.sigma, y2: 0, color: '--c2', width: 3, label: 'σ' },
              { type: 'point', x: s.mu, y: 0, color: '--c1', label: 'μ', ldy: 16, snap: 0.5, drag: (x) => { s.mu = clamp(x, -6, 6); } },
              { type: 'point', x: s.mu + s.sigma, y: 0, color: '--c2', label: 'μ+σ', ldy: 16, snap: 0.5, drag: (x) => { s.sigma = clamp(x - s.mu, 0.5, 5); } },
            ];
          },
        },
        check: (s) => near(s.mu, mu) && near(s.sigma, sigma),
        hint: 'Toppen ligger ved $\\mu$. Afstanden fra toppen ud til vendepunktet er $\\sigma$.',
        solution: `Toppen skal ligge ved $x=${mu}$, og det andet punkt ved $x=${tn(mu + sigma)}$ (altså $\\sigma=${tn(sigma)}$).`,
      };
    },
  },
];

const learn = `
<h2>Kontinuerte fordelinger</h2>
<p>Mange størrelser – højde, vægt, måleresultater – kan antage <i>alle</i> værdier i et interval. Så beskriver man fordelingen med en <b>tæthedsfunktion</b> $f$, og sandsynligheder er <b>arealer</b> under grafen:</p>
<div class="rule">$$P(a\\le X\\le b)=\\int_a^b f(x)\\,dx\\qquad\\text{Hele arealet er }1$$</div>
<p>Derfor er $P(X=a)=0$, og det er ligegyldigt, om man skriver $<$ eller $\\le$.</p>

<h2>Normalfordelingen $N(\\mu,\\sigma)$</h2>
<div class="rule">$$f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$</div>
<ul>
  <li>Grafen er <b>klokkeformet</b> og symmetrisk om middelværdien $\\mu$.</li>
  <li>Spredningen $\\sigma$ er afstanden fra $\\mu$ ud til <b>vendepunkterne</b>. Stor $\\sigma$: bred og lav klokke.</li>
</ul>

<h2>68–95–99,7-reglen</h2>
<table class="vt"><thead><tr><th>Interval</th><th>Andel</th></tr></thead><tbody>
<tr><td>$\\mu\\pm\\sigma$</td><td>ca. $68\\,\\%$</td></tr>
<tr><td>$\\mu\\pm2\\sigma$</td><td>ca. $95\\,\\%$</td></tr>
<tr><td>$\\mu\\pm3\\sigma$</td><td>ca. $99{,}7\\,\\%$</td></tr>
</tbody></table>

<h2>Beregning af sandsynligheder</h2>
<p>Man <b>standardiserer</b> med $z=\\dfrac{x-\\mu}{\\sigma}$ og bruger fordelingsfunktionen $\\Phi$ for standardnormalfordelingen $N(0,1)$ – i praksis CAS eller lommeregner:</p>
<div class="rule">$$P(X\\le b)=\\Phi\\!\\left(\\frac{b-\\mu}{\\sigma}\\right)\\qquad P(X\\ge a)=1-P(X\\le a)\\qquad P(a\\le X\\le b)=P(X\\le b)-P(X\\le a)$$</div>
<div class="example">Højden er $N(181,\\,7)$. Andelen under 170 cm: $$z=\\frac{170-181}{7}\\approx-1{,}571,\\qquad P(X\\le170)=\\Phi(-1{,}571)\\approx0{,}0581$$ Altså ca. $5{,}8\\,\\%$.</div>

<h2>Omvendt: find grænsen (fraktil)</h2>
<p>Skal man finde $a$, så $P(X\\le a)=p$, finder man først $z$ med $\\Phi(z)=p$ og regner tilbage:</p>
<div class="rule">$$a=\\mu+z\\cdot\\sigma$$</div>

<h2>Normalfordeling som tilnærmelse til binomialfordeling</h2>
<p>Er $X$ binomialfordelt med mange forsøg, ligner fordelingen en normalfordeling med</p>
<div class="rule">$$\\mu=n\\cdot p\\qquad \\sigma=\\sqrt{n\\cdot p\\cdot(1-p)}$$</div>
<p>Tommelfingerregel: tilnærmelsen er god, når $\\sigma>3$. Se det under <b>Udforsk</b> → "Binomial ≈ normal".</p>`;

export default {
  id: 'normalfordeling',
  title: 'Normalfordelingen',
  short: 'Normalfordeling',
  formula: 'X\\sim N(\\mu,\\sigma)',
  desc: 'Tæthedsfunktion, sandsynligheder som arealer, standardisering, 68–95–99,7-reglen, fraktiler og tilnærmelse af binomialfordelingen.',
  learn,
  explore,
  exercises,
};
