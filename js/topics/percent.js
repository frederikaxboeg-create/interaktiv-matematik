import { Graph } from '../graph.js';
import { el, math, slider, exploreLayout, card, hint } from '../ui.js';
import { rint, pick, tn, num } from '../util.js';

const kr = (x) => `${num(x, 2)} kr.`;

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { K0: 10000, r: 5, n: 20 };
  const g = new Graph(graphBox, { xmin: -1, xmax: 21, ymin: -2000, ymax: 30000, equalAspect: false });

  g.setScene(() => {
    const { K0, r, n } = s;
    const items = [
      { type: 'fn', f: (x) => K0 * (1 + (r / 100) * x), color: '--c2', width: 2, dash: true, xmin: 0, xmax: n },
      { type: 'fn', f: (x) => K0 * (1 + r / 100) ** x, color: '--c1', width: 2, xmin: 0, xmax: n, alpha: 0.5 },
    ];
    for (let i = 0; i <= n; i++) items.push({ type: 'point', x: i, y: K0 * (1 + r / 100) ** i, color: '--c1', r: 3.5 });
    const Kn = K0 * (1 + r / 100) ** n;
    items.push({ type: 'point', x: n, y: Kn, color: '--c1', r: 6, label: kr(Kn), lalign: 'right', ldx: -10 });
    items.push({ type: 'text', x: n, y: K0 * (1 + (r / 100) * n), text: 'simpel rente', color: '--c2', align: 'right', dx: -8, dy: 14 });
    return items;
  });

  const fit = () => {
    const top = s.K0 * (1 + s.r / 100) ** s.n;
    g.setView({ xmin: -1, xmax: s.n + 1, ymin: -top * 0.06, ymax: top * 1.12 });
  };
  const sK = slider({ label: 'K_0', min: 1000, max: 50000, step: 1000, value: s.K0, format: (v) => `${v}`, onInput: (v) => { s.K0 = v; fit(); update(); } });
  const sr = slider({ label: 'r', min: 0.5, max: 15, step: 0.5, value: s.r, format: (v) => `${tn(v, 1)}\\,\\%`, onInput: (v) => { s.r = v; fit(); update(); } });
  const sn = slider({ label: 'n', min: 1, max: 40, step: 1, value: s.n, format: (v) => `${v}`, onInput: (v) => { s.n = v; fit(); update(); } });
  const info = el('div', { class: 'formula' });

  panel.append(
    hint('Skru på startkapital, rente og antal terminer. Prikkerne er kapitalen efter hver termin.'),
    el('div', { class: 'sliders' }, sK.row, sr.row, sn.row),
    info,
    card('Husk', `
      <ul>
        <li>Fremskrivningsfaktor: $a=1+r$. En stigning på $5\\,\\%$ giver $a=1{,}05$, et fald på $5\\,\\%$ giver $a=0{,}95$.</li>
        <li>Renteformlen: $K_n=K_0\\cdot(1+r)^n$</li>
        <li>Flere ændringer efter hinanden: <b>gang</b> fremskrivningsfaktorerne.</li>
      </ul>`),
  );

  function update() {
    const { K0, r, n } = s;
    const Kn = K0 * (1 + r / 100) ** n, simple = K0 * (1 + (r / 100) * n);
    info.innerHTML = math(`
      $$K_n=K_0\\cdot(1+r)^n=${K0}\\cdot ${tn(1 + r / 100, 3)}^{${n}}$$
      <div class="result">$$K_{${n}}\\approx ${tn(Kn)}\\text{ kr.}$$</div>
      <p>Samlet stigning: <b>${num((Kn / K0 - 1) * 100, 1)} %</b>. Med simpel rente (ingen rentes rente) ville det kun være ${kr(simple)}.</p>`);
    g.draw();
  }
  fit();
  update();
}

const exercises = [
  {
    id: 'af',
    title: 'Procent af et tal',
    make() {
      const p = pick([5, 10, 12, 15, 20, 25, 30, 40, 75]), x = pick([80, 120, 240, 350, 600, 1200, 2500]);
      return {
        prompt: `Hvad er $${p}\\,\\%$ af $${x}$?`,
        fields: [{ label: 'svar', answer: (p / 100) * x }],
        solution: `$$${tn(p / 100)}\\cdot ${x}=${tn((p / 100) * x)}$$`,
      };
    },
  },
  {
    id: 'aendring',
    title: 'Procentvis ændring',
    make() {
      const fra = pick([200, 250, 400, 500, 800, 1200]), p = pick([-40, -25, -20, -10, 5, 10, 15, 20, 30, 50]);
      const til = fra * (1 + p / 100);
      return {
        prompt: `En pris ændres fra $${fra}$ kr. til $${tn(til)}$ kr. Hvor mange procent er ændringen? (Brug minus ved et fald.)`,
        fields: [{ label: 'r\\;(\\%)', answer: p }],
        hint: '$r=\\dfrac{\\text{ny}-\\text{gammel}}{\\text{gammel}}$',
        solution: `$$r=\\frac{${tn(til)}-${fra}}{${fra}}=${tn(p / 100)}=${p}\\,\\%$$`,
      };
    },
  },
  {
    id: 'foer',
    title: 'Hvad var prisen før?',
    make() {
      const p = pick([-20, -25, 10, 20, 25, 50]), foer = pick([200, 400, 800, 1000, 1600]);
      const efter = foer * (1 + p / 100);
      return {
        prompt: `Efter ${p > 0 ? `en stigning på $${p}\\,\\%$` : `et fald på $${-p}\\,\\%$`} koster en vare $${tn(efter)}$ kr. Hvad kostede den før?`,
        fields: [{ label: 'før', answer: foer }],
        hint: 'Den nye pris er den gamle gange fremskrivningsfaktoren. Divider derfor med faktoren.',
        solution: `$$\\text{før}=\\frac{${tn(efter)}}{${tn(1 + p / 100)}}=${foer}\\text{ kr.}$$`,
      };
    },
  },
  {
    id: 'samlet',
    title: 'Flere ændringer i træk',
    make() {
      const p1 = pick([10, 20, 25, 50, -10, -20]), p2 = pick([-10, -20, -25, 10, 20, 30]);
      const tot = ((1 + p1 / 100) * (1 + p2 / 100) - 1) * 100;
      return {
        prompt: `En pris ${p1 > 0 ? 'stiger' : 'falder'} først med $${Math.abs(p1)}\\,\\%$ og ${p2 > 0 ? 'stiger' : 'falder'} derefter med $${Math.abs(p2)}\\,\\%$. Hvad er den samlede procentvise ændring?`,
        fields: [{ label: 'r\\;(\\%)', answer: tot, tol: 0.011 }],
        hint: 'Gang fremskrivningsfaktorerne – man må ikke bare lægge procenterne sammen!',
        solution: `$$${tn(1 + p1 / 100)}\\cdot ${tn(1 + p2 / 100)}=${tn(1 + tot / 100, 4)}\\quad\\Rightarrow\\quad r=${tn(tot, 2)}\\,\\%$$`,
      };
    },
  },
  {
    id: 'rente',
    title: 'Renteformlen',
    make() {
      const v = pick(['Kn', 'Kn', 'n', 'r']);
      const K0 = pick([5000, 10000, 20000, 50000]), r = pick([1, 2, 3, 4, 5, 6, 8]), n = rint(3, 20);
      const Kn = K0 * (1 + r / 100) ** n;
      if (v === 'Kn') return {
        prompt: `Der indsættes $${K0}$ kr. på en konto med en rente på $${r}\\,\\%$ pr. år. Hvor meget står der efter $${n}$ år? Afrund til hele kroner.`,
        fields: [{ label: `K_{${n}}`, answer: Kn, tol: 0.51 }],
        hint: '$K_n=K_0\\cdot(1+r)^n$',
        solution: `$$K_{${n}}=${K0}\\cdot ${tn(1 + r / 100)}^{${n}}\\approx ${tn(Kn, 0)}\\text{ kr.}$$`,
      };
      if (v === 'n') {
        const m = pick([1.5, 2, 3]), nn = Math.log(m) / Math.log(1 + r / 100);
        return {
          prompt: `Hvor mange år går der, før et beløb er ${m === 2 ? 'fordoblet' : m === 3 ? 'tredoblet' : 'vokset med 50 %'} med en rente på $${r}\\,\\%$ pr. år? Afrund til to decimaler.`,
          fields: [{ label: 'n', answer: nn, tol: 0.011 }],
          hint: `Løs ligningen $${tn(1 + r / 100)}^n=${tn(m)}$ med logaritmer.`,
          solution: `$$${tn(1 + r / 100)}^n=${tn(m)}\\quad\\Leftrightarrow\\quad n=\\frac{\\ln(${tn(m)})}{\\ln(${tn(1 + r / 100)})}\\approx ${tn(nn)}$$`,
        };
      }
      return {
        prompt: `Et beløb på $${K0}$ kr. er vokset til $${tn(Kn, 2)}$ kr. på $${n}$ år. Hvad er den årlige rente i procent? Afrund til to decimaler.`,
        fields: [{ label: 'r\\;(\\%)', answer: r, tol: 0.011 }],
        hint: '$r=\\sqrt[n]{\\dfrac{K_n}{K_0}}-1$',
        solution: `$$r=\\left(\\frac{${tn(Kn, 2)}}{${K0}}\\right)^{1/${n}}-1\\approx ${tn(r / 100, 4)}=${r}\\,\\%$$`,
      };
    },
  },
];

const learn = `
<h2>Procent</h2>
<p>"Procent" betyder hundrededele: $15\\,\\%=\\frac{15}{100}=0{,}15$.</p>
<div class="rule">$$\\text{del}=r\\cdot\\text{helhed}\\qquad r=\\frac{\\text{ny}-\\text{gammel}}{\\text{gammel}}$$</div>

<h2>Fremskrivningsfaktor</h2>
<p>En ændring på $r$ procent svarer til at gange med <b>fremskrivningsfaktoren</b> $a=1+r$.</p>
<div class="example">Stigning på $20\\,\\%$: gang med $1{,}20$. Fald på $20\\,\\%$: gang med $0{,}80$.</div>
<p>Flere ændringer i træk: <b>gang faktorerne sammen</b>. $+20\\,\\%$ efterfulgt af $-20\\,\\%$ giver $1{,}2\\cdot 0{,}8=0{,}96$, altså et samlet fald på $4\\,\\%$ – ikke $0\\,\\%$!</p>

<h2>Renteformlen</h2>
<div class="rule">$$K_n=K_0\\cdot(1+r)^n$$</div>
<p>$K_0$ er startkapitalen, $r$ renten pr. termin og $n$ antal terminer. Formlen kan isoleres:</p>
<div class="rule">$$n=\\frac{\\ln(K_n/K_0)}{\\ln(1+r)}\\qquad r=\\sqrt[n]{\\frac{K_n}{K_0}}-1\\qquad K_0=\\frac{K_n}{(1+r)^n}$$</div>
<p>Renteformlen er et eksempel på <b>eksponentiel vækst</b> – se også emnet <a href="#/eksponentielle">eksponentielle funktioner</a>.</p>`;

export default {
  id: 'procent',
  title: 'Procent og rente',
  short: 'Procent',
  formula: 'K_n=K_0\\cdot(1+r)^n',
  desc: 'Procentregning, fremskrivningsfaktor, flere ændringer i træk og renteformlen.',
  learn,
  explore,
  exercises,
};
