import { Graph } from '../graph.js';
import { el, math, slider, toggle, segmented, exploreLayout, card, hint } from '../ui.js';
import { rint, pick, tn, par, pt, eq, linTex, polyTex, round, num, near } from '../util.js';

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { mode: 'points', p1: { x: -2, y: -1 }, p2: { x: 2, y: 3 }, a: 1, b: 1, tri: true, yint: true, zero: false };
  const g = new Graph(graphBox, { xmin: -8, xmax: 8, ymin: -6, ymax: 6 });

  const line = () => {
    if (s.mode === 'sliders') return { a: s.a, b: s.b };
    if (s.p1.x === s.p2.x) return null;
    const a = (s.p2.y - s.p1.y) / (s.p2.x - s.p1.x);
    return { a, b: s.p1.y - a * s.p1.x };
  };

  g.setScene(() => {
    const L = line();
    const items = [];
    if (L) {
      items.push({ type: 'fn', f: (x) => L.a * x + L.b, color: '--c1', width: 3 });
      if (s.tri) {
        const x0 = s.mode === 'points' ? Math.min(s.p1.x, s.p2.x) : 0;
        const y0 = L.a * x0 + L.b;
        items.push({ type: 'polygon', points: [[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + L.a]], color: '--c3', alpha: 0.12 });
        items.push({ type: 'segment', x1: x0, y1: y0, x2: x0 + 1, y2: y0, color: '--c2', width: 2.5, label: '1' });
        items.push({ type: 'segment', x1: x0 + 1, y1: y0, x2: x0 + 1, y2: y0 + L.a, color: '--c3', width: 2.5, label: `a = ${num(L.a)}` });
      }
      if (s.yint) items.push({ type: 'point', x: 0, y: L.b, color: '--c4', label: `(0; ${num(L.b)})`, ldx: -12, ldy: L.a < 0 ? 16 : -13, lalign: 'right' });
      if (s.zero && L.a !== 0) items.push({ type: 'point', x: -L.b / L.a, y: 0, color: '--c5', label: `x = ${num(-L.b / L.a)}`, ldy: 16 });
    } else {
      items.push({ type: 'vline', x: s.p1.x, color: '--c1', width: 3 });
    }
    if (s.mode === 'points') {
      items.push({ type: 'point', x: s.p1.x, y: s.p1.y, color: '--c1', label: 'P₁', snap: 0.5, drag: (x, y) => { s.p1 = { x, y }; update(); } });
      items.push({ type: 'point', x: s.p2.x, y: s.p2.y, color: '--c1', label: 'P₂', snap: 0.5, drag: (x, y) => { s.p2 = { x, y }; update(); } });
    }
    return items;
  });

  const sa = slider({ label: 'a', min: -5, max: 5, step: 0.1, value: s.a, onInput: (v) => { s.a = v; update(); } });
  const sb = slider({ label: 'b', min: -6, max: 6, step: 0.1, value: s.b, onInput: (v) => { s.b = v; update(); } });
  const sliders = el('div', { class: 'sliders', hidden: true }, sa.row, sb.row);

  const modeCtl = segmented(
    [{ value: 'points', label: 'Træk i punkter' }, { value: 'sliders', label: 'Brug skydere' }],
    s.mode,
    (v) => {
      const L = line();
      if (v === 'sliders' && L) { s.a = round(L.a, 1); s.b = round(L.b, 1); sa.set(s.a); sb.set(s.b); }
      if (v === 'points' && L) { s.p1 = { x: -2, y: round(-2 * L.a + L.b, 2) }; s.p2 = { x: 2, y: round(2 * L.a + L.b, 2) }; }
      s.mode = v;
      sliders.hidden = v !== 'sliders';
      update();
    },
  );

  const formula = el('div', { class: 'formula' });
  const toggles = el('div', { class: 'toggles' },
    toggle('Hældningstrekant', s.tri, (v) => { s.tri = v; update(); }),
    toggle('Skæring med <i>y</i>-aksen', s.yint, (v) => { s.yint = v; update(); }),
    toggle('Nulpunkt', s.zero, (v) => { s.zero = v; update(); }),
  );

  panel.append(
    modeCtl,
    sliders,
    formula,
    toggles,
    card('Husk', `
      <p>En lineær funktion har forskriften $f(x)=ax+b$.</p>
      <ul>
        <li><b>$a$ er hældningen:</b> når $x$ vokser med 1, ændres $y$ med $a$.</li>
        <li><b>$b$ er skæringen med $y$-aksen:</b> grafen går gennem $(0\\,;\\,b)$.</li>
        <li>$a>0$: voksende. $a<0$: aftagende. $a=0$: vandret.</li>
      </ul>`),
  );

  function update() {
    const L = line();
    if (!L) {
      formula.innerHTML = math('<p>Punkterne har samme $x$-værdi. Linjen er <b>lodret</b>, har ingen hældning og er ikke graf for en funktion.</p>');
    } else if (s.mode === 'points') {
      const { p1, p2 } = s;
      formula.innerHTML = math(`
        <p class="muted">Hældning ud fra to punkter:</p>
        $$a=\\frac{y_2-y_1}{x_2-x_1}=\\frac{${tn(p2.y)}-${par(p1.y)}}{${tn(p2.x)}-${par(p1.x)}}${eq(L.a)}${tn(L.a)}$$
        <p class="muted">Skæring med $y$-aksen:</p>
        $$b=y_1-a\\cdot x_1=${tn(p1.y)}-${par(L.a)}\\cdot${par(p1.x)}${eq(L.b)}${tn(L.b)}$$
        <div class="result">$$f(x)=${linTex(L.a, L.b)}$$</div>`);
    } else {
      formula.innerHTML = math(`
        <div class="result">$$f(x)=${linTex(L.a, L.b)}$$</div>
        <p>${L.a > 0 ? 'Grafen er <b>voksende</b>' : L.a < 0 ? 'Grafen er <b>aftagende</b>' : 'Grafen er <b>vandret</b>'}: for hvert skridt på 1 til højre ${L.a === 0 ? 'ændres $y$ ikke' : `${L.a > 0 ? 'stiger' : 'falder'} $y$ med $${tn(Math.abs(L.a))}$`}.</p>
        ${L.a !== 0 ? `<p>Nulpunkt: $x=-\\dfrac{b}{a}${eq(-L.b / L.a)}${tn(-L.b / L.a)}$</p>` : ''}`);
    }
    g.draw();
  }
  update();
  panel.prepend(hint('Træk i punkterne $P_1$ og $P_2$ – eller skift til skydere.'));
}

// ---------- opgaver ----------

const SLOPES = [-3, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 3];

const exercises = [
  {
    id: 'slope',
    title: 'Hældning fra to punkter',
    make() {
      const a = pick(SLOPES), b = rint(-4, 4);
      const x1 = rint(-5, 2), dx = Number.isInteger(a) ? rint(1, 4) : pick([2, 4]);
      const x2 = x1 + dx, y1 = a * x1 + b, y2 = a * x2 + b;
      return {
        prompt: `En ret linje går gennem punkterne $A${pt(x1, y1)}$ og $B${pt(x2, y2)}$. Bestem linjens hældning $a$.`,
        fields: [{ label: 'a', answer: a }],
        hint: 'Brug formlen $a=\\dfrac{y_2-y_1}{x_2-x_1}$.',
        solution: `$$a=\\frac{y_2-y_1}{x_2-x_1}=\\frac{${tn(y2)}-${par(y1)}}{${tn(x2)}-${par(x1)}}=\\frac{${tn(y2 - y1)}}{${tn(dx)}}=${tn(a)}$$`,
      };
    },
  },
  {
    id: 'read',
    title: 'Aflæs forskriften',
    make() {
      const a = pick([-3, -2, -1, -0.5, 0.5, 1, 2, 3]), b = rint(-4, 4);
      const run = Number.isInteger(a) ? 1 : 2;
      return {
        prompt: 'Grafen viser en lineær funktion $f(x)=ax+b$. Aflæs $a$ og $b$.',
        graph: {
          view: { xmin: -7, xmax: 7, ymin: -5, ymax: 5 },
          scene: (st, rev) => [
            { type: 'fn', f: (x) => a * x + b, color: '--c1', width: 3 },
            rev && { type: 'segment', x1: 0, y1: b, x2: run, y2: b, color: '--c2', label: String(run) },
            rev && { type: 'segment', x1: run, y1: b, x2: run, y2: b + a * run, color: '--c3', label: num(a * run) },
            rev && { type: 'point', x: 0, y: b, color: '--c4', label: `b = ${num(b)}`, ldx: -12, lalign: 'right' },
          ],
        },
        fields: [{ label: 'a', answer: a }, { label: 'b', answer: b }],
        hint: '$b$ er der, hvor grafen skærer $y$-aksen. Gå 1 til højre fra et punkt på linjen – så ændrer $y$ sig med $a$.',
        solution: `Grafen skærer $y$-aksen i $(0\\,;\\,${tn(b)})$, så $b=${tn(b)}$. Går man ${run} til højre, ${a > 0 ? 'stiger' : 'falder'} grafen med $${tn(Math.abs(a * run))}$, så $a=\\frac{${tn(a * run)}}{${run}}=${tn(a)}$.<br>Altså er $f(x)=${linTex(a, b)}$.`,
      };
    },
  },
  {
    id: 'draw',
    title: 'Tegn linjen',
    interactive: true,
    make() {
      const a = pick([-2, -1, -0.5, 0.5, 1, 2]), b = rint(-3, 3);
      const onLine = (p) => near(p.y, a * p.x + b);
      let state;
      do state = { p: { x: -4, y: rint(-4, 4) }, q: { x: 4, y: rint(-4, 4) } };
      while (onLine(state.p) && onLine(state.q));
      return {
        prompt: `Træk i de to punkter, så linjen gennem dem bliver grafen for $f(x)=${linTex(a, b)}$.`,
        graph: {
          view: { xmin: -7, xmax: 7, ymin: -5, ymax: 5 },
          state,
          scene: (st, rev) => [
            rev && { type: 'fn', f: (x) => a * x + b, color: '--c3', width: 2.5, dash: true },
            st.p.x !== st.q.x
              ? { type: 'line', x1: st.p.x, y1: st.p.y, x2: st.q.x, y2: st.q.y, color: '--c1', width: 3 }
              : { type: 'vline', x: st.p.x, color: '--c1', width: 3 },
            { type: 'point', x: st.p.x, y: st.p.y, color: '--c1', label: 'P', snap: 0.5, drag: (x, y) => { st.p = { x, y }; } },
            { type: 'point', x: st.q.x, y: st.q.y, color: '--c1', label: 'Q', snap: 0.5, drag: (x, y) => { st.q = { x, y }; } },
          ],
        },
        check: (st) => st.p.x !== st.q.x && onLine(st.p) && onLine(st.q),
        hint: `Placér det ene punkt på $y$-aksen i $(0\\,;\\,${tn(b)})$. Gå derefter 1 til højre og $${tn(Math.abs(a))}$ ${a > 0 ? 'op' : 'ned'}.`,
        solution: `Linjen skærer $y$-aksen i $(0\\,;\\,${tn(b)})$, og hældningen er $${tn(a)}$. Fx ligger punkterne $${pt(0, b)}$ og $${pt(2, 2 * a + b)}$ på linjen (stiplet).`,
      };
    },
  },
  {
    id: 'solve',
    title: 'Løs en ligning',
    make() {
      const a = pick([-5, -4, -3, -2, 2, 3, 4, 5, 0.5]), b = rint(-8, 8), x = rint(-5, 6);
      const k = a * x + b;
      return {
        prompt: `Givet $f(x)=${linTex(a, b)}$. Løs ligningen $f(x)=${tn(k)}$.`,
        fields: [{ label: 'x', answer: x }],
        hint: 'Træk $b$ fra på begge sider, og divider derefter med $a$.',
        solution: `$$${linTex(a, b)}=${tn(k)}$$ $$${polyTex([a, 0])}=${tn(k)}-${par(b)}=${tn(k - b)}$$ $$x=\\frac{${tn(k - b)}}{${tn(a)}}=${tn(x)}$$`,
      };
    },
  },
  {
    id: 'intersect',
    title: 'Skæringspunkt',
    make() {
      const x0 = rint(-4, 4), y0 = rint(-4, 4);
      const a1 = pick([-3, -2, -1, 1, 2, 3]);
      let a2;
      do a2 = pick([-3, -2, -1, 1, 2, 3, 0.5, -0.5]); while (a2 === a1);
      const b1 = y0 - a1 * x0, b2 = y0 - a2 * x0;
      return {
        prompt: `Bestem skæringspunktet mellem graferne for $f(x)=${linTex(a1, b1)}$ og $g(x)=${linTex(a2, b2)}$.`,
        fields: [{ label: 'x', answer: x0 }, { label: 'y', answer: y0 }],
        hint: 'Sæt $f(x)=g(x)$ og løs for $x$. Indsæt derefter $x$ i en af forskrifterne for at finde $y$.',
        solution: `$$${linTex(a1, b1)}=${linTex(a2, b2)}$$ $$${polyTex([a1 - a2, 0])}=${tn(b2 - b1)}\\quad\\Leftrightarrow\\quad x=${tn(x0)}$$ $$y=f(${tn(x0)})=${tn(a1)}\\cdot${par(x0)}${b1 < 0 ? '-' : '+'}${tn(Math.abs(b1))}=${tn(y0)}$$ Skæringspunktet er $${pt(x0, y0)}$.`,
      };
    },
  },
];

const learn = `
<h2>Lineære funktioner</h2>
<p>En lineær funktion har forskriften</p>
<div class="rule">$$f(x)=ax+b$$</div>
<p>Grafen er en <b>ret linje</b>. Tallet $a$ er <b>hældningen</b>, og $b$ er <b>skæringen med $y$-aksen</b>, dvs. grafen går gennem $(0\\,;\\,b)$.</p>

<h2>Hældningen $a$</h2>
<p>Når $x$ vokser med 1, ændres $y$ med $a$. Kender man to punkter $(x_1,y_1)$ og $(x_2,y_2)$ på linjen:</p>
<div class="rule">$$a=\\frac{y_2-y_1}{x_2-x_1}\\qquad b=y_1-a\\cdot x_1$$</div>
<div class="example">Linjen gennem $(1,3)$ og $(4,9)$: $$a=\\frac{9-3}{4-1}=2,\\qquad b=3-2\\cdot1=1,\\qquad f(x)=2x+1$$</div>
<ul>
  <li>$a>0$: voksende, $a<0$: aftagende, $a=0$: vandret linje.</li>
  <li>To linjer er <b>parallelle</b>, hvis de har samme hældning.</li>
  <li>To linjer er <b>ortogonale</b> (vinkelrette), hvis $a_1\\cdot a_2=-1$.</li>
</ul>

<h2>Nulpunkt</h2>
<p>Grafen skærer $x$-aksen, hvor $f(x)=0$:</p>
<div class="rule">$$ax+b=0\\quad\\Leftrightarrow\\quad x=-\\frac{b}{a}$$</div>

<h2>Skæring mellem to linjer</h2>
<p>Sæt forskrifterne lig hinanden og løs ligningen. Indsæt $x$ i en af forskrifterne for at finde $y$.</p>
<div class="example">$f(x)=2x+1$ og $g(x)=-x+7$: $$2x+1=-x+7\\Leftrightarrow 3x=6\\Leftrightarrow x=2,\\qquad y=f(2)=5$$ Skæringspunktet er $(2,5)$.</div>

<h2>Linjens ligning gennem et punkt</h2>
<div class="rule">$$y=a(x-x_0)+y_0$$</div>
<p>er linjen med hældning $a$ gennem punktet $(x_0,y_0)$.</p>`;

export default {
  id: 'lineaere',
  learn,
  title: 'Lineære funktioner',
  short: 'Lineære',
  formula: 'f(x)=ax+b',
  desc: 'Hældning, skæring med y-aksen og ligninger. Træk i punkterne og se forskriften ændre sig.',
  explore,
  exercises,
};
