import { Graph } from '../graph.js';
import { el, math, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, pick, shuffle, tn, num, round, near } from '../util.js';
import { mean, median, quartiles, sd, sum } from '../stats.js';

/** Boksplot som grafelementer i højden y (tykkelse h). */
function boxplot(q, y, h, color = '--c1') {
  return [
    { type: 'segment', x1: q.min, y1: y, x2: q.q1, y2: y, color, width: 2 },
    { type: 'segment', x1: q.q3, y1: y, x2: q.max, y2: y, color, width: 2 },
    { type: 'polygon', points: [[q.q1, y - h], [q.q3, y - h], [q.q3, y + h], [q.q1, y + h]], color, alpha: 0.18, stroke: true, width: 2 },
    { type: 'segment', x1: q.med, y1: y - h, x2: q.med, y2: y + h, color: '--c2', width: 3 },
    { type: 'segment', x1: q.min, y1: y - h / 2, x2: q.min, y2: y + h / 2, color, width: 2 },
    { type: 'segment', x1: q.max, y1: y - h / 2, x2: q.max, y2: y + h / 2, color, width: 2 },
  ];
}
const GROUPS = [[0, 10], [10, 20], [20, 30], [30, 40], [40, 50], [50, 60]];
/** Sumkurve-punkter: (højre endepunkt, kumuleret %) */
function cumPoints(freqs) {
  const n = sum(freqs);
  let acc = 0;
  return [[GROUPS[0][0], 0], ...freqs.map((f, i) => { acc += f; return [GROUPS[i][1], (acc / n) * 100]; })];
}
/** Aflæs x på sumkurven ved p %. */
function readCum(pts, p) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    if (p <= y1 + 1e-9 && y1 > y0) return x0 + ((p - y0) / (y1 - y0)) * (x1 - x0);
  }
  return pts.at(-1)[0];
}

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { mode: 'ugrupperet', data: [3, 5, 6, 6, 7, 8, 8, 8, 9, 11, 12, 14], freqs: [2, 5, 9, 12, 6, 2] };
  const g = new Graph(graphBox, { xmin: -1, xmax: 17, ymin: -1, ymax: 8, equalAspect: false });

  g.setScene(() => {
    if (s.mode === 'ugrupperet') {
      const q = quartiles(s.data), items = boxplot(q, 6, 0.6);
      const counts = {};
      s.data.forEach((v, i) => {
        const k = String(v);
        counts[k] = (counts[k] ?? 0) + 1;
        const y = 0.4 + (counts[k] - 1) * 0.55;
        items.push({ type: 'point', x: v, y, color: '--c1', r: 6, drag: (x) => { s.data[i] = Math.max(0, Math.round(x * 2) / 2); update(); } });
      });
      items.push({ type: 'vline', x: mean(s.data), color: '--c3', width: 2, dash: true });
      items.push({ type: 'text', x: mean(s.data), y: 7.4, text: `middel ${num(mean(s.data))}`, color: '--c3', align: 'center' });
      return items;
    }
    const n = sum(s.freqs), items = [];
    s.freqs.forEach((f, i) => {
      const [a, b] = GROUPS[i], hgt = (f / n) * 100;
      items.push({ type: 'polygon', points: [[a, 0], [b, 0], [b, hgt], [a, hgt]], color: '--c1', alpha: 0.35, stroke: true, width: 1.5 });
    });
    const pts = cumPoints(s.freqs);
    items.push({ type: 'path', points: pts, color: '--c2', width: 3 });
    pts.forEach(([x, y]) => items.push({ type: 'point', x, y, color: '--c2', r: 4 }));
    for (const [p, lbl] of [[25, 'Q₁'], [50, 'median'], [75, 'Q₃']]) {
      const x = readCum(pts, p);
      items.push({ type: 'segment', x1: 0, y1: p, x2: x, y2: p, color: '--c4', width: 1.5, dash: [4, 4] });
      items.push({ type: 'segment', x1: x, y1: p, x2: x, y2: 0, color: '--c4', width: 1.5, dash: [4, 4], label: lbl });
    }
    return items;
  });

  const dataInput = el('textarea', { rows: 2, spellcheck: 'false', 'aria-label': 'Data', class: 'data-input' });
  dataInput.value = s.data.join('; ');
  dataInput.addEventListener('input', () => {
    const vals = dataInput.value.split(/[;\s]+/).filter(Boolean).map((t) => Number(t.replace(',', '.'))).filter(Number.isFinite);
    if (vals.length >= 2) { s.data = vals; fitView(); update(false); }
  });
  const freqBox = el('div', { class: 'freq-grid' });
  s.freqs.forEach((f, i) => {
    const inp = el('input', { type: 'number', min: 0, value: f, 'aria-label': `Hyppighed ${GROUPS[i][0]}–${GROUPS[i][1]}` });
    inp.addEventListener('input', () => { s.freqs[i] = Math.max(0, Number(inp.value) || 0); if (sum(s.freqs) > 0) update(); });
    freqBox.append(el('label', {}, el('span', {}, `]${GROUPS[i][0]};${GROUPS[i][1]}]`), inp));
  });
  const ugBox = el('div', { class: 'explore-panel' }, el('div', { class: 'panel-label' }, 'Data (adskil med mellemrum eller semikolon) – eller træk i prikkerne'), dataInput);
  const grBox = el('div', { class: 'explore-panel', hidden: true }, el('div', { class: 'panel-label' }, 'Hyppigheder i intervallerne'), freqBox);
  const fitView = () => {
    if (s.mode === 'ugrupperet') { const lo = Math.min(...s.data), hi = Math.max(...s.data), pad = Math.max(1, (hi - lo) * 0.1); g.setView({ xmin: lo - pad, xmax: hi + pad, ymin: -0.8, ymax: 8 }); }
    else g.setView({ xmin: -3, xmax: 63, ymin: -8, ymax: 110 });
  };
  const modeCtl = segmented([{ value: 'ugrupperet', label: 'Ugrupperede data' }, { value: 'grupperet', label: 'Grupperede data' }], s.mode, (v) => {
    s.mode = v; ugBox.hidden = v !== 'ugrupperet'; grBox.hidden = v !== 'grupperet'; fitView(); update();
  });
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Træk i prikkerne og se, hvordan middelværdi, median og boksplot ændrer sig. En enkelt ekstrem værdi påvirker middelværdien – men ikke medianen.'),
    modeCtl, ugBox, grBox, info,
    card('Husk', `
      <ul>
        <li><b>Median</b>: den midterste værdi, når data er sorteret.</li>
        <li><b>Kvartiler</b>: $Q_1$ er medianen af den nederste halvdel, $Q_3$ af den øverste.</li>
        <li><b>Boksplot</b>: min, $Q_1$, median, $Q_3$, maks.</li>
        <li><b>Sumkurve</b>: aflæs median og kvartiler ved 50 %, 25 % og 75 %.</li>
      </ul>`),
  );

  function update(syncText = true) {
    if (s.mode === 'ugrupperet') {
      const d = [...s.data].sort((a, b) => a - b), q = quartiles(d);
      if (syncText && document.activeElement !== dataInput) dataInput.value = s.data.join('; ');
      info.innerHTML = math(`
        <p class="muted">Sorteret: ${d.map((v) => num(v, 2)).join('; ')}</p>
        $$n=${d.length},\\qquad \\bar x=\\frac{${tn(sum(d))}}{${d.length}}\\approx ${tn(mean(d), 3)}$$
        <div class="result">$$\\min=${tn(q.min)},\\; Q_1=${tn(q.q1)},\\; \\text{median}=${tn(q.med)},\\; Q_3=${tn(q.q3)},\\; \\max=${tn(q.max)}$$</div>
        $$\\text{Variationsbredde}=${tn(q.max - q.min)},\\qquad \\text{kvartilbredde}=${tn(q.q3 - q.q1)}$$
        $$\\text{spredning } \\sigma=\\sqrt{\\tfrac1n\\textstyle\\sum(x_i-\\bar x)^2}\\approx ${tn(sd(d), 3)}\\quad(s\\approx ${tn(sd(d, true), 3)}\\text{ med } n-1)$$`);
    } else {
      const n = sum(s.freqs), mids = GROUPS.map(([a, b]) => (a + b) / 2), m = sum(mids.map((x, i) => x * s.freqs[i])) / n;
      const pts = cumPoints(s.freqs);
      info.innerHTML = math(`
        <table class="vt"><thead><tr><th>Interval</th><th>Hyppighed</th><th>Frekvens</th><th>Kumuleret</th></tr></thead><tbody>${
          s.freqs.map((f, i) => `<tr><td>]${GROUPS[i][0]};${GROUPS[i][1]}]</td><td>${f}</td><td>${num((f / n) * 100, 1)} %</td><td>${num(pts[i + 1][1], 1)} %</td></tr>`).join('')}</tbody></table>
        $$\\bar x\\approx\\frac{\\sum m_i\\cdot h_i}{n}=${tn(m, 2)}\\quad(\\text{intervalmidtpunkter } m_i)$$
        <div class="result">$$Q_1\\approx ${tn(readCum(pts, 25), 1)},\\quad\\text{median}\\approx ${tn(readCum(pts, 50), 1)},\\quad Q_3\\approx ${tn(readCum(pts, 75), 1)}$$</div>`);
    }
    g.draw();
  }
  fitView();
  update();
}

// ---------- opgaver ----------
const randData = (n = rint(7, 12), lo = 1, hi = 30) => Array.from({ length: n }, () => rint(lo, hi));
const listTex = (d) => d.join(';\\;');

const exercises = [
  {
    id: 'middel',
    title: 'Middelværdi',
    make() {
      const d = randData();
      return {
        prompt: `Bestem middelværdien af observationerne $$${listTex(d)}$$ Afrund til to decimaler.`,
        fields: [{ label: '\\bar x', answer: mean(d), tol: 0.006 }],
        hint: 'Læg alle tal sammen, og divider med antallet.',
        solution: `$$\\bar x=\\frac{${sum(d)}}{${d.length}}\\approx ${tn(mean(d))}$$`,
      };
    },
  },
  {
    id: 'median',
    title: 'Median',
    make() {
      const d = randData();
      return {
        prompt: `Bestem medianen af observationerne $$${listTex(d)}$$`,
        fields: [{ label: '\\text{median}', answer: median(d) }],
        hint: 'Sortér tallene. Ved et ulige antal er medianen det midterste tal; ved et lige antal gennemsnittet af de to midterste.',
        solution: `Sorteret: $${listTex([...d].sort((a, b) => a - b))}$. Der er $${d.length}$ tal, så medianen er $${tn(median(d))}$.`,
      };
    },
  },
  {
    id: 'kvartiler',
    title: 'Kvartiler',
    make() {
      const d = randData(rint(8, 11)), q = quartiles(d);
      return {
        prompt: `Bestem nedre og øvre kvartil for observationerne $$${listTex(d)}$$`,
        fields: [{ label: 'Q_1', answer: q.q1 }, { label: 'Q_3', answer: q.q3 }],
        hint: 'Sortér tallene og find medianen. $Q_1$ er medianen af tallene under medianen, $Q_3$ af tallene over (ved ulige antal udelades det midterste tal).',
        solution: `Sorteret: $${listTex([...d].sort((a, b) => a - b))}$. Medianen er $${tn(q.med)}$, $Q_1=${tn(q.q1)}$ og $Q_3=${tn(q.q3)}$.`,
      };
    },
  },
  {
    id: 'spredning',
    title: 'Spredning',
    make() {
      const d = randData(rint(4, 6), 1, 12), m = mean(d);
      return {
        prompt: `Bestem spredningen $\\sigma=\\sqrt{\\frac1n\\sum(x_i-\\bar x)^2}$ for observationerne $${listTex(d)}$. Afrund til to decimaler.`,
        fields: [{ label: '\\sigma', answer: sd(d), tol: 0.006 }],
        hint: 'Find middelværdien først. Kvadrér hver afvigelse fra middelværdien, tag gennemsnittet, og tag kvadratroden.',
        solution: `$\\bar x=${tn(m, 3)}$. $$\\sigma=\\sqrt{\\frac{${d.map((x) => `(${x}-${tn(m, 3)})^2`).join('+')}}{${d.length}}}\\approx ${tn(sd(d))}$$`,
      };
    },
  },
  {
    id: 'grupperet',
    title: 'Middelværdi for grupperede data',
    make() {
      const freqs = GROUPS.slice(0, 5).map(() => rint(1, 12)), mids = GROUPS.slice(0, 5).map(([a, b]) => (a + b) / 2);
      const n = sum(freqs), m = sum(mids.map((x, i) => x * freqs[i])) / n;
      return {
        prompt: `Tabellen viser grupperede data. Bestem middelværdien ved hjælp af intervalmidtpunkterne. Afrund til én decimal. $$\\begin{array}{c|ccccc} \\text{Interval} & ${GROUPS.slice(0, 5).map(([a, b]) => `]${a};${b}]`).join(' & ')}\\\\\\hline \\text{Hyppighed} & ${freqs.join(' & ')}\\end{array}$$`,
        fields: [{ label: '\\bar x', answer: m, tol: 0.06 }],
        hint: 'Brug midtpunktet i hvert interval: $\\bar x\\approx\\dfrac{\\sum m_i\\cdot h_i}{n}$.',
        solution: `$$\\bar x\\approx\\frac{${mids.map((x, i) => `${x}\\cdot${freqs[i]}`).join('+')}}{${n}}\\approx ${tn(m, 1)}$$`,
      };
    },
  },
  {
    id: 'sumkurve',
    title: 'Aflæs på sumkurven',
    make() {
      const freqs = GROUPS.map(() => rint(1, 10)), pts = cumPoints(freqs);
      const p = pick([25, 50, 75]), name = { 25: 'nedre kvartil $Q_1$', 50: 'medianen', 75: 'øvre kvartil $Q_3$' }[p];
      const x = readCum(pts, p);
      return {
        prompt: `Grafen viser sumkurven for et grupperet datasæt. Aflæs ${name}. (Svar med én decimal – du må være lidt upræcis.)`,
        graph: {
          view: { xmin: -3, xmax: 63, ymin: -8, ymax: 110, equalAspect: false },
          scene: (st, rev) => [
            { type: 'path', points: pts, color: '--c2', width: 3 },
            ...pts.map(([px, py]) => ({ type: 'point', x: px, y: py, color: '--c2', r: 4 })),
            { type: 'hline', y: p, color: '--g-grid', width: 1, dash: [3, 4] },
            rev && { type: 'segment', x1: x, y1: p, x2: x, y2: 0, color: '--c4', width: 2, dash: [4, 4] },
          ],
        },
        fields: [{ label: 'x', answer: x, tol: 1.6 }],
        hint: `Gå vandret ud fra ${p} % på $y$-aksen, til du rammer kurven, og derefter lodret ned.`,
        solution: `Ved ${p} % rammer man kurven ved $x\\approx ${tn(x, 1)}$.`,
      };
    },
  },
  {
    id: 'boksplot',
    title: 'Aflæs et boksplot',
    make() {
      const d = randData(11, 2, 40), q = quartiles(d);
      const lo = q.min - 3, hi = q.max + 3;
      const ask = pick(['med', 'q1', 'q3', 'kb']);
      const ans = ask === 'kb' ? q.q3 - q.q1 : q[ask];
      const label = { med: 'medianen', q1: 'nedre kvartil', q3: 'øvre kvartil', kb: 'kvartilbredden' }[ask];
      return {
        prompt: `Aflæs ${label} på boksplottet.`,
        graph: { view: { xmin: lo, xmax: hi, ymin: -1.5, ymax: 2.5, equalAspect: false }, scene: () => boxplot(q, 1, 0.6) },
        fields: [{ label: ask === 'kb' ? 'Q_3-Q_1' : ask === 'med' ? '\\text{median}' : ask === 'q1' ? 'Q_1' : 'Q_3', answer: ans, tol: 0.6 }],
        hint: 'Boksplottet viser (fra venstre): min, $Q_1$, median (stregen i boksen), $Q_3$ og maks. Kvartilbredden er $Q_3-Q_1$.',
        solution: `Min $=${tn(q.min)}$, $Q_1=${tn(q.q1)}$, median $=${tn(q.med)}$, $Q_3=${tn(q.q3)}$, maks $=${tn(q.max)}$.${ask === 'kb' ? ` Kvartilbredden er $${tn(q.q3)}-${tn(q.q1)}=${tn(q.q3 - q.q1)}$.` : ''}`,
      };
    },
  },
  {
    id: 'traekboks',
    title: 'Tegn boksplottet',
    interactive: true,
    make() {
      const d = randData(9, 1, 20), q = quartiles(d);
      const keys = ['min', 'q1', 'med', 'q3', 'max'], names = ['min', 'Q₁', 'med', 'Q₃', 'max'];
      const st = Object.fromEntries(keys.map((k, i) => [k, 2 + i * 3.5]));
      if (keys.every((k) => near(st[k], q[k]))) st.min = 0;
      return {
        prompt: `Træk de fem punkter, så de danner boksplottet for $$${listTex(d)}$$`,
        graph: {
          view: { xmin: -1, xmax: 21, ymin: -1.5, ymax: 3, equalAspect: false },
          state: st,
          scene: (s, rev) => [
            rev && boxplot(q, 2, 0.4, '--c3'),
            ...boxplot({ min: s.min, q1: s.q1, med: s.med, q3: s.q3, max: s.max }, 0.6, 0.45),
            ...keys.map((k, i) => ({ type: 'point', x: s[k], y: 0.6, color: k === 'med' ? '--c2' : '--c1', label: names[i], ldy: i % 2 ? 26 : -22, lalign: 'left', snap: 0.5, drag: (x) => { s[k] = x; } })),
          ].flat().filter(Boolean),
        },
        check: (s) => keys.every((k) => near(s[k], q[k])),
        hint: 'Sortér tallene. Find mindste og største tal, medianen og de to kvartiler.',
        solution: `Sorteret: $${listTex([...d].sort((a, b) => a - b))}$. $$\\min=${q.min},\\;Q_1=${tn(q.q1)},\\;\\text{median}=${q.med},\\;Q_3=${tn(q.q3)},\\;\\max=${q.max}$$`,
      };
    },
  },
];

const learn = `
<h2>Ugrupperede data</h2>
<p>Ugrupperede data er de enkelte observationer, fx $3;\\,5;\\,6;\\,8;\\,8;\\,11$.</p>
<ul>
  <li><b>Middelværdi</b>: $\\bar x=\\dfrac{x_1+x_2+\\dots+x_n}{n}$</li>
  <li><b>Median</b>: den midterste værdi, når data er sorteret (ved lige antal: gennemsnittet af de to midterste).</li>
  <li><b>Kvartiler</b>: $Q_1$ er medianen af den nederste halvdel, $Q_3$ af den øverste halvdel (ved ulige antal udelades medianen selv).</li>
  <li><b>Typetal</b>: den hyppigste værdi.</li>
</ul>
<div class="example">Data $2;\\,4;\\,5;\\,7;\\,9;\\,10;\\,12$: median $7$, nederste halvdel $2;4;5$ giver $Q_1=4$, øverste $9;10;12$ giver $Q_3=10$.</div>

<h2>Boksplot og spredningsmål</h2>
<p>Et <b>boksplot</b> viser kvartilsættet: min, $Q_1$, median, $Q_3$ og maks. Boksen indeholder den midterste halvdel af data.</p>
<div class="rule">$$\\text{Variationsbredde}=\\max-\\min\\qquad\\text{Kvartilbredde}=Q_3-Q_1$$
$$\\text{Spredning: }\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\bar x)^2}$$</div>
<p>Medianen og kvartilerne påvirkes ikke af enkelte ekstreme værdier – det gør middelværdien og spredningen. (I CAS kan du skrive <code>mean([…])</code>, <code>median([…])</code> og <code>stdev([…])</code>.)</p>

<h2>Grupperede data</h2>
<p>Når data er inddelt i intervaller, kender man kun <b>hyppigheden</b> i hvert interval. Frekvensen er hyppigheden i procent af det hele.</p>
<ul>
  <li><b>Histogram</b>: søjler over intervallerne.</li>
  <li><b>Middelværdi</b> (skøn): brug intervalmidtpunkterne $m_i$: $\\bar x\\approx\\dfrac{\\sum m_i\\cdot h_i}{n}$.</li>
  <li><b>Sumkurve</b>: den kumulerede frekvens afsat ved intervallernes <i>højre</i> endepunkter, forbundet med rette linjestykker.</li>
</ul>
<p>Median og kvartiler aflæses på sumkurven ved $50\\,\\%$, $25\\,\\%$ og $75\\,\\%$.</p>`;

export default {
  id: 'statistik',
  title: 'Deskriptiv statistik',
  short: 'Statistik',
  formula: '\\bar x,\\;Q_1,\\;Q_3',
  desc: 'Middelværdi, median, kvartiler, boksplot, spredning, grupperede data, histogram og sumkurve.',
  learn,
  explore,
  exercises,
};
