import { Graph } from '../graph.js';
import { el, math, slider, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, pick, tn, num } from '../util.js';

export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
export const binom = (n, p, k) => choose(n, k) * p ** k * (1 - p) ** (n - k);
const binomCdf = (n, p, k) => { let s = 0; for (let i = 0; i <= k; i++) s += binom(n, p, i); return s; };

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { n: 20, p: 0.3, k: 6, mode: 'eq' };
  const g = new Graph(graphBox, { xmin: -1, xmax: 21, ymin: -0.02, ymax: 0.25, equalAspect: false, pan: true });

  const inSet = (i) => (s.mode === 'eq' ? i === s.k : s.mode === 'le' ? i <= s.k : i >= s.k);
  g.setScene(() => {
    const items = [];
    for (let i = 0; i <= s.n; i++) {
      const y = binom(s.n, s.p, i);
      items.push({ type: 'polygon', points: [[i - 0.4, 0], [i + 0.4, 0], [i + 0.4, y], [i - 0.4, y]], color: inSet(i) ? '--c2' : '--c1', alpha: inSet(i) ? 0.85 : 0.45 });
    }
    const mu = s.n * s.p;
    items.push({ type: 'vline', x: mu, color: '--c3', width: 2, dash: true });
    items.push({ type: 'text', x: mu, y: g.view.ymax, dy: 14, dx: 6, text: `μ = ${num(mu)}`, color: '--c3' });
    return items;
  });

  const fit = () => {
    let max = 0;
    for (let i = 0; i <= s.n; i++) max = Math.max(max, binom(s.n, s.p, i));
    g.setView({ xmin: -1, xmax: s.n + 1, ymin: -max * 0.08, ymax: max * 1.2 });
  };
  const sn = slider({ label: 'n', min: 1, max: 60, step: 1, value: s.n, format: (v) => `${v}`, onInput: (v) => { s.n = v; if (s.k > v) { s.k = v; sk.set(v); } sk.input.max = v; fit(); update(); } });
  const sp = slider({ label: 'p', min: 0.01, max: 0.99, step: 0.01, value: s.p, onInput: (v) => { s.p = v; fit(); update(); } });
  const sk = slider({ label: 'k', min: 0, max: s.n, step: 1, value: s.k, format: (v) => `${v}`, onInput: (v) => { s.k = v; update(); } });
  const modeCtl = segmented([{ value: 'eq', label: 'P(X = k)' }, { value: 'le', label: 'P(X ≤ k)' }, { value: 'ge', label: 'P(X ≥ k)' }], s.mode, (v) => { s.mode = v; update(); });
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Binomialfordelingen: $n$ uafhængige forsøg med sandsynlighed $p$ for succes. Søjlerne er $P(X=k)$.'),
    el('div', { class: 'sliders' }, sn.row, sp.row),
    modeCtl,
    el('div', { class: 'sliders' }, sk.row),
    info,
    card('Husk', `
      <ul>
        <li>$P(X=k)=K(n,k)\\cdot p^k\\cdot(1-p)^{n-k}$</li>
        <li>Middelværdi $\\mu=n\\cdot p$ og spredning $\\sigma=\\sqrt{n\\cdot p\\cdot(1-p)}$</li>
        <li>$P(X\\ge k)=1-P(X\\le k-1)$</li>
      </ul>`),
  );

  function update() {
    const { n, p, k } = s;
    const val = s.mode === 'eq' ? binom(n, p, k) : s.mode === 'le' ? binomCdf(n, p, k) : 1 - binomCdf(n, p, k - 1);
    const lbl = s.mode === 'eq' ? `P(X=${k})` : s.mode === 'le' ? `P(X\\le ${k})` : `P(X\\ge ${k})`;
    const formula = s.mode === 'eq'
      ? `$$P(X=${k})=K(${n},${k})\\cdot ${tn(p)}^{${k}}\\cdot ${tn(1 - p)}^{${n - k}}$$<p class="muted">$K(${n},${k})=${choose(n, k)}$</p>`
      : s.mode === 'le' ? `$$P(X\\le ${k})=\\sum_{i=0}^{${k}}P(X=i)$$` : `$$P(X\\ge ${k})=1-P(X\\le ${k - 1})$$`;
    info.innerHTML = math(`${formula}
      <div class="result">$$${lbl}\\approx ${tn(val, 4)}$$</div>
      $$\\mu=n\\,p=${tn(n * p)},\\qquad \\sigma=\\sqrt{n\\,p\\,(1-p)}=${tn(Math.sqrt(n * p * (1 - p)))}$$`);
    g.draw();
  }
  fit();
  update();
}

const exercises = [
  {
    id: 'kombinatorik',
    title: 'Kombinatorik',
    make() {
      const v = pick(['fak', 'komb', 'perm']);
      if (v === 'fak') {
        const n = rint(3, 7);
        return {
          prompt: `På hvor mange måder kan ${n} personer stille sig i kø?`,
          fields: [{ label: 'antal', answer: fact(n) }],
          hint: 'Første plads kan besættes på $n$ måder, næste på $n-1$ osv. Det er $n!$ ("n fakultet").',
          solution: `$$${n}!=${Array.from({ length: n }, (_, i) => n - i).join('\\cdot')}=${fact(n)}$$`,
        };
      }
      const n = rint(5, 12), r = rint(2, Math.min(4, n - 1));
      if (v === 'komb') return {
        prompt: `En klasse på ${n} elever skal vælge et udvalg på ${r} personer. Hvor mange forskellige udvalg kan der dannes?`,
        fields: [{ label: `K(${n},${r})`, answer: choose(n, r) }],
        hint: 'Rækkefølgen er ligegyldig, så det er en <b>kombination</b>: $K(n,r)=\\dfrac{n!}{r!\\,(n-r)!}$.',
        solution: `$$K(${n},${r})=\\frac{${n}!}{${r}!\\cdot${n - r}!}=${choose(n, r)}$$`,
      };
      const P = fact(n) / fact(n - r);
      return {
        prompt: `Blandt ${n} løbere uddeles guld, sølv${r > 3 ? ', bronze og en 4.-plads' : r === 3 ? ' og bronze' : ''}${r === 2 ? '' : ''}. Hvor mange forskellige resultater kan der være for de ${r} første pladser?`,
        fields: [{ label: `P(${n},${r})`, answer: P }],
        hint: 'Rækkefølgen betyder noget, så det er en <b>permutation</b>: $P(n,r)=\\dfrac{n!}{(n-r)!}$.',
        solution: `$$P(${n},${r})=${Array.from({ length: r }, (_, i) => n - i).join('\\cdot')}=${P}$$`,
      };
    },
  },
  {
    id: 'terninger',
    title: 'Symmetrisk sandsynlighedsfelt',
    make() {
      const sum = rint(2, 12);
      const count = 6 - Math.abs(7 - sum);
      return {
        prompt: `Der kastes med to terninger. Hvad er sandsynligheden for, at summen bliver $${sum}$? (Skriv fx som brøk.)`,
        fields: [{ label: 'P', answer: count / 36, tol: 0.0005 }],
        hint: 'Der er $6\\cdot 6=36$ lige sandsynlige udfald. Tæl de gunstige.',
        solution: `Der er $${count}$ gunstige udfald ud af $36$: $$P=\\frac{${count}}{36}\\approx ${tn(count / 36, 4)}$$`,
      };
    },
  },
  {
    id: 'binom',
    title: 'Binomialfordelingen',
    make() {
      const n = rint(5, 20), p = pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]), k = rint(0, Math.min(n, Math.round(n * p) + 3));
      if (Math.random() < 0.5) {
        const P = binom(n, p, k);
        return {
          prompt: `$X$ er binomialfordelt med $n=${n}$ og $p=${tn(p)}$. Bestem $P(X=${k})$. Afrund til fire decimaler.`,
          fields: [{ label: `P(X=${k})`, answer: P, tol: 0.00006 }],
          hint: '$P(X=k)=K(n,k)\\cdot p^k\\cdot(1-p)^{n-k}$',
          solution: `$$P(X=${k})=K(${n},${k})\\cdot${tn(p)}^{${k}}\\cdot${tn(1 - p)}^{${n - k}}=${choose(n, k)}\\cdot${tn(p)}^{${k}}\\cdot${tn(1 - p)}^{${n - k}}\\approx ${tn(P, 4)}$$`,
        };
      }
      const P = binomCdf(n, p, k);
      return {
        prompt: `$X$ er binomialfordelt med $n=${n}$ og $p=${tn(p)}$. Bestem $P(X\\le ${k})$. Afrund til fire decimaler.`,
        fields: [{ label: `P(X\\le ${k})`, answer: P, tol: 0.00006 }],
        hint: 'Læg $P(X=0)+P(X=1)+\\dots+P(X=k)$ sammen – eller brug binomialfordelingen i CAS.',
        solution: `$$P(X\\le ${k})=\\sum_{i=0}^{${k}}K(${n},i)\\,${tn(p)}^i\\,${tn(1 - p)}^{${n}-i}\\approx ${tn(P, 4)}$$`,
      };
    },
  },
  {
    id: 'middel',
    title: 'Middelværdi og spredning',
    make() {
      const n = pick([10, 20, 25, 50, 100, 200]), p = pick([0.1, 0.2, 0.25, 0.4, 0.5]);
      const mu = n * p, sd = Math.sqrt(n * p * (1 - p));
      return {
        prompt: `$X$ er binomialfordelt med $n=${n}$ og $p=${tn(p)}$. Bestem middelværdien $\\mu$ og spredningen $\\sigma$. Afrund $\\sigma$ til to decimaler.`,
        fields: [{ label: '\\mu', answer: mu }, { label: '\\sigma', answer: sd, tol: 0.011 }],
        hint: '$\\mu=n\\cdot p$ og $\\sigma=\\sqrt{n\\cdot p\\cdot(1-p)}$',
        solution: `$$\\mu=${n}\\cdot${tn(p)}=${tn(mu)},\\qquad\\sigma=\\sqrt{${n}\\cdot${tn(p)}\\cdot${tn(1 - p)}}\\approx ${tn(sd)}$$`,
      };
    },
  },
  {
    id: 'stokastisk',
    title: 'Middelværdi af stokastisk variabel',
    make() {
      const xs = [0, 1, 2, 3].map((i) => i * pick([1, 2, 5, 10]));
      const raw = [rint(1, 5), rint(1, 5), rint(1, 5), rint(1, 5)];
      const sum = raw.reduce((a, b) => a + b, 0);
      const ps = raw.map((r) => r / sum);
      const E = xs.reduce((a, x, i) => a + x * ps[i], 0);
      return {
        prompt: `En stokastisk variabel $X$ har fordelingen $$\\begin{array}{c|cccc} x & ${xs.join(' & ')}\\\\\\hline P(X=x) & ${raw.map((r) => `\\frac{${r}}{${sum}}`).join(' & ')}\\end{array}$$ Bestem middelværdien $E(X)$. Afrund til to decimaler.`,
        fields: [{ label: 'E(X)', answer: E, tol: 0.011 }],
        hint: '$E(X)=\\sum x\\cdot P(X=x)$',
        solution: `$$E(X)=${xs.map((x, i) => `${x}\\cdot\\frac{${raw[i]}}{${sum}}`).join('+')}\\approx ${tn(E)}$$`,
      };
    },
  },
];

const learn = `
<h2>Sandsynlighedsfelt</h2>
<p>Et sandsynlighedsfelt består af alle mulige <b>udfald</b> og deres sandsynligheder (som summer til 1). En <b>hændelse</b> er en mængde af udfald. I et <b>symmetrisk</b> sandsynlighedsfelt er alle udfald lige sandsynlige:</p>
<div class="rule">$$P(A)=\\frac{\\text{antal gunstige udfald}}{\\text{antal mulige udfald}}$$</div>

<h2>Kombinatorik</h2>
<ul>
  <li><b>Multiplikationsprincippet:</b> $m$ valg efterfulgt af $n$ valg giver $m\\cdot n$ muligheder.</li>
  <li><b>Permutationer</b> (rækkefølgen betyder noget): $P(n,r)=\\dfrac{n!}{(n-r)!}$</li>
  <li><b>Kombinationer</b> (rækkefølgen er ligegyldig): $K(n,r)=\\dfrac{n!}{r!\\,(n-r)!}$</li>
</ul>
<div class="example">Vælg 3 ud af 10 elever: $K(10,3)=\\frac{10!}{3!\\cdot7!}=120$.</div>

<h2>Stokastisk variabel</h2>
<p>En stokastisk variabel $X$ tildeler et tal til hvert udfald.</p>
<div class="rule">$$E(X)=\\mu=\\sum x_i\\cdot P(X=x_i)\\qquad \\sigma=\\sqrt{\\sum (x_i-\\mu)^2\\cdot P(X=x_i)}$$</div>

<h2>Binomialfordelingen</h2>
<p>Gentag et forsøg $n$ gange uafhængigt, med sandsynligheden $p$ for "succes" hver gang. Antal successer $X$ er binomialfordelt:</p>
<div class="rule">$$P(X=k)=K(n,k)\\cdot p^k\\cdot(1-p)^{n-k}\\qquad \\mu=np\\qquad \\sigma=\\sqrt{np(1-p)}$$</div>
<div class="example">Kast en mønt 10 gange. $P(\\text{præcis 5 plat})=K(10,5)\\cdot0{,}5^5\\cdot0{,}5^5\\approx0{,}2461$.</div>`;

export default {
  id: 'sandsynlighed',
  title: 'Sandsynlighedsregning',
  short: 'Sandsynlighed',
  formula: 'K(n,r)=\\tfrac{n!}{r!(n-r)!}',
  desc: 'Sandsynlighedsfelter, kombinatorik, stokastiske variable og binomialfordelingen.',
  learn,
  explore,
  exercises,
};
