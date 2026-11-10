import { Graph } from '../graph.js';
import { el, math, slider, toggle, exploreLayout, card, hint } from '../ui.js';
import { rint, rintNZ, pick, shuffle, tn, par, pt, eq, polyTex, round, num, near } from '../util.js';

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { a: 1, b: -2, c: -3, vertex: true, roots: true, axis: true, yint: false };
  const g = new Graph(graphBox, { xmin: -8, xmax: 8, ymin: -6, ymax: 7 });

  const info = () => {
    const { a, b, c } = s;
    let d = b * b - 4 * a * c;
    if (Math.abs(d) < 1e-9) d = 0;
    if (a === 0) return { d, h: NaN, k: NaN, roots: b !== 0 ? [-c / b] : [] };
    const h = -b / (2 * a), k = -d / (4 * a);
    const roots = d > 0 ? [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)].sort((p, q) => p - q) : d === 0 ? [h] : [];
    return { d, h, k, roots };
  };

  g.setScene(() => {
    const { a, b, c } = s;
    const { h, k, roots } = info();
    const items = [{ type: 'fn', f: (x) => a * x * x + b * x + c, color: '--c1', width: 3 }];
    if (a !== 0 && s.axis) items.push({ type: 'vline', x: h, color: '--c5', width: 1.5, dash: true });
    if (s.roots) roots.forEach((r, i) => items.push({
      type: 'point', x: r, y: 0, color: '--c2', ldy: 16,
      label: roots.length > 1 ? `x${i ? '₂' : '₁'} = ${num(r)}` : `x = ${num(r)}`,
    }));
    if (s.yint) items.push({ type: 'point', x: 0, y: c, color: '--c4', label: `c = ${num(c)}`, ldx: -12, lalign: 'right' });
    if (a !== 0 && s.vertex) items.push({
      type: 'point', x: h, y: k, color: '--c3', label: `T(${num(h)}; ${num(k)})`, snap: 0.5,
      drag: (x, y) => {
        s.b = round(-2 * s.a * x, 2);
        s.c = round(s.a * x * x + y, 2);
        sb.set(s.b); sc.set(s.c);
        update();
      },
    });
    return items;
  });

  const sa = slider({ label: 'a', min: -3, max: 3, step: 0.1, value: s.a, onInput: (v) => { s.a = v; update(); } });
  const sb = slider({ label: 'b', min: -10, max: 10, step: 0.1, value: s.b, onInput: (v) => { s.b = v; update(); } });
  const sc = slider({ label: 'c', min: -10, max: 10, step: 0.1, value: s.c, onInput: (v) => { s.c = v; update(); } });

  const formula = el('div', { class: 'formula' });
  panel.append(
    hint('Skru på $a$, $b$ og $c$ – eller træk direkte i toppunktet $T$.'),
    el('div', { class: 'sliders' }, sa.row, sb.row, sc.row),
    formula,
    el('div', { class: 'toggles' },
      toggle('Toppunkt', s.vertex, (v) => { s.vertex = v; update(); }),
      toggle('Nulpunkter (rødder)', s.roots, (v) => { s.roots = v; update(); }),
      toggle('Symmetriakse', s.axis, (v) => { s.axis = v; update(); }),
      toggle('Skæring med <i>y</i>-aksen', s.yint, (v) => { s.yint = v; update(); }),
    ),
    card('Husk', `
      <ul>
        <li><b>$a$</b> bestemmer formen: $a>0$ giver grene opad, $a<0$ grene nedad. Jo større $|a|$, jo smallere parabel.</li>
        <li><b>$c$</b> er skæringen med $y$-aksen.</li>
        <li><b>Diskriminanten</b> $d=b^2-4ac$ fortæller, hvor mange nulpunkter der er.</li>
        <li><b>Toppunktet</b> er $T=\\left(\\dfrac{-b}{2a}\\,;\\,\\dfrac{-d}{4a}\\right)$.</li>
      </ul>`),
  );

  function update() {
    const { a, b, c } = s;
    const { d, h, k, roots } = info();
    if (a === 0) {
      formula.innerHTML = math(`<div class="result">$$f(x)=${polyTex([b, c])}$$</div>
        <p>Når $a=0$, er der ikke tale om et andengradspolynomium – grafen er en ret linje.</p>`);
    } else {
      const count = d > 0 ? 'to løsninger' : d === 0 ? 'én løsning' : 'ingen løsninger';
      const rootsTex = d > 0
        ? `$$x=\\frac{-b\\pm\\sqrt{d}}{2a}\\quad\\Rightarrow\\quad x_1${eq(roots[0])}${tn(roots[0])},\\; x_2${eq(roots[1])}${tn(roots[1])}$$`
        : d === 0 ? `$$x=\\frac{-b}{2a}${eq(h)}${tn(h)}$$` : '';
      formula.innerHTML = math(`
        <div class="result">$$f(x)=${polyTex([a, b, c])}$$</div>
        $$d=b^2-4ac=${par(b)}^2-4\\cdot${par(a)}\\cdot${par(c)}${eq(d)}${tn(d)}$$
        <p><span class="badge ${d > 0 ? 'b-ok' : d === 0 ? 'b-mid' : 'b-bad'}">d ${d > 0 ? '&gt;' : d === 0 ? '=' : '&lt;'} 0</span> Ligningen $f(x)=0$ har ${count}.</p>
        ${rootsTex}
        $$T=\\left(\\frac{-b}{2a}\\,;\\,\\frac{-d}{4a}\\right)=${pt(h, k)}$$`);
    }
    g.draw();
  }
  update();
}

// ---------- opgaver ----------

function vertexPoly() {
  const a = pick([1, -1, 2, -2, 0.5, -0.5]);
  const h = Math.abs(a) === 0.5 ? pick([-4, -2, 0, 2, 4]) : rint(-4, 4);
  const k = rint(-5, 5);
  return { a, h, k, b: -2 * a * h, c: a * h * h + k };
}

const exercises = [
  {
    id: 'disc',
    title: 'Diskriminanten',
    make() {
      const a = rintNZ(-3, 3), b = rint(-6, 6), c = rint(-6, 6);
      const d = b * b - 4 * a * c;
      return {
        prompt: `Beregn diskriminanten for $f(x)=${polyTex([a, b, c])}$.`,
        fields: [{ label: 'd', answer: d }],
        hint: 'Diskriminanten er $d=b^2-4ac$. Pas på fortegnene!',
        solution: `Her er $a=${tn(a)}$, $b=${tn(b)}$ og $c=${tn(c)}$. $$d=b^2-4ac=${par(b)}^2-4\\cdot${par(a)}\\cdot${par(c)}=${tn(b * b)}${-4 * a * c < 0 ? '-' : '+'}${tn(Math.abs(4 * a * c))}=${tn(d)}$$`,
      };
    },
  },
  {
    id: 'count',
    title: 'Antal løsninger',
    make() {
      const target = pick([0, 1, 2]);
      let a, b, c, d;
      if (target === 1) {
        a = pick([1, -1, 2, -2, 3]);
        const r = rint(-3, 3);
        b = -2 * a * r; c = a * r * r; d = 0;
      } else {
        do { a = rintNZ(-3, 3); b = rint(-6, 6); c = rint(-6, 6); d = b * b - 4 * a * c; }
        while (target === 0 ? d >= 0 : d <= 0);
      }
      const labels = ['Ingen løsninger', 'Én løsning', 'To løsninger'];
      return {
        prompt: `Hvor mange løsninger har ligningen $${polyTex([a, b, c])}=0$?`,
        choices: labels.map((html, i) => ({ html, correct: i === target })),
        hint: 'Beregn diskriminanten $d=b^2-4ac$.',
        solution: `$$d=${par(b)}^2-4\\cdot${par(a)}\\cdot${par(c)}=${tn(d)}$$ Da $d${d > 0 ? '>' : d === 0 ? '=' : '<'}0$, har ligningen ${labels[target].toLowerCase()}.`,
      };
    },
  },
  {
    id: 'roots',
    title: 'Løs andengradsligningen',
    make() {
      const a = pick([1, 1, -1, 2, -2]);
      const r1 = rint(-5, 5);
      let r2;
      do r2 = rint(-5, 5); while (r2 === r1);
      const b = -a * (r1 + r2), c = a * r1 * r2, d = b * b - 4 * a * c, sq = Math.sqrt(d);
      return {
        prompt: `Løs ligningen $${polyTex([a, b, c])}=0$.`,
        fields: [{ label: 'x_1', answer: r1 }, { label: 'x_2', answer: r2 }],
        unordered: true,
        hint: 'Beregn diskriminanten, og brug $x=\\dfrac{-b\\pm\\sqrt{d}}{2a}$.',
        solution: `$$d=${par(b)}^2-4\\cdot${par(a)}\\cdot${par(c)}=${tn(d)}$$ $$x=\\frac{-${par(b)}\\pm\\sqrt{${tn(d)}}}{2\\cdot${par(a)}}=\\frac{${tn(-b)}\\pm${tn(sq)}}{${tn(2 * a)}}$$ Altså $x=${tn(Math.min(r1, r2))}$ eller $x=${tn(Math.max(r1, r2))}$.`,
      };
    },
  },
  {
    id: 'vertex',
    title: 'Find toppunktet',
    make() {
      const { a, b, c, h, k } = vertexPoly();
      return {
        prompt: `Bestem toppunktet $T$ for parablen med ligningen $y=${polyTex([a, b, c])}$.`,
        fields: [{ label: 'x_T', answer: h }, { label: 'y_T', answer: k }],
        hint: 'Brug $x_T=\\dfrac{-b}{2a}$, og find $y_T$ ved at indsætte $x_T$ i forskriften.',
        solution: `$$x_T=\\frac{-b}{2a}=\\frac{${tn(-b)}}{${tn(2 * a)}}=${tn(h)}$$ $$y_T=f(${tn(h)})=${tn(k)}$$ Toppunktet er $T${pt(h, k)}$.`,
      };
    },
  },
  {
    id: 'dragvertex',
    title: 'Placér parablen',
    make() {
      const { a, b, c, h, k } = vertexPoly();
      let st;
      do st = { h: rint(-4, 4), k: rint(-4, 4) }; while (st.h === h && st.k === k);
      return {
        prompt: `Parablen har samme form som grafen for $f(x)=${polyTex([a, b, c])}$. Træk i toppunktet, så parablen bliver præcis grafen for $f$.`,
        graph: {
          view: { xmin: -8, xmax: 8, ymin: -6, ymax: 6 },
          state: st,
          scene: (s, rev) => [
            rev && { type: 'fn', f: (x) => a * x * x + b * x + c, color: '--c3', width: 2.5, dash: true },
            { type: 'fn', f: (x) => a * (x - s.h) ** 2 + s.k, color: '--c1', width: 3 },
            { type: 'point', x: s.h, y: s.k, color: '--c1', label: 'T', snap: 0.5, drag: (x, y) => { s.h = x; s.k = y; } },
          ],
        },
        check: (s) => near(s.h, h) && near(s.k, k),
        hint: 'Find toppunktet med $x_T=\\dfrac{-b}{2a}$ og $y_T=f(x_T)$.',
        solution: `$$x_T=\\frac{-b}{2a}=\\frac{${tn(-b)}}{${tn(2 * a)}}=${tn(h)},\\qquad y_T=f(${tn(h)})=${tn(k)}$$ Toppunktet skal derfor ligge i $${pt(h, k)}$.`,
      };
    },
  },
  {
    id: 'signs',
    title: 'Aflæs fortegn',
    make() {
      let a, h, k, c;
      do { a = pick([0.5, 1, 2, -0.5, -1, -2]); h = rint(-3, 3); k = rint(-4, 4); c = a * h * h + k; }
      while (c === 0 || Math.abs(c) > 5.5);
      const opts = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      const sa = Math.sign(a), sc = Math.sign(c);
      return {
        prompt: 'Grafen viser parablen for $f(x)=ax^2+bx+c$. Hvilket udsagn er sandt?',
        graph: {
          view: { xmin: -7, xmax: 7, ymin: -6, ymax: 6 },
          scene: (st, rev) => [
            { type: 'fn', f: (x) => a * (x - h) ** 2 + k, color: '--c1', width: 3 },
            rev && { type: 'point', x: 0, y: c, color: '--c4', label: 'c', ldx: -12, lalign: 'right' },
          ],
        },
        choices: shuffle(opts.map(([p, q]) => ({
          html: `$a${p > 0 ? '>' : '<'}0$ og $c${q > 0 ? '>' : '<'}0$`,
          correct: p === sa && q === sc,
        }))),
        hint: 'Vender grenene op eller ned? Og hvor skærer grafen $y$-aksen?',
        solution: `Grenene vender ${a > 0 ? 'opad, så $a>0$' : 'nedad, så $a<0$'}. Grafen skærer $y$-aksen ${c > 0 ? 'over' : 'under'} $x$-aksen, så $c${c > 0 ? '>' : '<'}0$.`,
      };
    },
  },
];

export default {
  id: 'andengrads',
  title: 'Andengradspolynomier',
  short: 'Andengrads',
  formula: 'f(x)=ax^2+bx+c',
  desc: 'Parabler, diskriminant, nulpunkter og toppunkt. Træk i toppunktet og se koefficienterne ændre sig.',
  explore,
  exercises,
};
