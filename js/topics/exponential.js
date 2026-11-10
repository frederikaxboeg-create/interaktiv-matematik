import { Graph } from '../graph.js';
import { el, math, slider, toggle, exploreLayout, card, hint } from '../ui.js';
import { rint, pick, shuffle, tn, pt, eq, round, num, clamp } from '../util.js';

const expTex = (b, a) => `${tn(b, 4)}\\cdot {${tn(a, 4)}}^{x}`;

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { b: 2, a: 1.5, double: true };
  const g = new Graph(graphBox, { xmin: -3, xmax: 10, ymin: -2, ymax: 22, equalAspect: false });

  g.setScene(() => {
    const { a, b } = s;
    const f = (x) => b * a ** x;
    const items = [{ type: 'fn', f, color: '--c1', width: 3 }];
    if (s.double && a !== 1) {
      const grow = a > 1;
      const T = Math.log(grow ? 2 : 0.5) / Math.log(a);
      for (let i = 0; i < 6; i++) {
        const x0 = i * T, x1 = (i + 1) * T;
        if (x0 > g.view.xmax) break;
        const y0 = f(x0), y1 = f(x1);
        items.push({ type: 'segment', x1: x0, y1: y0, x2: x1, y2: y0, color: '--c5', width: 2, dash: true, label: i === 0 ? (grow ? 'T₂' : 'T½') : null });
        items.push({ type: 'segment', x1: x1, y1: y0, x2: x1, y2: y1, color: '--c5', width: 2, dash: true, label: i === 0 ? (grow ? '· 2' : '· ½') : null });
        items.push({ type: 'point', x: x1, y: y1, color: '--c5', r: 4 });
      }
    }
    items.push({
      type: 'point', x: 0, y: b, color: '--c2', label: `b = ${num(b, 1)}`, ldx: -12, lalign: 'right',
      drag: (x, y) => { s.b = clamp(round(y, 1), 0.1, 40); sb.set(s.b); update(); },
    });
    items.push({
      type: 'point', x: 1, y: b * a, color: '--c3', label: `(1; b·a)`,
      drag: (x, y) => { s.a = clamp(round(y / s.b, 2), 0.1, 3); sa.set(s.a); update(); },
    });
    return items;
  });

  const sb = slider({ label: 'b', min: 0.1, max: 20, step: 0.1, value: s.b, onInput: (v) => { s.b = v; update(); } });
  const sa = slider({ label: 'a', min: 0.1, max: 3, step: 0.01, value: s.a, onInput: (v) => { s.a = v; update(); } });
  const formula = el('div', { class: 'formula' });
  const table = el('div', { class: 'table-wrap' });

  panel.append(
    hint('Træk lodret i punkterne – eller brug skyderne. Punktet ved $x=1$ styrer $a$.'),
    el('div', { class: 'sliders' }, sb.row, sa.row),
    formula,
    el('div', { class: 'toggles' }, toggle('Vis fordoblings-/halveringskonstant', s.double, (v) => { s.double = v; update(); })),
    table,
    card('Husk', `
      <ul>
        <li><b>$b$</b> er begyndelsesværdien: grafen skærer $y$-aksen i $(0\\,;\\,b)$.</li>
        <li><b>$a$</b> er fremskrivningsfaktoren: når $x$ vokser med 1, <i>ganges</i> $y$ med $a$.</li>
        <li>$a=1+r$, hvor $r$ er vækstraten. $a>1$: voksende. $0<a<1$: aftagende.</li>
        <li>$T_2=\\dfrac{\\ln 2}{\\ln a}$ og $T_{\\frac12}=\\dfrac{\\ln\\frac12}{\\ln a}$.</li>
      </ul>`),
  );

  function update() {
    const { a, b } = s;
    const r = (a - 1) * 100;
    let T = '';
    if (a > 1) { const v = Math.log(2) / Math.log(a); T = `$$T_2=\\frac{\\ln 2}{\\ln ${tn(a)}}\\approx ${tn(v)}$$<p class="muted">Funktionsværdien fordobles, hver gang $x$ vokser med $${tn(v)}$.</p>`; }
    else if (a < 1) { const v = Math.log(0.5) / Math.log(a); T = `$$T_{\\frac12}=\\frac{\\ln \\frac12}{\\ln ${tn(a)}}\\approx ${tn(v)}$$<p class="muted">Funktionsværdien halveres, hver gang $x$ vokser med $${tn(v)}$.</p>`; }
    formula.innerHTML = math(`
      <div class="result">$$f(x)=${expTex(b, a)}$$</div>
      <p>${a > 1 ? 'Voksende' : a < 1 ? 'Aftagende' : 'Konstant'}: vækstraten er $r=a-1${eq(r / 100, 4)}${tn(r / 100, 4)}$, dvs. <b>${r >= 0 ? '+' : '−'}${num(Math.abs(r), 2)} %</b> pr. skridt.</p>
      ${T}`);
    const rows = [0, 1, 2, 3, 4, 5].map((x) => `<tr><td>${x}</td><td>${num(b * a ** x, 2)}</td><td class="muted">${x ? `· ${num(a, 2)}` : ''}</td></tr>`).join('');
    table.innerHTML = `<table class="vt"><thead><tr><th>x</th><th>f(x)</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    g.draw();
  }
  update();
}

// ---------- opgaver ----------

const exercises = [
  {
    id: 'factor',
    title: 'Fra procent til fremskrivningsfaktor',
    make() {
      const grow = Math.random() < 0.55;
      const p = grow ? pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]) : pick([2, 3, 5, 8, 10, 15, 20, 25, 30]);
      const a = grow ? 1 + p / 100 : 1 - p / 100;
      const ctx = grow
        ? pick([`Et beløb på en opsparingskonto vokser med ${p} % om året.`, `En bakteriekultur vokser med ${p} % i timen.`, `Antallet af brugere af en app stiger med ${p} % om måneden.`])
        : pick([`Mængden af et lægemiddel i blodet falder med ${p} % i timen.`, `Værdien af en bil falder med ${p} % om året.`, `Et radioaktivt stof henfalder med ${p} % om dagen.`]);
      return {
        prompt: `${ctx} Udviklingen kan beskrives med $f(x)=b\\cdot a^x$. Bestem fremskrivningsfaktoren $a$.`,
        fields: [{ label: 'a', answer: a, tol: 0.0001 }],
        hint: 'Fremskrivningsfaktoren er $a=1+r$, hvor $r$ er vækstraten som decimaltal. Et fald giver en negativ $r$.',
        solution: `$$r=${grow ? '' : '-'}${p}\\,\\%=${grow ? '' : '-'}${tn(p / 100)},\\qquad a=1+r=${tn(a, 4)}$$`,
      };
    },
  },
  {
    id: 'evaluate',
    title: 'Fremskrivning',
    make() {
      const b = pick([50, 100, 200, 250, 500, 800, 1000, 1500, 2000]);
      const a = pick([1.02, 1.03, 1.04, 1.05, 1.08, 1.1, 0.9, 0.95, 0.85, 0.8]);
      const x = rint(3, 12);
      const ans = b * a ** x;
      return {
        prompt: `Givet $f(x)=${expTex(b, a)}$. Beregn $f(${x})$. Afrund til én decimal.`,
        fields: [{ label: `f(${x})`, answer: ans, tol: 0.06 }],
        hint: `Indsæt $x=${x}$: $f(${x})=${tn(b)}\\cdot ${tn(a)}^{${x}}$. Husk at potensen udregnes før gangingen.`,
        solution: `$$f(${x})=${tn(b)}\\cdot {${tn(a)}}^{${x}}\\approx ${tn(ans, 1)}$$`,
      };
    },
  },
  {
    id: 'double',
    title: 'Fordoblings- og halveringskonstant',
    make() {
      const grow = Math.random() < 0.55;
      const a = grow ? pick([1.03, 1.05, 1.07, 1.1, 1.15, 1.2, 1.25, 1.5]) : pick([0.97, 0.95, 0.9, 0.85, 0.8, 0.75, 0.6]);
      const b = pick([3, 10, 25, 100]);
      const T = Math.log(grow ? 2 : 0.5) / Math.log(a);
      const name = grow ? 'T_2' : 'T_{\\frac12}';
      return {
        prompt: `Bestem ${grow ? 'fordoblingskonstanten' : 'halveringskonstanten'} $${name}$ for $f(x)=${expTex(b, a)}$. Afrund til to decimaler.`,
        fields: [{ label: name, answer: T, tol: 0.011 }],
        hint: grow ? '$T_2=\\dfrac{\\ln 2}{\\ln a}$' : '$T_{\\frac12}=\\dfrac{\\ln \\frac12}{\\ln a}$',
        solution: `$$${name}=\\frac{\\ln ${grow ? '2' : '\\frac12'}}{\\ln ${tn(a)}}\\approx ${tn(T)}$$ Bemærk, at $b=${tn(b)}$ ikke påvirker ${grow ? 'fordoblings' : 'halverings'}konstanten.`,
      };
    },
  },
  {
    id: 'twopoints',
    title: 'Forskrift ud fra to punkter',
    make() {
      const a = pick([2, 3, 0.5, 1.5, 1.2, 0.8]);
      const b = pick([2, 4, 5, 10, 20, 100]);
      const x1 = rint(0, 3), dx = pick([1, 2, 3]), x2 = x1 + dx;
      const y1 = round(b * a ** x1, 6), y2 = round(b * a ** x2, 6);
      const root = dx === 1 ? '' : `[${dx}]`;
      return {
        prompt: `Grafen for $f(x)=b\\cdot a^x$ går gennem punkterne $${pt(x1, y1, 4)}$ og $${pt(x2, y2, 4)}$. Bestem $a$ og $b$.`,
        fields: [{ label: 'a', answer: a, tol: 0.01 }, { label: 'b', answer: b, rel: 0.01 }],
        hint: '$a=\\sqrt[x_2-x_1]{\\dfrac{y_2}{y_1}}$ og $b=\\dfrac{y_1}{a^{x_1}}$.',
        solution: `$$a=\\sqrt${root}{\\frac{y_2}{y_1}}=\\sqrt${root}{\\frac{${tn(y2, 4)}}{${tn(y1, 4)}}}=${tn(a)}$$ $$b=\\frac{y_1}{a^{x_1}}=\\frac{${tn(y1, 4)}}{${tn(a)}^{${x1}}}=${tn(b)}$$ Altså $f(x)=${expTex(b, a)}$.`,
      };
    },
  },
  {
    id: 'match',
    title: 'Hvilken forskrift passer?',
    make() {
      const b = rint(1, 5);
      const a = pick([1.5, 2, 0.5, 0.7, 1.3, 0.6]);
      const inv = round(1 / a, 2);
      let b2;
      do b2 = rint(1, 6); while (b2 === b);
      const opts = [[b, a, true], [b, inv, false], [b2, a, false], [b2, inv, false]];
      return {
        prompt: 'Hvilken forskrift hører til grafen?',
        graph: {
          view: { xmin: -3, xmax: 6, ymin: -1, ymax: 10, equalAspect: false },
          scene: (st, rev) => [
            { type: 'fn', f: (x) => b * a ** x, color: '--c1', width: 3 },
            rev && { type: 'point', x: 0, y: b, color: '--c2', label: `b = ${b}`, ldx: -12, lalign: 'right' },
          ],
        },
        choices: shuffle(opts.map(([bb, aa, ok]) => ({ html: `$f(x)=${expTex(bb, aa)}$`, correct: ok }))),
        hint: 'Hvor skærer grafen $y$-aksen? Er grafen voksende eller aftagende?',
        solution: `Grafen skærer $y$-aksen i $(0\\,;\\,${b})$, så $b=${b}$. Den er ${a > 1 ? 'voksende, så $a>1$' : 'aftagende, så $0<a<1$'}. Derfor er $f(x)=${expTex(b, a)}$.`,
      };
    },
  },
];

export default {
  id: 'eksponentielle',
  title: 'Eksponentielle funktioner',
  short: 'Eksponentielle',
  formula: 'f(x)=b\\cdot a^x',
  desc: 'Vækst og henfald, fremskrivningsfaktor, procent og fordoblingskonstant.',
  explore,
  exercises,
};
