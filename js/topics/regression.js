import { Graph } from '../graph.js';
import { el, math, toggle, exploreLayout, card, hint, segmented } from '../ui.js';
import { rint, pick, shuffle, tn, num, round, near } from '../util.js';
import { fitLinear, fitExp, fitPower, fitQuad, mean, sum } from '../stats.js';

const MODELS = {
  lin: { label: 'Lineær', fit: fitLinear, tex: (m) => `y=${tn(m.a, 4)}x${m.b < 0 ? '-' : '+'}${tn(Math.abs(m.b), 4)}` },
  exp: { label: 'Eksponentiel', fit: fitExp, tex: (m) => `y=${tn(m.b, 4)}\\cdot {${tn(m.a, 4)}}^{x}` },
  pot: { label: 'Potens', fit: fitPower, tex: (m) => `y=${tn(m.b, 4)}\\cdot x^{${tn(m.a, 4)}}` },
  quad: { label: '2.-grads', fit: fitQuad, tex: (m) => `y=${tn(m.a, 4)}x^2${m.b < 0 ? '-' : '+'}${tn(Math.abs(m.b), 4)}x${m.c < 0 ? '-' : '+'}${tn(Math.abs(m.c), 4)}` },
};

/** Datasæt med lidt støj. */
function dataset(type, n = 7) {
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  const noise = () => 1 + (Math.random() - 0.5) * 0.12;
  const a = 0.6 + Math.random() * 1.5, b = 1 + Math.random() * 3;
  const gen = {
    lin: (x) => (a * x + b) * noise(),
    exp: (x) => b * (1.15 + Math.random() * 0.02 + 0.12) ** x * noise(),
    pot: (x) => b * x ** (0.5 + Math.random() * 0.1) * noise(),
    quad: (x) => (0.3 * (x - 4) ** 2 + b) * noise(),
  }[type];
  return xs.map((x) => ({ x, y: round(gen(x), 1) }));
}

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { pts: dataset('exp'), model: 'exp', resid: false, xq: 9 };
  const g = new Graph(graphBox, { xmin: -0.5, xmax: 9, ymin: -1, ymax: 15, equalAspect: false });
  const fitNow = () => { const xs = s.pts.map((p) => p.x), ys = s.pts.map((p) => p.y); return MODELS[s.model].fit(xs, ys); };
  const fitView = () => {
    const xs = s.pts.map((p) => p.x), ys = s.pts.map((p) => p.y);
    const x1 = Math.max(...xs), y1 = Math.max(...ys);
    g.setView({ xmin: Math.min(0, ...xs) - 0.5, xmax: x1 + 2.5, ymin: Math.min(0, ...ys) - y1 * 0.08, ymax: y1 * 1.35 });
  };

  g.setScene(() => {
    const m = fitNow(), items = [];
    if (m) {
      items.push({ type: 'fn', f: m.f, color: '--c2', width: 2.5 });
      if (s.resid) for (const p of s.pts) items.push({ type: 'segment', x1: p.x, y1: p.y, x2: p.x, y2: m.f(p.x), color: '--c4', width: 1.5, dash: [3, 3] });
      const yq = m.f(s.xq);
      if (Number.isFinite(yq)) items.push({ type: 'point', x: s.xq, y: yq, color: '--c3', r: 5, label: `(${num(s.xq)}; ${num(yq)})` });
    }
    s.pts.forEach((p, i) => items.push({ type: 'point', x: p.x, y: p.y, color: '--c1', r: 5, drag: (x, y) => { s.pts[i] = { x: round(x, 1), y: round(y, 1) }; update(); } }));
    return items;
  });

  const modelCtl = segmented(Object.entries(MODELS).map(([k, v]) => ({ value: k, label: v.label })), s.model, (v) => { s.model = v; update(); });
  const newData = el('div', { class: 'chips small' }, el('span', { class: 'panel-label' }, 'Nyt datasæt:'), ...['lin', 'exp', 'pot', 'quad'].map((t) => {
    const b = el('button', { type: 'button', class: 'chip' }, MODELS[t].label.toLowerCase());
    b.addEventListener('click', () => { s.pts = dataset(t); fitView(); update(); });
    return b;
  }));
  const xq = el('input', { type: 'text', inputmode: 'decimal', value: String(s.xq), 'aria-label': 'Forudsig ved x', style: 'width: 80px' });
  xq.addEventListener('input', () => { const v = Number(xq.value.replace(',', '.')); if (Number.isFinite(v)) { s.xq = v; update(); } });
  const info = el('div', { class: 'formula' });
  const table = el('div', { class: 'table-wrap' });

  panel.append(
    hint('Træk i datapunkterne, og se regressionen ændre sig. Vælg model herunder.'),
    modelCtl, newData, info,
    el('label', { class: 'fn-input' }, el('span', {}, 'Forudsig ved x ='), xq),
    el('div', { class: 'toggles' }, toggle('Vis residualer (afvigelser)', s.resid, (v) => { s.resid = v; update(); })),
    table,
    card('Husk', `
      <ul>
        <li>Regression finder den model, der passer bedst til data (mindste kvadraters metode).</li>
        <li>$r^2$ tæt på 1: modellen beskriver data godt.</li>
        <li>Eksponentiel: $\\ln y$ er lineær i $x$. Potens: $\\ln y$ er lineær i $\\ln x$.</li>
        <li>Se også efter, om residualerne ligger tilfældigt – ellers er modeltypen forkert.</li>
      </ul>`),
  );

  function update() {
    const m = fitNow();
    if (!m) info.innerHTML = math('<p>Modellen kræver positive værdier (og positive $x$ for potens).</p>');
    else {
      const yq = m.f(s.xq);
      info.innerHTML = math(`<div class="result">$$${MODELS[s.model].tex(m)}$$</div>
        $$r^2=${tn(m.r2, 4)}${s.model === 'exp' || s.model === 'pot' ? '\\quad(\\text{af de transformerede data})' : ''}$$
        <p>Modellen forudsiger $y\\approx ${tn(yq, 3)}$ ved $x=${tn(s.xq)}$.</p>`);
    }
    table.innerHTML = `<table class="vt"><thead><tr><th>x</th><th>y</th>${m ? '<th>model</th>' : ''}</tr></thead><tbody>${s.pts.map((p) => `<tr><td>${num(p.x, 1)}</td><td>${num(p.y, 1)}</td>${m ? `<td class="muted">${num(m.f(p.x), 2)}</td>` : ''}</tr>`).join('')}</tbody></table>`;
    g.draw();
  }
  fitView();
  update();
}

// ---------- opgaver ----------
const CONTEXTS_LIN = [
  { what: 'Prisen $y$ (kr.) for en taxatur på $x$ km', a: [8, 12, 15], b: [30, 40, 50], ia: 'kr. pr. km', ib: 'startgebyret' },
  { what: 'Vandstanden $y$ (cm) i et kar efter $x$ minutter', a: [2.5, 4, 6], b: [10, 20, 35], ia: 'cm pr. minut', ib: 'vandstanden ved start' },
  { what: 'Antal abonnenter $y$ (tusinder) $x$ år efter 2015', a: [1.8, 2.4, 3.5], b: [5, 8, 12], ia: 'tusinde pr. år', ib: 'antallet i 2015' },
];

const exercises = [
  {
    id: 'beregn',
    title: 'Lineær regression i hånden',
    make() {
      const x0 = pick([0, 1]), xs = [x0, x0 + 1, x0 + 2];
      const ys = [rint(1, 15), rint(1, 15), rint(1, 15)];
      const m = fitLinear(xs, ys);
      return {
        prompt: `Bestem den lineære regression $y=ax+b$ for datasættet $$\\begin{array}{c|ccc} x & ${xs.join(' & ')}\\\\\\hline y & ${ys.join(' & ')}\\end{array}$$ Afrund til to decimaler.`,
        fields: [{ label: 'a', answer: m.a, tol: 0.006 }, { label: 'b', answer: m.b, tol: 0.006 }],
        hint: '$a=\\dfrac{\\sum(x-\\bar x)(y-\\bar y)}{\\sum(x-\\bar x)^2}$ og $b=\\bar y-a\\,\\bar x$. Her er $x$-værdierne ligeligt fordelt, så $a=\\frac{y_3-y_1}{2}$.',
        solution: `$\\bar x=${x0 + 1}$ og $\\bar y=${tn(mean(ys), 4)}$. $$a=\\frac{${ys[2]}-${ys[0]}}{2}=${tn(m.a, 4)},\\qquad b=${tn(mean(ys), 4)}-${tn(m.a, 4)}\\cdot${x0 + 1}=${tn(m.b, 4)}$$`,
      };
    },
  },
  {
    id: 'forudsig',
    title: 'Brug modellen',
    make() {
      if (Math.random() < 0.5) {
        const c = pick(CONTEXTS_LIN), a = pick(c.a), b = pick(c.b);
        const ask = pick(['y', 'x']);
        if (ask === 'y') { const x = rint(5, 20); return {
          prompt: `${c.what} er beskrevet ved den lineære model $y=${tn(a)}x+${b}$. Hvad forudsiger modellen ved $x=${x}$?`,
          fields: [{ label: 'y', answer: a * x + b, tol: 0.011 }],
          solution: `$$y=${tn(a)}\\cdot${x}+${b}=${tn(a * x + b)}$$`,
        }; }
        const y = b + a * rint(5, 20);
        return {
          prompt: `${c.what} er beskrevet ved den lineære model $y=${tn(a)}x+${b}$. For hvilken værdi af $x$ giver modellen $y=${tn(y)}$?`,
          fields: [{ label: 'x', answer: (y - b) / a, tol: 0.011 }],
          hint: 'Løs ligningen $ax+b=y$.',
          solution: `$$${tn(a)}x+${b}=${tn(y)}\\;\\Leftrightarrow\\;x=\\frac{${tn(y)}-${b}}{${tn(a)}}=${tn((y - b) / a)}$$`,
        };
      }
      const b = pick([500, 1200, 2500]), a = pick([1.04, 1.06, 1.08, 0.95, 0.9]), x = rint(5, 15);
      return {
        prompt: `En eksponentiel regression gav modellen $y=${b}\\cdot {${tn(a)}}^x$, hvor $x$ er antal år efter 2020. Hvad forudsiger modellen $${2020 + x}$? Afrund til helt tal.`,
        fields: [{ label: 'y', answer: b * a ** x, tol: 0.51 }],
        solution: `$x=${x}$: $$y=${b}\\cdot ${tn(a)}^{${x}}\\approx ${tn(b * a ** x, 0)}$$`,
      };
    },
  },
  {
    id: 'tolkning',
    title: 'Tolk tallene i modellen',
    make() {
      if (Math.random() < 0.5) {
        const c = pick(CONTEXTS_LIN), a = pick(c.a), b = pick(c.b);
        return {
          prompt: `${c.what} er beskrevet ved $y=${tn(a)}x+${b}$. Hvad fortæller tallet $${tn(a)}$?`,
          choices: shuffle([
            { html: `$y$ vokser med $${tn(a)}$ (${c.ia}), hver gang $x$ vokser med 1.`, correct: true },
            { html: `$${tn(a)}$ er ${c.ib}.` },
            { html: `$y$ vokser med $${tn(a)}\\,\\%$, hver gang $x$ vokser med 1.` },
            { html: `$y$ vokser med $${b}$, hver gang $x$ vokser med $${tn(a)}$.` },
          ]),
          solution: `Hældningen $a=${tn(a)}$ er stigningen i $y$ pr. enhed $x$ (${c.ia}). Tallet $${b}$ er ${c.ib}.`,
        };
      }
      const b = pick([300, 800, 1500]), a = pick([1.04, 1.12, 0.92, 0.85]), r = round((a - 1) * 100, 2);
      return {
        prompt: `Antallet $y$ efter $x$ år er beskrevet ved $y=${b}\\cdot {${tn(a)}}^x$. Hvad fortæller tallet $${tn(a)}$?`,
        choices: shuffle([
          { html: `Antallet ${r > 0 ? 'vokser' : 'falder'} med $${tn(Math.abs(r))}\\,\\%$ om året.`, correct: true },
          { html: `Antallet vokser med $${tn(a)}$ om året.` },
          { html: `Antallet ${r > 0 ? 'vokser' : 'falder'} med $${tn(Math.abs(a * 100))}\\,\\%$ om året.` },
          { html: `Antallet var $${tn(a)}$ ved start.` },
        ]),
        solution: `Fremskrivningsfaktoren er $a=${tn(a)}=1${r > 0 ? '+' : '-'}${tn(Math.abs(r / 100))}$, så antallet ${r > 0 ? 'vokser' : 'falder'} med $${tn(Math.abs(r))}\\,\\%$ om året. $${b}$ er antallet ved start.`,
      };
    },
  },
  {
    id: 'vaelgmodel',
    title: 'Vælg modeltype',
    make() {
      const t = pick(['lin', 'expUp', 'expDown']);
      const xs = [1, 2, 3, 4, 5, 6, 7];
      const k = 1 + (Math.random() - 0.5) * 0.06;
      const gen = { lin: (x) => 2 + 1.3 * x, expUp: (x) => 1.2 * 1.4 ** x, expDown: (x) => 14 * 0.7 ** x }[t];
      const pts = xs.map((x) => ({ x, y: gen(x) * (1 + (Math.random() - 0.5) * 0.08) * k }));
      const labels = { lin: 'Lineær model', expUp: 'Eksponentiel model (voksende)', expDown: 'Eksponentiel model (aftagende)' };
      const ymax = Math.max(...pts.map((p) => p.y));
      return {
        prompt: 'Punkterne viser et datasæt. Hvilken model passer bedst?',
        graph: {
          view: { xmin: 0, xmax: 8, ymin: -ymax * 0.08, ymax: ymax * 1.2, equalAspect: false },
          scene: () => pts.map((p) => ({ type: 'point', x: p.x, y: p.y, color: '--c1', r: 5 })),
        },
        choices: Object.entries(labels).map(([k2, html]) => ({ html, correct: k2 === t })),
        hint: 'Ligger punkterne på en ret linje? Eller vokser/falder de med samme <i>procent</i> hver gang (krummer)?',
        solution: `${labels[t]}. ${t === 'lin' ? 'Punkterne ligger tæt på en ret linje: $y$ vokser med det samme tal hver gang.' : `Grafen krummer, og $y$ ${t === 'expUp' ? 'vokser' : 'falder'} med næsten samme procent for hvert skridt.`}`,
      };
    },
  },
  {
    id: 'transform',
    title: 'Fra ln-data til model',
    make() {
      const a = pick([1.05, 1.1, 1.2, 1.5, 2, 0.8]), b = pick([2, 5, 10, 50, 100]);
      const k = Math.log(a), c = Math.log(b);
      return {
        prompt: `En lineær regression på punkterne $(x,\\ln y)$ gav $\\ln y=${tn(k, 4)}x+${tn(c, 4)}$. Bestem $a$ og $b$ i den eksponentielle model $y=b\\cdot a^x$. Afrund til to decimaler.`,
        fields: [{ label: 'a', answer: a, tol: 0.006 }, { label: 'b', answer: b, rel: 0.003 }],
        hint: 'Opløft $e$ i begge sider: $y=e^{kx+c}=e^c\\cdot(e^k)^x$.',
        solution: `$$a=e^{${tn(k, 4)}}\\approx ${tn(a)},\\qquad b=e^{${tn(c, 4)}}\\approx ${tn(b)}$$`,
      };
    },
  },
  {
    id: 'r2',
    title: 'Forklaringsgraden r²',
    make() {
      const vals = shuffle([0.62, 0.91, 0.997].map((v) => round(v + (Math.random() - 0.5) * 0.02, 3)));
      const names = ['Lineær', 'Eksponentiel', 'Potens'];
      const best = vals.indexOf(Math.max(...vals));
      return {
        prompt: `Tre regressioner på samme datasæt gav: ${names.map((n, i) => `${n}: $r^2=${tn(vals[i], 3)}$`).join(', ')}. Hvilken model beskriver data bedst?`,
        choices: names.map((n, i) => ({ html: `${n} model`, correct: i === best })),
        hint: 'Jo tættere $r^2$ er på 1, jo bedre beskriver modellen data.',
        solution: `Den ${names[best].toLowerCase()} model har den største forklaringsgrad, $r^2=${tn(vals[best], 3)}$. (Kig dog altid også på grafen og residualerne!)`,
      };
    },
  },
  {
    id: 'bedstelinje',
    title: 'Placér den bedste rette linje',
    interactive: true,
    make() {
      const a = pick([0.5, 1, 1.5, -0.5, -1]), b = rint(1, 4) + (a < 0 ? 6 : 0);
      const pts = [1, 2, 3, 4, 5, 6, 7].map((x) => ({ x, y: round(a * x + b + (Math.random() - 0.5) * 1.6, 1) }));
      const L = fitLinear(pts.map((p) => p.x), pts.map((p) => p.y));
      const sse = (f) => sum(pts.map((p) => (p.y - f(p.x)) ** 2));
      const best = sse(L.f);
      const st = { P: { x: 1, y: 1 }, Q: { x: 7, y: 1 } };
      const lineF = (s) => (x) => s.P.y + ((s.Q.y - s.P.y) / (s.Q.x - s.P.x)) * (x - s.P.x);
      return {
        prompt: 'Træk i de to orange punkter, så linjen passer så godt som muligt til datapunkterne.',
        graph: {
          view: { xmin: -0.5, xmax: 8.5, ymin: -1, ymax: 13, equalAspect: false },
          state: st,
          scene: (s, rev) => [
            ...pts.map((p) => ({ type: 'point', x: p.x, y: p.y, color: '--c1', r: 5 })),
            rev && { type: 'fn', f: L.f, color: '--c3', width: 2, dash: true },
            s.P.x !== s.Q.x && { type: 'line', x1: s.P.x, y1: s.P.y, x2: s.Q.x, y2: s.Q.y, color: '--c2', width: 2.5 },
            { type: 'point', x: s.P.x, y: s.P.y, color: '--c2', snap: 0.25, drag: (x, y) => { s.P = { x, y }; } },
            { type: 'point', x: s.Q.x, y: s.Q.y, color: '--c2', snap: 0.25, drag: (x, y) => { s.Q = { x, y }; } },
          ],
        },
        check: (s) => s.P.x !== s.Q.x && sse(lineF(s)) <= best * 1.35 + 0.4,
        hint: 'Den bedste linje går gennem tyngdepunktet $(\\bar x,\\bar y)$, og punkterne skal ligge nogenlunde lige meget over og under linjen.',
        solution: `Regressionslinjen er $y=${tn(L.a, 2)}x+${tn(L.b, 2)}$ (stiplet). Den gør summen af de kvadrerede afvigelser mindst mulig. Dit svar godkendes, hvis det er tæt på.`,
      };
    },
  },
];

const learn = `
<h2>Hvad er regression?</h2>
<p>Har man målt sammenhørende værdier $(x,y)$, kan man finde den funktion af en bestemt type, der passer <b>bedst</b> til punkterne. Det kaldes regression. "Bedst" betyder, at summen af de kvadrerede lodrette afvigelser (residualerne) er så lille som mulig – <b>mindste kvadraters metode</b>.</p>

<h2>Lineær regression</h2>
<div class="rule">$$y=ax+b,\\qquad a=\\frac{\\sum(x_i-\\bar x)(y_i-\\bar y)}{\\sum(x_i-\\bar x)^2},\\qquad b=\\bar y-a\\,\\bar x$$</div>
<p>Regressionslinjen går altid gennem tyngdepunktet $(\\bar x,\\bar y)$. I praksis bruger man CAS – fx <code>linreg([1,2,3], [2,4,5])</code> i <a href="#/cas">CAS-regnearket</a>.</p>

<h2>Eksponentiel og potens-regression</h2>
<ul>
  <li><b>Eksponentiel</b> $y=b\\cdot a^x$: $\\ln y=\\ln b+x\\ln a$ er lineær i $x$. Lav lineær regression på $(x,\\ln y)$.</li>
  <li><b>Potens</b> $y=b\\cdot x^a$: $\\ln y=\\ln b+a\\ln x$ er lineær i $\\ln x$. Lav lineær regression på $(\\ln x,\\ln y)$.</li>
</ul>
<div class="example">Regression på $(x,\\ln y)$ gav $\\ln y=0{,}0953x+2{,}303$. Så er $a=e^{0{,}0953}\\approx1{,}10$ og $b=e^{2{,}303}\\approx10$, altså $y=10\\cdot1{,}10^x$.</div>

<h2>Hvor godt passer modellen?</h2>
<ul>
  <li><b>Forklaringsgraden</b> $r^2$ ligger mellem 0 og 1. Jo tættere på 1, jo bedre passer modellen.</li>
  <li>Kig på <b>residualerne</b>: de skal ligge tilfældigt over og under. Et systematisk mønster betyder, at modeltypen er forkert.</li>
  <li>Vær forsigtig med at forudsige langt uden for data (<b>ekstrapolation</b>).</li>
</ul>

<h2>Tolkning af tallene</h2>
<table class="vt"><thead><tr><th>Model</th><th>$a$</th><th>$b$</th></tr></thead><tbody>
<tr><td>$y=ax+b$</td><td>$y$ ændres med $a$, når $x$ vokser med 1</td><td>$y$-værdien når $x=0$</td></tr>
<tr><td>$y=b\\cdot a^x$</td><td>$y$ ændres med $(a-1)\\cdot100\\,\\%$ pr. enhed $x$</td><td>startværdien</td></tr>
<tr><td>$y=b\\cdot x^a$</td><td>Når $x$ vokser med $r_x$, vokser $y$ med $(1+r_x)^a-1$</td><td>$y$-værdien når $x=1$</td></tr>
</tbody></table>`;

export default {
  id: 'regression',
  title: 'Regression og modellering',
  short: 'Regression',
  formula: 'r^2',
  desc: 'Lineær, eksponentiel, potens- og 2.-gradsregression, forklaringsgrad, residualer og tolkning af modeller.',
  learn,
  explore,
  exercises,
};
