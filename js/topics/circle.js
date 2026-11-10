import { Graph } from '../graph.js';
import { el, math, toggle, exploreLayout, card, hint } from '../ui.js';
import { rint, rintNZ, pick, shuffle, tn, par, pt, polyTex, linTex, round, num, near, plus } from '../util.js';

// ---------- geometri ----------
const dist = (P, Q) => Math.hypot(P.x - Q.x, P.y - Q.y);
/** Linjen gennem P og Q på formen ax + by + c = 0. */
function lineABC(P, Q) {
  const a = Q.y - P.y, b = -(Q.x - P.x);
  return { a, b, c: -(a * P.x + b * P.y) };
}
const distPointLine = (C, L) => Math.abs(L.a * C.x + L.b * C.y + L.c) / Math.hypot(L.a, L.b);
/** Skæringspunkter mellem linjen PQ og cirklen (C, r). */
function intersect(P, Q, C, r) {
  const dx = Q.x - P.x, dy = Q.y - P.y, fx = P.x - C.x, fy = P.y - C.y;
  const A = dx * dx + dy * dy, B = 2 * (fx * dx + fy * dy), K = fx * fx + fy * fy - r * r;
  const D = B * B - 4 * A * K;
  if (A === 0 || D < -1e-9) return [];
  if (Math.abs(D) < 1e-9) { const t = -B / (2 * A); return [{ x: P.x + t * dx, y: P.y + t * dy }]; }
  return [-1, 1].map((sg) => { const t = (-B + sg * Math.sqrt(D)) / (2 * A); return { x: P.x + t * dx, y: P.y + t * dy }; });
}
/** (x − a)² + (y − b)² = r² som TeX. */
const sq = (v, c) => (c === 0 ? `${v}^2` : `(${v}${c > 0 ? '-' : '+'}${tn(Math.abs(c))})^2`);
const circleTex = (a, b, r) => `${sq('x', a)}+${sq('y', b)}=${tn(r * r)}`;
/** ax + by + c = 0 som TeX. */
function abcTex(a, b, c) {
  const terms = [[a, 'x'], [b, 'y'], [c, '']].filter(([k]) => Math.abs(k) > 1e-12);
  if (!terms.length) return '0=0';
  return terms.map(([k, v], i) => {
    const abs = Math.abs(k), coef = abs === 1 && v ? '' : tn(abs);
    return `${i === 0 ? (k < 0 ? '-' : '') : k < 0 ? '-' : '+'}${coef}${v}`;
  }).join('') + '=0';
}

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { C: { x: 1, y: 1 }, R: { x: 4, y: 5 }, P: { x: -5, y: -2 }, Q: { x: 6, y: 2 }, T: 0.6, line: true, tangent: false, expanded: false };
  const g = new Graph(graphBox, { xmin: -8, xmax: 9, ymin: -6, ymax: 8 });
  const r = () => dist(s.C, s.R);
  const T = () => ({ x: s.C.x + r() * Math.cos(s.T), y: s.C.y + r() * Math.sin(s.T) });

  g.setScene(() => {
    const R = r();
    const items = [
      { type: 'circle', x: s.C.x, y: s.C.y, r: R, color: '--c1', width: 3, fill: true, alpha: 0.06 },
      { type: 'segment', x1: s.C.x, y1: s.C.y, x2: s.R.x, y2: s.R.y, color: '--c1', width: 1.5, dash: [4, 4], label: `r = ${num(R)}` },
    ];
    if (s.line) {
      items.push({ type: 'line', x1: s.P.x, y1: s.P.y, x2: s.Q.x, y2: s.Q.y, color: '--c2', width: 2.5 });
      const L = lineABC(s.P, s.Q);
      if (L.a || L.b) {
        // vinkelret afstand fra centrum til linjen
        const n = Math.hypot(L.a, L.b), k = (L.a * s.C.x + L.b * s.C.y + L.c) / (n * n);
        const F = { x: s.C.x - k * L.a, y: s.C.y - k * L.b };
        items.push({ type: 'segment', x1: s.C.x, y1: s.C.y, x2: F.x, y2: F.y, color: '--c4', width: 1.5, dash: [3, 4] });
      }
      intersect(s.P, s.Q, s.C, R).forEach((S, i, arr) => items.push({ type: 'point', x: S.x, y: S.y, color: '--c3', r: 5, label: arr.length > 1 ? `S${i ? '₂' : '₁'}` : 'S' }));
      items.push({ type: 'point', x: s.P.x, y: s.P.y, color: '--c2', snap: 0.5, drag: (x, y) => { s.P = { x, y }; update(); } });
      items.push({ type: 'point', x: s.Q.x, y: s.Q.y, color: '--c2', snap: 0.5, drag: (x, y) => { s.Q = { x, y }; update(); } });
    }
    if (s.tangent) {
      const t = T(), n = { x: t.x - s.C.x, y: t.y - s.C.y };
      items.push({ type: 'line', x1: t.x, y1: t.y, x2: t.x - n.y, y2: t.y + n.x, color: '--c5', width: 2.5 });
      items.push({ type: 'segment', x1: s.C.x, y1: s.C.y, x2: t.x, y2: t.y, color: '--c5', width: 1.5 });
      items.push({ type: 'point', x: t.x, y: t.y, color: '--c5', label: 'T', drag: (x, y) => { s.T = Math.atan2(y - s.C.y, x - s.C.x); update(); } });
    }
    items.push({ type: 'point', x: s.C.x, y: s.C.y, color: '--c1', label: 'C', snap: 0.5, drag: (x, y) => { const dx = x - s.C.x, dy = y - s.C.y; s.C = { x, y }; s.R = { x: s.R.x + dx, y: s.R.y + dy }; update(); } });
    items.push({ type: 'point', x: s.R.x, y: s.R.y, color: '--c1', snap: 0.5, drag: (x, y) => { s.R = { x, y }; update(); } });
    return items;
  });

  const info = el('div', { class: 'formula' });
  panel.append(
    hint('Træk i centrum $C$ og i punktet på cirklen. De orange punkter styrer linjen.'),
    info,
    el('div', { class: 'toggles' },
      toggle('Vis linje og skæringspunkter', s.line, (v) => { s.line = v; update(); }),
      toggle('Vis tangent i et punkt <i>T</i>', s.tangent, (v) => { s.tangent = v; update(); }),
      toggle('Vis den udregnede form', s.expanded, (v) => { s.expanded = v; update(); }),
    ),
    card('Husk', `
      <ul>
        <li>Cirklen med centrum $(a,b)$ og radius $r$: $(x-a)^2+(y-b)^2=r^2$</li>
        <li>Afstand fra $(x_0,y_0)$ til linjen $Ax+By+C=0$: $\\dfrac{|Ax_0+By_0+C|}{\\sqrt{A^2+B^2}}$</li>
        <li>Afstand fra centrum til linjen $<r$: 2 skæringspunkter, $=r$: tangent, $>r$: ingen.</li>
        <li>Tangenten står vinkelret på radius i røringspunktet.</li>
      </ul>`),
  );

  function update() {
    const R = r(), { C } = s;
    let html = `<div class="result">$$${circleTex(C.x, C.y, R)}$$</div>
      <p class="muted">Centrum $C${pt(C.x, C.y)}$, radius $r=${tn(R)}$${Math.abs(R - Math.round(R)) > 1e-9 ? ` $=\\sqrt{${tn(R * R)}}$` : ''}.</p>`;
    if (s.expanded) html += `$$x^2+y^2${plus(-2 * C.x)}x${plus(-2 * C.y)}y${plus(C.x ** 2 + C.y ** 2 - R * R)}=0$$`.replace(/[+-]0x|[+-]0y|[+]0=0/g, (m) => (m.endsWith('=0') ? '=0' : ''));
    if (s.line) {
      const L = lineABC(s.P, s.Q);
      if (L.a || L.b) {
        const d = distPointLine(C, L), S = intersect(s.P, s.Q, C, R);
        const kind = Math.abs(d - R) < 1e-9 ? ['tangent', 'b-mid'] : d < R ? ['sekant (2 skæringspunkter)', 'b-ok'] : ['ingen skæring', 'b-bad'];
        const slope = L.b !== 0 ? `\\quad\\Leftrightarrow\\quad y=${linTex(round(-L.a / L.b, 3), round(-L.c / L.b, 3))}` : '';
        html += `<p class="muted">Linjen gennem de orange punkter:</p>$$${abcTex(L.a, L.b, L.c)}${slope}$$
          $$\\text{dist}(C,\\ell)=\\frac{|${tn(L.a)}\\cdot${par(C.x)}${plus(L.b)}\\cdot${par(C.y)}${plus(L.c)}|}{\\sqrt{${tn(L.a)}^2+${par(L.b)}^2}}=${tn(d)}$$
          <p><span class="badge ${kind[1]}">${kind[0]}</span> ${S.map((P, i) => `$S${S.length > 1 ? `_${i + 1}` : ''}${pt(P.x, P.y)}$`).join(' og ')}</p>`;
      }
    }
    if (s.tangent) {
      const t = T(), n = { x: t.x - C.x, y: t.y - C.y };
      html += `<p class="muted">Tangent i $T${pt(t.x, t.y)}$ – normalvektor $\\overrightarrow{CT}$:</p>$$${abcTex(round(n.x, 2), round(n.y, 2), round(-(n.x * t.x + n.y * t.y), 2))}$$`;
    }
    info.innerHTML = math(html);
    g.draw();
  }
  update();
}

// ---------- opgaver ----------
const TRIPLES = [[3, 4, 5], [4, 3, 5], [-3, 4, 5], [3, -4, 5], [-4, -3, 5], [0, 5, 5], [5, 0, 5], [6, 8, 10], [5, 12, 13], [-12, 5, 13]];
const randCircle = () => ({ a: rint(-5, 5), b: rint(-5, 5), r: rint(1, 7) });

const exercises = [
  {
    id: 'aflaes',
    title: 'Centrum og radius',
    make() {
      const { a, b, r } = randCircle();
      return {
        prompt: `En cirkel har ligningen $${circleTex(a, b, r)}$. Bestem centrum $C(a,b)$ og radius $r$.`,
        fields: [{ label: 'a', answer: a }, { label: 'b', answer: b }, { label: 'r', answer: r }],
        hint: 'Sammenlign med $(x-a)^2+(y-b)^2=r^2$. Pas på fortegnene: $(x+3)^2=(x-(-3))^2$.',
        solution: `$$${circleTex(a, b, r)}\\quad\\Leftrightarrow\\quad (x-${par(a)})^2+(y-${par(b)})^2=${r}^2$$ Centrum er $C(${a},${b})$, og radius er $r=\\sqrt{${r * r}}=${r}$.`,
      };
    },
  },
  {
    id: 'opskriv',
    title: 'Opskriv ligningen',
    make() {
      const { a, b, r } = randCircle();
      const right = circleTex(a, b, r);
      const wrongs = [circleTex(-a, -b, r), `${sq('x', a)}+${sq('y', b)}=${r}`, circleTex(b, a, r), circleTex(a, -b, r)]
        .filter((w, i, arr) => w !== right && arr.indexOf(w) === i).slice(0, 3);
      while (wrongs.length < 3) wrongs.push(circleTex(a + wrongs.length + 1, b, r));
      return {
        prompt: `Hvilken ligning har cirklen med centrum $C(${a},${b})$ og radius $${r}$?`,
        choices: shuffle([{ html: `$${right}$`, correct: true }, ...wrongs.map((w) => ({ html: `$${w}$` }))]),
        hint: 'Indsæt i $(x-a)^2+(y-b)^2=r^2$. Husk at kvadrere radius.',
        solution: `$$${right}$$`,
      };
    },
  },
  {
    id: 'kvadrat',
    title: 'Kvadratkomplettering',
    make() {
      const { a, b, r } = randCircle();
      const D = -2 * a, E = -2 * b, F = a * a + b * b - r * r;
      const lhs = `x^2+y^2${D ? `${plus(D)}x` : ''}${E ? `${plus(E)}y` : ''}${F ? plus(F) : ''}`;
      return {
        prompt: `Bestem centrum og radius for cirklen $${lhs}=0$.`,
        fields: [{ label: 'a', answer: a }, { label: 'b', answer: b }, { label: 'r', answer: r }],
        hint: 'Saml $x$-led og $y$-led, og brug kvadratkomplettering: $x^2+Dx=(x+\\frac D2)^2-(\\frac D2)^2$.',
        solution: `$$${lhs}=0$$ $$${sq('x', a)}${a ? `-${a * a}` : ''}+${sq('y', b)}${b ? `-${b * b}` : ''}${F ? plus(F) : ''}=0$$ $$${circleTex(a, b, r)}$$ Centrum $C(${a},${b})$ og radius $r=${r}$.`,
      };
    },
  },
  {
    id: 'beliggenhed',
    title: 'Inde, på eller uden for?',
    make() {
      const { a, b } = randCircle();
      const [dx, dy, R] = pick(TRIPLES);
      const where = pick(['inde', 'paa', 'uden']);
      const k = where === 'inde' ? 0.6 : where === 'paa' ? 1 : 1.4;
      const P = { x: a + Math.round(dx * k), y: b + Math.round(dy * k) };
      const d = Math.hypot(P.x - a, P.y - b);
      const truth = Math.abs(d - R) < 1e-9 ? 'paa' : d < R ? 'inde' : 'uden';
      const labels = { inde: 'Inde i cirklen', paa: 'På cirklen', uden: 'Uden for cirklen' };
      return {
        prompt: `Ligger punktet $P(${P.x},${P.y})$ inde i, på eller uden for cirklen $${circleTex(a, b, R)}$?`,
        choices: ['inde', 'paa', 'uden'].map((w) => ({ html: labels[w], correct: w === truth })),
        hint: 'Beregn afstanden fra $P$ til centrum, og sammenlign med radius.',
        solution: `$$|CP|=\\sqrt{(${P.x}-${par(a)})^2+(${P.y}-${par(b)})^2}=\\sqrt{${tn(d * d)}}${Math.abs(d - Math.round(d)) < 1e-9 ? '' : '\\approx'}${tn(d)}$$ Radius er $${R}$, så punktet ligger ${labels[truth].toLowerCase()}.`,
      };
    },
  },
  {
    id: 'afstandlinje',
    title: 'Afstand fra punkt til linje',
    make() {
      const [A, B] = pick([[3, 4], [4, -3], [1, 1], [2, -1], [1, -2], [5, 12], [3, 1]]);
      const C = rint(-10, 10), x0 = rint(-4, 4), y0 = rint(-4, 4);
      const d = Math.abs(A * x0 + B * y0 + C) / Math.hypot(A, B);
      return {
        prompt: `Bestem afstanden fra punktet $P(${x0},${y0})$ til linjen $${abcTex(A, B, C)}$. Afrund til to decimaler.`,
        fields: [{ label: 'd', answer: d, tol: 0.011 }],
        hint: 'Afstandsformlen: $\\text{dist}(P,\\ell)=\\dfrac{|A x_0+B y_0+C|}{\\sqrt{A^2+B^2}}$.',
        solution: `$$\\text{dist}=\\frac{|${A}\\cdot${par(x0)}${plus(B)}\\cdot${par(y0)}${plus(C)}|}{\\sqrt{${A}^2+${par(B)}^2}}=\\frac{${Math.abs(A * x0 + B * y0 + C)}}{\\sqrt{${A * A + B * B}}}\\approx ${tn(d)}$$`,
      };
    },
  },
  {
    id: 'antal',
    title: 'Antal skæringspunkter',
    make() {
      const { a, b, r } = randCircle();
      const target = pick([0, 1, 2]);
      // vandret eller lodret linje i afstanden d fra centrum
      const off = target === 1 ? r : target === 2 ? rint(0, r - 1) : r + rint(1, 3);
      const sign = pick([1, -1]);
      const horiz = Math.random() < 0.5;
      const lineTex = horiz ? `y=${b + sign * off}` : `x=${a + sign * off}`;
      const labels = ['Ingen', 'Ét (tangent)', 'To'];
      return {
        prompt: `Hvor mange skæringspunkter har cirklen $${circleTex(a, b, r)}$ med linjen $${lineTex}$?`,
        choices: labels.map((html, i) => ({ html, correct: i === target })),
        hint: 'Find afstanden fra centrum til linjen, og sammenlign med radius.',
        solution: `Centrum er $(${a},${b})$, og afstanden til linjen $${lineTex}$ er $${off}$. Radius er $${r}$, og ${off < r ? `$${off}<${r}$, så der er to skæringspunkter` : off === r ? `$${off}=${r}$, så linjen er tangent` : `$${off}>${r}$, så der er ingen skæringspunkter`}.`,
      };
    },
  },
  {
    id: 'skaering',
    title: 'Skæring mellem linje og cirkel',
    make() {
      const pts = [[3, 4], [4, 3], [-3, 4], [-4, 3], [3, -4], [4, -3], [-3, -4], [-4, -3], [5, 0], [0, 5], [-5, 0], [0, -5]];
      let P, Q;
      let k, m;
      do {
        P = pick(pts); Q = pick(pts);
        k = (Q[1] - P[1]) / (Q[0] - P[0]); m = P[1] - k * P[0];
      } while (P[0] === Q[0] || !Number.isInteger(k * 2) || !Number.isInteger(m * 2));
      return {
        prompt: `Bestem $x$-koordinaterne til skæringspunkterne mellem cirklen $x^2+y^2=25$ og linjen $y=${linTex(round(k, 4), round(m, 4))}$.`,
        fields: [{ label: 'x_1', answer: P[0] }, { label: 'x_2', answer: Q[0] }],
        unordered: true,
        hint: 'Indsæt linjens udtryk for $y$ i cirklens ligning, og løs andengradsligningen i $x$.',
        solution: `$$x^2+\\left(${linTex(round(k, 4), round(m, 4))}\\right)^2=25$$ Det giver en andengradsligning med løsningerne $x=${P[0]}$ og $x=${Q[0]}$. Skæringspunkterne er $(${P[0]},${P[1]})$ og $(${Q[0]},${Q[1]})$.`,
      };
    },
  },
  {
    id: 'tangent',
    title: 'Tangent til cirkel',
    make() {
      const { a, b } = randCircle();
      let dx, dy, R;
      do [dx, dy, R] = pick(TRIPLES); while (dy === 0);
      const T = { x: a + dx, y: b + dy };
      const k = -dx / dy, m = T.y - k * T.x;
      return {
        prompt: `Punktet $T(${T.x},${T.y})$ ligger på cirklen $${circleTex(a, b, R)}$. Bestem tangenten i $T$ på formen $y=\\alpha x+\\beta$.`,
        fields: [{ label: '\\alpha', answer: k, tol: 0.006 }, { label: '\\beta', answer: m, tol: 0.006 }],
        hint: 'Tangenten står vinkelret på radius $\\overrightarrow{CT}$. Brug $\\overrightarrow{CT}$ som normalvektor: $n_1(x-x_0)+n_2(y-y_0)=0$.',
        solution: `$$\\overrightarrow{CT}=\\begin{pmatrix}${dx}\\\\${dy}\\end{pmatrix},\\qquad ${dx}(x-${par(T.x)})${plus(dy)}(y-${par(T.y)})=0$$ Isolér $y$: $$y=${linTex(round(k, 4), round(m, 4))}$$`,
      };
    },
  },
  {
    id: 'ortogonal',
    title: 'Ortogonale linjer og hældningsvinkel',
    make() {
      if (Math.random() < 0.5) {
        const k = pick([2, -2, 0.5, -0.5, 1, -1, 3, -3, 4]), x0 = rint(-4, 4), y0 = rint(-4, 4);
        const k2 = -1 / k, m2 = y0 - k2 * x0;
        return {
          prompt: `Linjen $\\ell$ har ligningen $y=${linTex(k, rint(-5, 5))}$. Bestem linjen $m$, der står vinkelret på $\\ell$ og går gennem $P(${x0},${y0})$. Skriv den som $y=\\alpha x+\\beta$.`,
          fields: [{ label: '\\alpha', answer: k2, tol: 0.006 }, { label: '\\beta', answer: m2, tol: 0.006 }],
          hint: 'To linjer er ortogonale, når produktet af hældningerne er $-1$: $\\alpha_1\\cdot\\alpha_2=-1$.',
          solution: `$$\\alpha=-\\frac{1}{${tn(k)}}=${tn(k2, 4)},\\qquad \\beta=${y0}-${par(round(k2, 4), 4)}\\cdot${par(x0)}=${tn(m2, 4)}$$`,
        };
      }
      const k = pick([1, 2, 0.5, -1, 3, -0.5, 0.25]);
      const v = (Math.atan(k) * 180) / Math.PI;
      return {
        prompt: `Bestem hældningsvinklen $v$ for linjen $y=${linTex(k, rint(-5, 5))}$ (i grader, mellem $-90^\\circ$ og $90^\\circ$). Afrund til én decimal.`,
        fields: [{ label: 'v', answer: v, tol: 0.06 }],
        hint: 'Hældningsvinklen opfylder $\\tan(v)=\\alpha$.',
        solution: `$$\\tan(v)=${tn(k)}\\quad\\Rightarrow\\quad v=\\tan^{-1}(${tn(k)})\\approx ${tn(v, 1)}^\\circ$$`,
      };
    },
  },
  {
    id: 'traekcirkel',
    title: 'Placér cirklen',
    interactive: true,
    make() {
      const a = rint(-4, 4), b = rint(-3, 3), r = rint(1, 4);
      const expanded = Math.random() < 0.4;
      const D = -2 * a, E = -2 * b, F = a * a + b * b - r * r;
      const eq = expanded ? `x^2+y^2${D ? `${plus(D)}x` : ''}${E ? `${plus(E)}y` : ''}${F ? plus(F) : ''}=0` : circleTex(a, b, r);
      const st = { C: { x: a > 0 ? -2 : 2, y: 0 }, R: { x: a > 0 ? 0 : 4, y: 0 } };
      return {
        prompt: `Træk i centrum og i punktet på cirklen, så cirklen får ligningen $${eq}$.`,
        graph: {
          view: { xmin: -9, xmax: 9, ymin: -7, ymax: 7 },
          state: st,
          scene: (s, rev) => [
            rev && { type: 'circle', x: a, y: b, r, color: '--c3', width: 2.5, dash: true },
            { type: 'circle', x: s.C.x, y: s.C.y, r: dist(s.C, s.R), color: '--c1', width: 3, fill: true, alpha: 0.06 },
            { type: 'segment', x1: s.C.x, y1: s.C.y, x2: s.R.x, y2: s.R.y, color: '--c1', width: 1.5, dash: [4, 4] },
            { type: 'point', x: s.C.x, y: s.C.y, color: '--c1', label: 'C', snap: 0.5, drag: (x, y) => { const dx = x - s.C.x, dy = y - s.C.y; s.C = { x, y }; s.R = { x: s.R.x + dx, y: s.R.y + dy }; } },
            { type: 'point', x: s.R.x, y: s.R.y, color: '--c2', snap: 0.5, drag: (x, y) => { s.R = { x, y }; } },
          ],
        },
        check: (s) => near(s.C.x, a) && near(s.C.y, b) && near(dist(s.C, s.R), r),
        hint: expanded ? 'Brug kvadratkomplettering for at finde centrum og radius.' : 'Aflæs centrum $(a,b)$ og radius $r$ i $(x-a)^2+(y-b)^2=r^2$.',
        solution: `Centrum er $C(${a},${b})$ og radius $${r}$: $$${circleTex(a, b, r)}$$`,
      };
    },
  },
  {
    id: 'traektangent',
    title: 'Tegn tangenten til cirklen',
    interactive: true,
    make() {
      const a = rint(-2, 2), b = rint(-2, 2);
      const [dx, dy] = pick([[3, 4], [4, 3], [-3, 4], [4, -3], [0, 5], [5, 0], [-4, -3]]);
      const C = { x: a, y: b }, Tt = { x: a + dx, y: b + dy };
      const st = { Q: { x: Tt.x + (dy === 0 ? 2 : 0), y: Tt.y + (dy === 0 ? 0 : 3) } };
      if (Math.abs((st.Q.x - Tt.x) * dx + (st.Q.y - Tt.y) * dy) < 1e-9) st.Q = { x: Tt.x + 1, y: Tt.y + 1 };
      return {
        prompt: `Træk punktet $Q$, så linjen gennem $T(${Tt.x},${Tt.y})$ og $Q$ bliver <b>tangent</b> til cirklen med centrum $C(${a},${b})$.`,
        graph: {
          view: { xmin: a - 9, xmax: a + 9, ymin: b - 7, ymax: b + 7 },
          state: st,
          scene: (s, rev) => [
            { type: 'circle', x: a, y: b, r: 5, color: '--c1', width: 3 },
            { type: 'segment', x1: a, y1: b, x2: Tt.x, y2: Tt.y, color: '--c1', width: 1.5, dash: [4, 4] },
            rev && { type: 'line', x1: Tt.x, y1: Tt.y, x2: Tt.x - dy, y2: Tt.y + dx, color: '--c3', width: 2, dash: true },
            (s.Q.x !== Tt.x || s.Q.y !== Tt.y) && { type: 'line', x1: Tt.x, y1: Tt.y, x2: s.Q.x, y2: s.Q.y, color: '--c2', width: 2.5 },
            { type: 'point', x: a, y: b, color: '--c1', label: 'C' },
            { type: 'point', x: Tt.x, y: Tt.y, color: '--c1', label: 'T' },
            { type: 'point', x: s.Q.x, y: s.Q.y, color: '--c2', label: 'Q', snap: 1, drag: (x, y) => { s.Q = { x, y }; } },
          ],
        },
        check: (s) => (s.Q.x !== Tt.x || s.Q.y !== Tt.y) && Math.abs((s.Q.x - Tt.x) * dx + (s.Q.y - Tt.y) * dy) < 1e-9,
        hint: 'Tangenten står vinkelret på radius $CT$. Gå fra $T$ i retningen af tværvektoren til $\\overrightarrow{CT}$.',
        solution: `$\\overrightarrow{CT}=\\begin{pmatrix}${dx}\\\\${dy}\\end{pmatrix}$, så tangenten har retningen $\\begin{pmatrix}${-dy}\\\\${dx}\\end{pmatrix}$. Fx virker $Q(${Tt.x - dy},${Tt.y + dx})$ – ethvert punkt på den stiplede linje er rigtigt.`,
      };
    },
  },
];

const learn = `
<h2>Afstand og midtpunkt</h2>
<div class="rule">$$|AB|=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}\\qquad M=\\left(\\frac{x_1+x_2}{2},\\,\\frac{y_1+y_2}{2}\\right)$$</div>

<h2>Linjens ligning</h2>
<p>En ret linje kan skrives på to måder:</p>
<ul>
  <li>$y=\\alpha x+\\beta$ – med hældning $\\alpha$ og skæring $\\beta$ (virker ikke for lodrette linjer).</li>
  <li>$A x+B y+C=0$ – hvor $\\vec n=\\begin{pmatrix}A\\\\B\\end{pmatrix}$ er en <b>normalvektor</b> (står vinkelret på linjen).</li>
</ul>
<p>Linjen gennem $P(x_0,y_0)$ med normalvektor $\\vec n$: $A(x-x_0)+B(y-y_0)=0$.</p>
<ul>
  <li><b>Ortogonale linjer:</b> $\\alpha_1\\cdot\\alpha_2=-1$.</li>
  <li><b>Hældningsvinkel:</b> vinklen $v$ mellem linjen og $x$-aksen opfylder $\\tan v=\\alpha$.</li>
  <li><b>Skæring mellem linjer:</b> løs de to ligninger sammen.</li>
</ul>

<h2>Afstand fra punkt til linje</h2>
<div class="rule">$$\\text{dist}(P,\\ell)=\\frac{|A x_0+B y_0+C|}{\\sqrt{A^2+B^2}}$$</div>
<div class="example">Afstanden fra $P(1,2)$ til $3x+4y-1=0$: $$\\frac{|3\\cdot1+4\\cdot2-1|}{\\sqrt{3^2+4^2}}=\\frac{10}{5}=2$$</div>

<h2>Cirklens ligning</h2>
<p>En cirkel er alle punkter med samme afstand $r$ til centrum $C(a,b)$. Afstandsformlen giver:</p>
<div class="rule">$$(x-a)^2+(y-b)^2=r^2$$</div>
<div class="example">Centrum $(2,-3)$ og radius $4$: $$(x-2)^2+(y+3)^2=16$$</div>

<h2>Kvadratkomplettering</h2>
<p>Står ligningen på formen $x^2+y^2+Dx+Ey+F=0$, finder man centrum og radius ved at <b>kvadratkomplettere</b>:</p>
<div class="rule">$$x^2+Dx=\\left(x+\\tfrac D2\\right)^2-\\left(\\tfrac D2\\right)^2$$</div>
<div class="example">$$x^2+y^2-4x+6y-3=0$$ $$(x-2)^2-4+(y+3)^2-9-3=0$$ $$(x-2)^2+(y+3)^2=16$$ Centrum $(2,-3)$, radius $4$.</div>

<h2>Skæring mellem linje og cirkel</h2>
<p>Isolér $y$ (eller $x$) i linjens ligning, indsæt i cirklens ligning, og løs andengradsligningen. Alternativt kan man sammenligne <b>afstanden fra centrum til linjen</b> med radius:</p>
<table class="vt"><tbody>
<tr><td>$\\text{dist}(C,\\ell)<r$</td><td>to skæringspunkter (sekant)</td></tr>
<tr><td>$\\text{dist}(C,\\ell)=r$</td><td>ét røringspunkt (tangent)</td></tr>
<tr><td>$\\text{dist}(C,\\ell)>r$</td><td>ingen skæringspunkter</td></tr>
</tbody></table>

<h2>Tangent til cirkel</h2>
<p>Tangenten i punktet $T$ på cirklen står <b>vinkelret på radius</b> $CT$. Derfor er $\\overrightarrow{CT}$ en normalvektor for tangenten:</p>
<div class="rule">$$\\overrightarrow{CT}\\cdot\\begin{pmatrix}x-x_0\\\\y-y_0\\end{pmatrix}=0$$</div>`;

export default {
  id: 'cirklen',
  title: 'Cirklen og analytisk geometri',
  short: 'Cirklen',
  formula: '(x-a)^2+(y-b)^2=r^2',
  desc: 'Afstande, linjens ligning, ortogonale linjer, afstand fra punkt til linje, cirklens ligning, kvadratkomplettering, skæring og tangenter.',
  learn,
  explore,
  exercises,
};
