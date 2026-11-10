import { Graph } from '../graph.js';
import { el, math, segmented, toggle, exploreLayout, card, hint } from '../ui.js';
import { rint, pick, shuffle, tn, num, round, near } from '../util.js';

const RAD = Math.PI / 180;
const deg = (r) => r / RAD;
const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

/** Vinklen ved P i trekanten PQR (grader). */
function angleAt(P, Q, R) {
  const a = Math.atan2(Q.y - P.y, Q.x - P.x), b = Math.atan2(R.y - P.y, R.x - P.x);
  let d = Math.abs(b - a);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return deg(d);
}

/** Vinkelbue ved P mellem strålerne mod Q og R. */
function arcAt(P, Q, R, color, label) {
  let a0 = Math.atan2(Q.y - P.y, Q.x - P.x), a1 = Math.atan2(R.y - P.y, R.x - P.x);
  let d = a1 - a0;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  if (d < 0) { [a0, a1] = [a1, a0]; d = -d; }
  return { type: 'arc', x: P.x, y: P.y, a0, a1: a0 + d, r: 24, color, width: 2, label };
}

function triangleItems(A, B, C, labels = {}) {
  const items = [{ type: 'polygon', points: [[A.x, A.y], [B.x, B.y], [C.x, C.y]], color: '--c1', alpha: 0.1, stroke: true, width: 2.5 }];
  items.push(arcAt(A, B, C, '--c2', labels.A ?? 'A'), arcAt(B, C, A, '--c3', labels.B ?? 'B'), arcAt(C, A, B, '--c4', labels.C ?? 'C'));
  const side = (P, Q, text, opp) => {
    const mx = (P.x + Q.x) / 2, my = (P.y + Q.y) / 2;
    const dx = mx - opp.x, dy = my - opp.y, L = Math.hypot(dx, dy) || 1;
    return { type: 'text', x: mx + (dx / L) * 0.45, y: my + (dy / L) * 0.45, text, align: 'center', color: '--text' };
  };
  items.push(side(B, C, labels.a ?? 'a', A), side(C, A, labels.b ?? 'b', B), side(A, B, labels.c ?? 'c', C));
  return items;
}

function explore(root) {
  const { graphBox, panel } = exploreLayout(root);
  const s = { mode: 'trekant', A: { x: -3, y: -2 }, B: { x: 4, y: -2 }, C: { x: 1, y: 3 }, v: 40 };
  const g = new Graph(graphBox, { xmin: -6, xmax: 6, ymin: -4, ymax: 5 });

  g.setScene(() => {
    if (s.mode === 'trekant') {
      const { A, B, C } = s;
      const items = triangleItems(A, B, C, {
        a: `a = ${num(dist(B, C))}`, b: `b = ${num(dist(C, A))}`, c: `c = ${num(dist(A, B))}`,
        A: `${num(angleAt(A, B, C), 0)}°`, B: `${num(angleAt(B, C, A), 0)}°`, C: `${num(angleAt(C, A, B), 0)}°`,
      });
      for (const [k, P] of [['A', A], ['B', B], ['C', C]]) {
        items.push({ type: 'point', x: P.x, y: P.y, color: '--c1', label: k, snap: 0.5, drag: (x, y) => { s[k] = { x, y }; update(); } });
      }
      return items;
    }
    const v = s.v * RAD, c = Math.cos(v), si = Math.sin(v);
    return [
      { type: 'circle', x: 0, y: 0, r: 1, color: '--g-axis', width: 1.5 },
      { type: 'arc', x: 0, y: 0, a0: 0, a1: v, r: 30, color: '--c4', width: 2, label: `${num(s.v, 0)}°` },
      { type: 'segment', x1: 0, y1: 0, x2: c, y2: si, color: '--c4', width: 2 },
      { type: 'segment', x1: 0, y1: 0, x2: c, y2: 0, color: '--c1', width: 4, label: 'cos v' },
      { type: 'segment', x1: c, y1: 0, x2: c, y2: si, color: '--c2', width: 4, label: 'sin v' },
      { type: 'point', x: c, y: si, color: '--c4', label: `(${num(c)}; ${num(si)})`, drag: (x, y) => { s.v = (Math.round(deg(Math.atan2(y, x))) + 360) % 360; update(); } },
    ];
  });

  const info = el('div', { class: 'formula' });
  const modeCtl = segmented([{ value: 'trekant', label: 'Trekant' }, { value: 'cirkel', label: 'Enhedscirklen' }], s.mode, (v) => {
    s.mode = v;
    g.setView(v === 'trekant' ? { xmin: -6, xmax: 6, ymin: -4, ymax: 5 } : { xmin: -1.6, xmax: 1.6, ymin: -1.3, ymax: 1.3 });
    tip.innerHTML = math(v === 'trekant' ? 'Træk i hjørnerne $A$, $B$ og $C$. Prøv at gøre trekanten retvinklet!' : 'Træk punktet rundt på enhedscirklen.');
    update();
  });
  const tip = hint('Træk i hjørnerne $A$, $B$ og $C$. Prøv at gøre trekanten retvinklet!');
  panel.append(modeCtl, tip, info, card('Husk', `
    <ul>
      <li>Side $a$ ligger over for vinkel $A$, $b$ over for $B$ og $c$ over for $C$.</li>
      <li>Vinkelsummen er $A+B+C=180^\\circ$.</li>
      <li><b>Cosinusrelation:</b> $a^2=b^2+c^2-2bc\\cos A$</li>
      <li><b>Sinusrelation:</b> $\\dfrac{a}{\\sin A}=\\dfrac{b}{\\sin B}=\\dfrac{c}{\\sin C}$</li>
      <li><b>Areal:</b> $T=\\tfrac12\\,a\\,b\\,\\sin C$</li>
    </ul>`));

  function update() {
    if (s.mode === 'cirkel') {
      const v = s.v * RAD;
      const t = Math.abs(Math.cos(v)) < 1e-9 ? '\\text{ikke defineret}' : tn(Math.tan(v), 3);
      info.innerHTML = math(`
        $$v=${s.v}^\\circ=${tn(v, 3)}\\text{ rad}$$
        <div class="result">$$\\cos v=${tn(Math.cos(v), 3)},\\qquad \\sin v=${tn(Math.sin(v), 3)}$$</div>
        $$\\tan v=\\frac{\\sin v}{\\cos v}=${t}$$
        <p class="muted">Punktet på enhedscirklen har koordinaterne $(\\cos v\\,;\\,\\sin v)$. Derfor gælder altid $\\cos^2v+\\sin^2v=1$.</p>`);
    } else {
      const { A, B, C } = s;
      const a = dist(B, C), b = dist(C, A), c = dist(A, B);
      const vA = angleAt(A, B, C), vB = angleAt(B, C, A), vC = angleAt(C, A, B);
      const T = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
      if (T < 1e-9) { info.innerHTML = math('<p>Punkterne ligger på linje – det er ikke en trekant.</p>'); g.draw(); return; }
      const right = [['A', vA], ['B', vB], ['C', vC]].find(([, v]) => Math.abs(v - 90) < 0.05);
      let extra = '';
      if (right) {
        const [k] = right;
        const [hyp, k1, k2] = k === 'C' ? ['c', 'a', 'b'] : k === 'A' ? ['a', 'b', 'c'] : ['b', 'a', 'c'];
        const L = { a, b, c };
        extra = `<p><span class="badge b-ok">retvinklet ved ${k}</span> Pythagoras:</p>
          $$${k1}^2+${k2}^2=${tn(L[k1] ** 2)}+${tn(L[k2] ** 2)}=${tn(L[hyp] ** 2)}=${hyp}^2$$`;
      }
      info.innerHTML = math(`
        $$a=${tn(a)},\\quad b=${tn(b)},\\quad c=${tn(c)}$$
        $$A=${tn(vA, 1)}^\\circ,\\quad B=${tn(vB, 1)}^\\circ,\\quad C=${tn(vC, 1)}^\\circ$$
        <p class="muted">Vinkel $A$ med cosinusrelationen:</p>
        $$\\cos A=\\frac{b^2+c^2-a^2}{2bc}=${tn((b * b + c * c - a * a) / (2 * b * c), 3)}$$
        <div class="result">$$T=\\tfrac12\\,a\\,b\\,\\sin C=${tn(T)}$$</div>
        ${extra}`);
    }
    g.draw();
  }
  update();
}

// ---------- opgaver ----------

function rightTriangle(a, b, labels) {
  // retvinklet ved C=(0,0), A=(b,0), B=(0,a)
  const C = { x: 0, y: 0 }, A = { x: b, y: 0 }, B = { x: 0, y: a };
  const m = Math.max(a, b);
  return {
    view: { xmin: -0.25 * m, xmax: 1.25 * m, ymin: -0.25 * m, ymax: 1.1 * m },
    scene: () => triangleItems(A, B, C, labels),
  };
}

const exercises = [
  {
    id: 'retv',
    title: 'Retvinklede trekanter',
    make() {
      const v = pick(['pyt', 'sin', 'cos', 'tan', 'vinkel']);
      if (v === 'pyt') {
        const [a, b, c] = pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25], [9, 12, 15]]);
        const ask = pick(['c', 'b']);
        return {
          prompt: ask === 'c' ? `Trekant $ABC$ er retvinklet ved $C$, og $a=${a}$, $b=${b}$. Bestem hypotenusen $c$.` : `Trekant $ABC$ er retvinklet ved $C$, og $a=${a}$, $c=${c}$. Bestem kateten $b$.`,
          graph: rightTriangle(a, b, ask === 'c' ? { a: `${a}`, b: `${b}`, c: '?', C: '90°' } : { a: `${a}`, b: '?', c: `${c}`, C: '90°' }),
          fields: [{ label: ask, answer: ask === 'c' ? c : b }],
          hint: 'Pythagoras: $a^2+b^2=c^2$, hvor $c$ er hypotenusen.',
          solution: ask === 'c' ? `$$c=\\sqrt{a^2+b^2}=\\sqrt{${a}^2+${b}^2}=\\sqrt{${c * c}}=${c}$$` : `$$b=\\sqrt{c^2-a^2}=\\sqrt{${c}^2-${a}^2}=\\sqrt{${b * b}}=${b}$$`,
        };
      }
      const A = rint(20, 70), c = rint(4, 12);
      const a = c * Math.sin(A * RAD), b = c * Math.cos(A * RAD);
      if (v === 'sin') return {
        prompt: `Trekant $ABC$ er retvinklet ved $C$. Hypotenusen er $c=${c}$, og $A=${A}^\\circ$. Bestem $a$. Afrund til to decimaler.`,
        graph: rightTriangle(a, b, { a: '?', b: '', c: `${c}`, A: `${A}°`, C: '90°' }),
        fields: [{ label: 'a', answer: a, tol: 0.011 }],
        hint: '$\\sin A=\\dfrac{\\text{modstående katete}}{\\text{hypotenuse}}=\\dfrac{a}{c}$.',
        solution: `$$a=c\\cdot\\sin A=${c}\\cdot\\sin(${A}^\\circ)\\approx ${tn(a)}$$`,
      };
      if (v === 'cos') return {
        prompt: `Trekant $ABC$ er retvinklet ved $C$. Hypotenusen er $c=${c}$, og $A=${A}^\\circ$. Bestem $b$. Afrund til to decimaler.`,
        graph: rightTriangle(a, b, { a: '', b: '?', c: `${c}`, A: `${A}°`, C: '90°' }),
        fields: [{ label: 'b', answer: b, tol: 0.011 }],
        hint: '$\\cos A=\\dfrac{\\text{hosliggende katete}}{\\text{hypotenuse}}=\\dfrac{b}{c}$.',
        solution: `$$b=c\\cdot\\cos A=${c}\\cdot\\cos(${A}^\\circ)\\approx ${tn(b)}$$`,
      };
      if (v === 'tan') {
        const bb = rint(3, 10), aa = bb * Math.tan(A * RAD);
        return {
          prompt: `Trekant $ABC$ er retvinklet ved $C$. Kateten $b=${bb}$, og $A=${A}^\\circ$. Bestem $a$. Afrund til to decimaler.`,
          graph: rightTriangle(aa, bb, { a: '?', b: `${bb}`, c: '', A: `${A}°`, C: '90°' }),
          fields: [{ label: 'a', answer: aa, tol: 0.011 }],
          hint: '$\\tan A=\\dfrac{\\text{modstående katete}}{\\text{hosliggende katete}}=\\dfrac{a}{b}$.',
          solution: `$$a=b\\cdot\\tan A=${bb}\\cdot\\tan(${A}^\\circ)\\approx ${tn(aa)}$$`,
        };
      }
      const aa = rint(2, 9), bb = rint(2, 9), vA = deg(Math.atan(aa / bb));
      return {
        prompt: `Trekant $ABC$ er retvinklet ved $C$, med kateterne $a=${aa}$ og $b=${bb}$. Bestem vinkel $A$ i grader. Afrund til én decimal.`,
        graph: rightTriangle(aa, bb, { a: `${aa}`, b: `${bb}`, c: '', A: '?', C: '90°' }),
        fields: [{ label: 'A', answer: vA, tol: 0.06 }],
        hint: 'Brug $\\tan A=\\dfrac{a}{b}$ og den omvendte funktion $\\tan^{-1}$.',
        solution: `$$A=\\tan^{-1}\\!\\left(\\frac{a}{b}\\right)=\\tan^{-1}\\!\\left(\\frac{${aa}}{${bb}}\\right)\\approx ${tn(vA, 1)}^\\circ$$`,
      };
    },
  },
  {
    id: 'cosrel',
    title: 'Cosinusrelationen',
    make() {
      if (Math.random() < 0.5) {
        const b = rint(3, 10), c = rint(3, 10), A = rint(25, 140);
        const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(A * RAD));
        return {
          prompt: `I trekant $ABC$ er $b=${b}$, $c=${c}$ og $A=${A}^\\circ$. Bestem siden $a$. Afrund til to decimaler.`,
          fields: [{ label: 'a', answer: a, tol: 0.011 }],
          hint: 'Cosinusrelationen: $a^2=b^2+c^2-2bc\\cos A$.',
          solution: `$$a=\\sqrt{${b}^2+${c}^2-2\\cdot${b}\\cdot${c}\\cdot\\cos(${A}^\\circ)}\\approx ${tn(a)}$$`,
        };
      }
      let a, b, c;
      do { a = rint(3, 10); b = rint(3, 10); c = rint(3, 10); } while (a >= b + c || b >= a + c || c >= a + b);
      const A = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
      return {
        prompt: `En trekant har siderne $a=${a}$, $b=${b}$ og $c=${c}$. Bestem vinkel $A$. Afrund til én decimal.`,
        fields: [{ label: 'A', answer: A, tol: 0.06 }],
        hint: 'Isolér $\\cos A$ i cosinusrelationen: $\\cos A=\\dfrac{b^2+c^2-a^2}{2bc}$.',
        solution: `$$\\cos A=\\frac{${b}^2+${c}^2-${a}^2}{2\\cdot${b}\\cdot${c}}=\\frac{${b * b + c * c - a * a}}{${2 * b * c}}$$ $$A=\\cos^{-1}\\!\\left(\\frac{${b * b + c * c - a * a}}{${2 * b * c}}\\right)\\approx ${tn(A, 1)}^\\circ$$`,
      };
    },
  },
  {
    id: 'sinrel',
    title: 'Sinusrelationen',
    make() {
      const A = rint(30, 80), B = rint(30, 80), a = rint(4, 12);
      const b = (a * Math.sin(B * RAD)) / Math.sin(A * RAD);
      return {
        prompt: `I trekant $ABC$ er $A=${A}^\\circ$, $B=${B}^\\circ$ og $a=${a}$. Bestem $b$. Afrund til to decimaler.`,
        fields: [{ label: 'b', answer: b, tol: 0.011 }],
        hint: 'Sinusrelationen: $\\dfrac{a}{\\sin A}=\\dfrac{b}{\\sin B}$.',
        solution: `$$b=\\frac{a\\cdot\\sin B}{\\sin A}=\\frac{${a}\\cdot\\sin(${B}^\\circ)}{\\sin(${A}^\\circ)}\\approx ${tn(b)}$$`,
      };
    },
  },
  {
    id: 'areal',
    title: 'Arealet af en trekant',
    make() {
      const a = rint(3, 12), b = rint(3, 12), C = rint(20, 150);
      const T = 0.5 * a * b * Math.sin(C * RAD);
      return {
        prompt: `I trekant $ABC$ er $a=${a}$, $b=${b}$ og $C=${C}^\\circ$. Bestem arealet $T$. Afrund til to decimaler.`,
        fields: [{ label: 'T', answer: T, tol: 0.011 }],
        hint: 'Brug $T=\\tfrac12\\,a\\,b\\,\\sin C$, hvor $C$ er vinklen mellem siderne $a$ og $b$.',
        solution: `$$T=\\tfrac12\\cdot${a}\\cdot${b}\\cdot\\sin(${C}^\\circ)\\approx ${tn(T)}$$`,
      };
    },
  },
  {
    id: 'eksakt',
    title: 'Eksakte værdier',
    make() {
      const table = { 0: ['1', '0'], 30: ['\\frac{\\sqrt3}{2}', '\\frac12'], 45: ['\\frac{\\sqrt2}{2}', '\\frac{\\sqrt2}{2}'], 60: ['\\frac12', '\\frac{\\sqrt3}{2}'], 90: ['0', '1'] };
      const v = pick([30, 45, 60, 90, 0]);
      const fn = pick(['cos', 'sin']);
      const right = table[v][fn === 'cos' ? 0 : 1];
      const opts = [...new Set(['0', '\\frac12', '\\frac{\\sqrt2}{2}', '\\frac{\\sqrt3}{2}', '1'])].filter((o) => o !== right);
      return {
        prompt: `Hvad er $\\${fn}(${v}^\\circ)$?`,
        choices: shuffle([{ html: `$${right}$`, correct: true }, ...shuffle(opts).slice(0, 3).map((o) => ({ html: `$${o}$` }))]),
        hint: 'Tænk på enhedscirklen: punktet ved vinklen $v$ har koordinaterne $(\\cos v\\,;\\,\\sin v)$.',
        solution: `$$\\${fn}(${v}^\\circ)=${right}\\approx ${tn(Math[fn](v * RAD), 3)}$$`,
      };
    },
  },
  {
    id: 'ensvinklede',
    title: 'Ensvinklede trekanter',
    make() {
      const k = pick([1.5, 2, 2.5, 3, 0.5]);
      let a, b, c;
      do { a = rint(3, 9); b = rint(3, 9); c = rint(3, 9); } while (a >= b + c || b >= a + c || c >= a + b);
      const ask = pick(['b', 'c']), side = ask === 'b' ? b : c;
      return {
        prompt: `Trekanterne $ABC$ og $A_1B_1C_1$ er ensvinklede. I $ABC$ er $a=${a}$, $b=${b}$ og $c=${c}$. I $A_1B_1C_1$ er $a_1=${tn(k * a)}$. Bestem $${ask}_1$.`,
        fields: [{ label: `${ask}_1`, answer: k * side, tol: 0.006 }],
        hint: 'I ensvinklede trekanter er forholdet mellem ensliggende sider det samme: skalafaktoren $k=\\dfrac{a_1}{a}$.',
        solution: `$$k=\\frac{a_1}{a}=\\frac{${tn(k * a)}}{${a}}=${tn(k)},\\qquad ${ask}_1=k\\cdot ${ask}=${tn(k)}\\cdot${side}=${tn(k * side)}$$`,
      };
    },
  },
  {
    id: 'thales',
    title: 'Gør trekanten retvinklet',
    interactive: true,
    make() {
      const A = { x: -2.5, y: -1 }, B = { x: 2.5, y: -1 };
      const st = { C: { x: pick([-3, 3, 1]), y: 3.5 } };
      return {
        prompt: 'Træk hjørnet $C$, så trekanten bliver <b>retvinklet ved $C$</b>.',
        graph: {
          view: { xmin: -5, xmax: 5, ymin: -4.5, ymax: 4.5 },
          state: st,
          scene: (s, rev) => [
            rev && { type: 'circle', x: 0, y: -1, r: 2.5, color: '--c3', width: 2, dash: true },
            ...triangleItems(A, B, s.C, { C: `${num(angleAt(s.C, A, B), 1)}°`, a: '', b: '', c: '' }),
            { type: 'point', x: A.x, y: A.y, color: '--c1', label: 'A', ldx: -18 },
            { type: 'point', x: B.x, y: B.y, color: '--c1', label: 'B' },
            { type: 'point', x: s.C.x, y: s.C.y, color: '--c4', label: 'C', snap: 0.5, drag: (x, y) => { s.C = { x, y }; } },
          ],
        },
        check: (s) => Math.abs(angleAt(s.C, A, B) - 90) < 1e-6,
        hint: 'Thales\' sætning: $C$ skal ligge på cirklen med $AB$ som diameter. Centrum er midtpunktet af $AB$, og radius er $2{,}5$.',
        solution: 'Alle punkter på cirklen med diameter $AB$ (stiplet) giver en ret vinkel ved $C$ – fx $C(0\\,;\\,1{,}5)$ eller $C(1{,}5\\,;\\,1)$. Det er <b>Thales\' sætning</b>.',
      };
    },
  },
  {
    id: 'enhedsvinkel',
    title: 'Find vinklen på enhedscirklen',
    interactive: true,
    make() {
      const target = pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]);
      const fn = pick(['cos', 'sin']);
      const val = Math[fn](target * RAD);
      const st = { v: 0 };
      // vælg den vinkel i [0;360) der giver samme værdi, men en anden løsning findes også
      const other = fn === 'cos' ? (360 - target) % 360 : (540 - target) % 360;
      const quadrant = target < 90 ? 'første' : target < 180 ? 'anden' : target < 270 ? 'tredje' : 'fjerde';
      return {
        prompt: `Træk punktet til en vinkel $v$ i <b>${quadrant} kvadrant</b>, hvor $\\${fn}(v)=${tn(val, 3)}$.`,
        graph: {
          view: { xmin: -1.6, xmax: 1.6, ymin: -1.3, ymax: 1.3 },
          state: st,
          scene: (s, rev) => {
            const v = s.v * RAD;
            return [
              { type: 'circle', x: 0, y: 0, r: 1, color: '--g-axis', width: 1.5 },
              { type: 'arc', x: 0, y: 0, a0: 0, a1: v, r: 28, color: '--c4', width: 2, label: `${s.v}°` },
              { type: 'segment', x1: 0, y1: 0, x2: Math.cos(v), y2: Math.sin(v), color: '--c4', width: 2 },
              rev && { type: 'point', x: Math.cos(target * RAD), y: Math.sin(target * RAD), color: '--c3', r: 6, label: `${target}°` },
              { type: 'point', x: Math.cos(v), y: Math.sin(v), color: '--c4', drag: (x, y) => { s.v = (Math.round(deg(Math.atan2(y, x)) / 5) * 5 + 360) % 360; } },
            ];
          },
        },
        check: (s) => s.v === target,
        hint: `$\\${fn}(v)$ er punktets ${fn === 'cos' ? '$x$' : '$y$'}-koordinat. Find det sted i ${quadrant} kvadrant, hvor ${fn === 'cos' ? '$x$' : '$y$'} er $${tn(val, 3)}$.`,
        solution: `$\\${fn}(${target}^\\circ)\\approx ${tn(val, 3)}$. (Den anden løsning i $[0^\\circ;360^\\circ[$ er $${other}^\\circ$.)`,
      };
    },
  },
];

const learn = `
<h2>Betegnelser</h2>
<p>I en trekant $ABC$ kalder man vinklerne $A$, $B$, $C$ og siderne $a$, $b$, $c$. Side $a$ ligger <b>over for</b> vinkel $A$ osv. Vinkelsummen er altid $180^\\circ$.</p>

<h2>Retvinklede trekanter</h2>
<p>Er trekanten retvinklet ved $C$, er $c$ <b>hypotenusen</b> og $a$, $b$ <b>kateterne</b>.</p>
<div class="rule">$$a^2+b^2=c^2\\qquad \\sin A=\\frac{a}{c}\\qquad \\cos A=\\frac{b}{c}\\qquad \\tan A=\\frac{a}{b}$$</div>
<p>Huskeregel: <b>sin = modstående/hypotenuse</b>, <b>cos = hosliggende/hypotenuse</b>, <b>tan = modstående/hosliggende</b>. Vinkler findes med de omvendte funktioner, fx $A=\\sin^{-1}\\!\\left(\\frac{a}{c}\\right)$.</p>
<div class="example">Hypotenusen er $10$ og $A=30^\\circ$: $$a=10\\cdot\\sin(30^\\circ)=5,\\qquad b=10\\cdot\\cos(30^\\circ)\\approx 8{,}66$$</div>

<h2>Vilkårlige trekanter</h2>
<div class="rule">$$\\textbf{Cosinusrelationen:}\\quad a^2=b^2+c^2-2bc\\cos A\\qquad\\Leftrightarrow\\qquad \\cos A=\\frac{b^2+c^2-a^2}{2bc}$$</div>
<p>Bruges når man kender <b>tre sider</b> (find en vinkel) eller <b>to sider og vinklen imellem</b> (find den tredje side).</p>
<div class="rule">$$\\textbf{Sinusrelationen:}\\quad \\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}$$</div>
<p>Bruges når man kender en side og den modstående vinkel. Pas på: når man finder en <i>vinkel</i> med sinusrelationen, kan der være to løsninger ($v$ og $180^\\circ-v$).</p>
<div class="rule">$$\\textbf{Areal:}\\quad T=\\tfrac12\\,a\\,b\\,\\sin C$$</div>

<h2>Ensvinklede trekanter</h2>
<p>To trekanter er <b>ensvinklede</b>, hvis de har de samme vinkler. Så er siderne proportionale med en <b>skalafaktor</b> $k$:</p>
<div class="rule">$$\\frac{a_1}{a}=\\frac{b_1}{b}=\\frac{c_1}{c}=k$$</div>
<p>Arealet ganges med $k^2$.</p>

<h2>Enhedscirklen</h2>
<p>Enhedscirklen har centrum i $(0,0)$ og radius 1. Drejer man vinklen $v$ fra $x$-aksen, har punktet koordinaterne $(\\cos v\\,;\\,\\sin v)$. Derfor er</p>
<div class="rule">$$\\cos^2 v+\\sin^2 v=1\\qquad\\tan v=\\frac{\\sin v}{\\cos v}$$</div>
<table class="vt"><thead><tr><th>$v$</th><th>$0^\\circ$</th><th>$30^\\circ$</th><th>$45^\\circ$</th><th>$60^\\circ$</th><th>$90^\\circ$</th></tr></thead>
<tbody><tr><td>$\\cos v$</td><td>$1$</td><td>$\\frac{\\sqrt3}{2}$</td><td>$\\frac{\\sqrt2}{2}$</td><td>$\\frac12$</td><td>$0$</td></tr>
<tr><td>$\\sin v$</td><td>$0$</td><td>$\\frac12$</td><td>$\\frac{\\sqrt2}{2}$</td><td>$\\frac{\\sqrt3}{2}$</td><td>$1$</td></tr></tbody></table>`;

export default {
  id: 'trigonometri',
  title: 'Trigonometri',
  short: 'Trigonometri',
  formula: '\\sin A=\\tfrac{a}{c}',
  desc: 'Retvinklede trekanter, sinus, cosinus og tangens, cosinus- og sinusrelationen, areal og enhedscirklen.',
  learn,
  explore,
  exercises,
};
