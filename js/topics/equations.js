// Kategorien "Løs ligninger": opgaver med trin-for-trin-løsninger,
// en ligningsløser og en oversigt over metoderne.
import { Graph } from '../graph.js';
import { el, tex, exploreLayout, card } from '../ui.js';
import { rint, rintNZ, pick, tn, par, eq, polyTex, linTex, num, round } from '../util.js';
import { tryCompile } from '../parser.js';

/** Trin i en løsning: [{ text, tex }] → HTML. */
const steps = (list) => list.map((s) => `${s.text ? `<p class="step">${s.text}</p>` : ''}${s.tex ? `$$${s.tex}$$` : ''}`).join('');
const factor = (r) => (r === 0 ? 'x' : `(${polyTex([1, -r])})`);
const coef = (c) => (c === 1 ? '' : c === -1 ? '-' : tn(c));
const lin2 = (a, b, c) => `${coef(a)}x ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : tn(Math.abs(b))}y = ${tn(c)}`;

const exercises = [
  {
    id: 'lin',
    title: 'Lineære ligninger',
    make() {
      const x0 = rint(-6, 6), a = rintNZ(-6, 6), b = rint(-9, 9);
      let c;
      do c = rint(-6, 6); while (c === a);
      const d = a * x0 + b - c * x0;
      const k = a - c;
      const s = [];
      if (c !== 0) s.push({ text: `Træk $${polyTex([c, 0])}$ fra på begge sider:`, tex: `${linTex(k, b)}=${tn(d)}` });
      if (b !== 0) s.push({ text: b > 0 ? `Træk $${tn(b)}$ fra på begge sider:` : `Læg $${tn(-b)}$ til på begge sider:`, tex: `${polyTex([k, 0])}=${tn(d - b)}` });
      if (k !== 1) s.push({ text: `Divider med $${tn(k)}$ på begge sider:`, tex: `x=${tn(x0)}` });
      return {
        prompt: `Løs ligningen $${linTex(a, b)}=${linTex(c, d)}$.`,
        fields: [{ label: 'x', answer: x0 }],
        hint: 'Saml alle led med $x$ på den ene side og tallene på den anden. Gør altid det samme på begge sider.',
        solution: steps(s),
      };
    },
  },
  {
    id: 'brok',
    title: 'Ligninger med brøker',
    make() {
      if (Math.random() < 0.5) {
        const p = rint(2, 6), k = rint(-5, 5), q = rintNZ(-6, 6), r = k + q, x0 = p * k;
        return {
          prompt: `Løs ligningen $\\dfrac{x}{${p}}${q < 0 ? '-' : '+'}${Math.abs(q)}=${tn(r)}$.`,
          fields: [{ label: 'x', answer: x0 }],
          hint: `Isolér brøken først, og gang derefter med ${p} på begge sider.`,
          solution: steps([
            { text: q > 0 ? `Træk $${q}$ fra på begge sider:` : `Læg $${-q}$ til på begge sider:`, tex: `\\frac{x}{${p}}=${tn(k)}` },
            { text: `Gang med $${p}$ på begge sider:`, tex: `x=${tn(x0)}` },
          ]),
        };
      }
      let p, q;
      do { p = rint(2, 5); q = rint(2, 5); } while (p === q);
      const x0 = rint(-6, 6), m = p * rintNZ(-3, 3), a = m - x0, b = (q * m) / p - x0;
      return {
        prompt: `Løs ligningen $\\dfrac{${polyTex([1, a])}}{${p}}=\\dfrac{${polyTex([1, b])}}{${q}}$.`,
        fields: [{ label: 'x', answer: x0 }],
        hint: 'Gang over kors: $\\dfrac{A}{p}=\\dfrac{B}{q}\\Leftrightarrow q\\cdot A=p\\cdot B$.',
        solution: steps([
          { text: 'Gang over kors:', tex: `${q}(${polyTex([1, a])})=${p}(${polyTex([1, b])})` },
          { text: 'Gang parenteserne ud:', tex: `${linTex(q, q * a)}=${linTex(p, p * b)}` },
          { text: 'Saml $x$ på venstre side og tallene på højre:', tex: `${polyTex([q - p, 0])}=${tn(p * b - q * a)}` },
          { text: q - p === 1 ? '' : `Divider med $${q - p}$:`, tex: `x=${tn(x0)}` },
        ]),
      };
    },
  },
  {
    id: 'nul',
    title: 'Nulreglen',
    make() {
      const r1 = rint(-6, 6);
      if (Math.random() < 0.35) {
        let m;
        do m = pick([-7, -5, -3, -1, 1, 3, 5, 7]); while (m / 2 === r1);
        return {
          prompt: `Løs ligningen $(${polyTex([2, -m])})${factor(r1)}=0$.`,
          fields: [{ label: 'x_1', answer: m / 2 }, { label: 'x_2', answer: r1 }],
          unordered: true,
          hint: 'Et produkt er 0, netop når mindst én af faktorerne er 0.',
          solution: steps([
            { text: 'Nulreglen: et produkt er 0, netop når en af faktorerne er 0.', tex: `${polyTex([2, -m])}=0\\quad\\vee\\quad ${polyTex([1, -r1])}=0` },
            { tex: `x=${tn(m / 2)}\\quad\\vee\\quad x=${tn(r1)}` },
          ]),
        };
      }
      let r2;
      do r2 = rint(-6, 6); while (r2 === r1);
      const k = pick([1, 1, 2, 3, -1, -2]);
      return {
        prompt: `Løs ligningen $${coef(k)}${factor(r1)}${factor(r2)}=0$.`,
        fields: [{ label: 'x_1', answer: r1 }, { label: 'x_2', answer: r2 }],
        unordered: true,
        hint: 'Et produkt er 0, netop når mindst én af faktorerne er 0.',
        solution: steps([
          { text: `Nulreglen: et produkt er 0, netop når en af faktorerne er 0${k !== 1 ? ` (tallet $${tn(k)}$ kan ikke være 0)` : ''}.`, tex: `${polyTex([1, -r1])}=0\\quad\\vee\\quad ${polyTex([1, -r2])}=0` },
          { tex: `x=${tn(r1)}\\quad\\vee\\quad x=${tn(r2)}` },
        ]),
      };
    },
  },
  {
    id: 'kvad',
    title: 'Andengradsligninger',
    make() {
      const v = pick(['ren', 'ufuld', 'fuld', 'fuld']);
      if (v === 'ren') {
        const a = rint(1, 5), x0 = rint(1, 6), k = a * x0 * x0;
        return {
          prompt: `Løs ligningen $${coef(a)}x^2=${k}$.`,
          fields: [{ label: 'x_1', answer: x0 }, { label: 'x_2', answer: -x0 }],
          unordered: true,
          hint: 'Isolér $x^2$ og tag kvadratroden. Husk, at der er to løsninger!',
          solution: steps([
            a !== 1 && { text: `Divider med $${a}$:`, tex: `x^2=${x0 * x0}` },
            { text: 'Tag kvadratroden – både den positive og den negative:', tex: `x=\\pm\\sqrt{${x0 * x0}}=\\pm ${x0}` },
          ].filter(Boolean)),
        };
      }
      if (v === 'ufuld') {
        const a = pick([1, 2, 3, -1, -2]), r = rintNZ(-6, 6), b = -a * r;
        return {
          prompt: `Løs ligningen $${polyTex([a, b, 0])}=0$.`,
          fields: [{ label: 'x_1', answer: 0 }, { label: 'x_2', answer: r }],
          unordered: true,
          hint: 'Der er intet konstantled, så du kan sætte $x$ uden for parentes og bruge nulreglen.',
          solution: steps([
            { text: 'Sæt $x$ uden for parentes:', tex: `x(${linTex(a, b)})=0` },
            { text: 'Brug nulreglen:', tex: `x=0\\quad\\vee\\quad ${linTex(a, b)}=0` },
            { tex: `x=0\\quad\\vee\\quad x=${tn(r)}` },
          ]),
        };
      }
      const a = pick([1, 1, -1, 2]), r1 = rint(-6, 6);
      let r2;
      do r2 = rint(-6, 6); while (r2 === r1);
      const b = -a * (r1 + r2), c = a * r1 * r2, d = b * b - 4 * a * c;
      return {
        prompt: `Løs ligningen $${polyTex([a, b, c])}=0$.`,
        fields: [{ label: 'x_1', answer: r1 }, { label: 'x_2', answer: r2 }],
        unordered: true,
        hint: 'Beregn diskriminanten $d=b^2-4ac$ og brug $x=\\dfrac{-b\\pm\\sqrt d}{2a}$.',
        solution: steps([
          { text: 'Beregn diskriminanten:', tex: `d=${par(b)}^2-4\\cdot${par(a)}\\cdot${par(c)}=${d}` },
          { text: 'Brug løsningsformlen:', tex: `x=\\frac{${tn(-b)}\\pm\\sqrt{${d}}}{${2 * a}}=\\frac{${tn(-b)}\\pm${Math.sqrt(d)}}{${2 * a}}` },
          { tex: `x=${Math.min(r1, r2)}\\quad\\vee\\quad x=${Math.max(r1, r2)}` },
        ]),
      };
    },
  },
  {
    id: 'pot',
    title: 'Potens- og rodligninger',
    make() {
      const v = pick(['pot', 'pot', 'apot', 'rod']);
      if (v === 'rod') {
        const b = rint(1, 7), a = rint(-9, 9), x0 = b * b - a;
        return {
          prompt: `Løs ligningen $\\sqrt{${polyTex([1, a])}}=${b}$.`,
          fields: [{ label: 'x', answer: x0 }],
          hint: 'Kvadrér begge sider for at slippe af med kvadratroden. Gør prøve bagefter.',
          solution: steps([
            { text: 'Kvadrér begge sider:', tex: `${polyTex([1, a])}=${b * b}` },
            { tex: `x=${x0}` },
            { text: 'Prøve:', tex: `\\sqrt{${tn(x0)}${a < 0 ? '-' : '+'}${Math.abs(a)}}=\\sqrt{${b * b}}=${b}\\quad\\checkmark` },
          ]),
        };
      }
      const n = pick([2, 3, 3, 4, 5]);
      const x0 = n === 2 ? rint(2, 12) : n === 3 ? rint(2, 6) : n === 4 ? rint(2, 4) : rint(2, 3);
      const a = v === 'apot' ? rint(2, 5) : 1, k = a * x0 ** n;
      return {
        prompt: `Løs ligningen $${coef(a)}x^{${n}}=${k}$, hvor $x>0$.`,
        fields: [{ label: 'x', answer: x0 }],
        hint: `Isolér $x^{${n}}$ og tag den ${n}. rod på begge sider: $x=\\sqrt[${n}]{k}=k^{1/${n}}$.`,
        solution: steps([
          a !== 1 && { text: `Divider med $${a}$:`, tex: `x^{${n}}=${x0 ** n}` },
          { text: `Tag den ${n}. rod på begge sider:`, tex: `x=\\sqrt[${n}]{${x0 ** n}}=${x0}` },
        ].filter(Boolean)),
      };
    },
  },
  {
    id: 'eksp',
    title: 'Eksponentialligninger',
    make() {
      const v = pick(['exact', 'exact', 'growth', 'e']);
      if (v === 'exact') {
        const a = pick([2, 3, 5, 10]), x0 = a === 10 ? rint(1, 4) : rint(1, a === 2 ? 7 : 4), b = pick([1, 1, 2, 3, 5]);
        const k = b * a ** x0;
        return {
          prompt: `Løs ligningen $${b === 1 ? '' : `${b}\\cdot `}${a}^x=${k}$.`,
          fields: [{ label: 'x', answer: x0 }],
          hint: 'Isolér potensen og tag logaritmen på begge sider: $a^x=k\\Leftrightarrow x=\\dfrac{\\ln k}{\\ln a}$.',
          solution: steps([
            b !== 1 && { text: `Divider med $${b}$:`, tex: `${a}^x=${a ** x0}` },
            { text: 'Tag logaritmen på begge sider:', tex: `x=\\frac{\\ln(${a ** x0})}{\\ln(${a})}=${x0}` },
            { text: `Det kan også ses direkte, da $${a}^{${x0}}=${a ** x0}$.` },
          ].filter(Boolean)),
        };
      }
      if (v === 'e') {
        const k = pick([2, 3, 5, 10, 20, 50]), c = pick([1, 2]);
        const x0 = Math.log(k) / c;
        return {
          prompt: `Løs ligningen $e^{${c === 1 ? '' : c}x}=${k}$. Afrund til to decimaler.`,
          fields: [{ label: 'x', answer: x0, tol: 0.011 }],
          hint: '$\\ln$ og $e^x$ ophæver hinanden: $e^{u}=k\\Leftrightarrow u=\\ln k$.',
          solution: steps([
            { text: 'Tag den naturlige logaritme på begge sider:', tex: `${c === 1 ? '' : c}x=\\ln(${k})` },
            { tex: `x=${c === 1 ? `\\ln(${k})` : `\\frac{\\ln(${k})}{${c}}`}\\approx ${tn(x0)}` },
          ]),
        };
      }
      const a = pick([1.02, 1.03, 1.05, 1.08, 1.1, 1.2]), b = pick([100, 250, 500, 1000]), m = pick([1.5, 2, 3]);
      const k = b * m, x0 = Math.log(m) / Math.log(a);
      return {
        prompt: `Løs ligningen $${b}\\cdot {${tn(a)}}^x=${tn(k)}$. Afrund til to decimaler.`,
        fields: [{ label: 'x', answer: x0, tol: 0.011 }],
        hint: 'Divider først med begyndelsesværdien, og tag så logaritmen på begge sider.',
        solution: steps([
          { text: `Divider med $${b}$:`, tex: `{${tn(a)}}^x=${tn(m)}` },
          { text: 'Tag logaritmen på begge sider:', tex: `x=\\frac{\\ln(${tn(m)})}{\\ln(${tn(a)})}\\approx ${tn(x0)}` },
        ]),
      };
    },
  },
  {
    id: 'log',
    title: 'Logaritmeligninger',
    make() {
      const v = pick(['log', 'ln', 'aln']);
      if (v === 'log') {
        const n = rint(-2, 4), x0 = 10 ** n;
        return {
          prompt: `Løs ligningen $\\log(x)=${n}$.`,
          fields: [{ label: 'x', answer: x0, rel: 0.001 }],
          hint: '$\\log$ er titalslogaritmen: $\\log(x)=n\\Leftrightarrow x=10^n$.',
          solution: steps([{ text: 'Brug at $10^x$ og $\\log(x)$ ophæver hinanden:', tex: `x=10^{${n}}=${tn(x0, 4)}` }]),
        };
      }
      const k = pick([1, 2, 3, 0.5, -1]);
      const a = v === 'aln' ? rint(2, 4) : 1, b = v === 'aln' ? rintNZ(-5, 5) : 0, c = a * k + b;
      const x0 = Math.exp(k);
      return {
        prompt: `Løs ligningen $${coef(a)}\\ln(x)${b ? (b < 0 ? `-${-b}` : `+${b}`) : ''}=${tn(c)}$. Afrund til to decimaler.`,
        fields: [{ label: 'x', answer: x0, rel: 0.005 }],
        hint: 'Isolér $\\ln(x)$, og brug at $\\ln(x)=k\\Leftrightarrow x=e^k$.',
        solution: steps([
          b !== 0 && { text: b > 0 ? `Træk $${b}$ fra:` : `Læg $${-b}$ til:`, tex: `${coef(a)}\\ln(x)=${tn(a * k)}` },
          a !== 1 && { text: `Divider med $${a}$:`, tex: `\\ln(x)=${tn(k)}` },
          { text: 'Opløft $e$ i begge sider:', tex: `x=e^{${tn(k)}}\\approx ${tn(x0)}` },
        ].filter(Boolean)),
      };
    },
  },
  {
    id: 'system',
    title: 'To ligninger med to ubekendte',
    make() {
      let a1, b1, a2, b2;
      do { a1 = rintNZ(-4, 4); b1 = rintNZ(-4, 4); a2 = rintNZ(-4, 4); b2 = rintNZ(-4, 4); }
      while (a1 * b2 - a2 * b1 === 0);
      const x0 = rint(-5, 5), y0 = rint(-5, 5);
      const c1 = a1 * x0 + b1 * y0, c2 = a2 * x0 + b2 * y0;
      const ky = b1 * a2 - b2 * a1, kc = c1 * a2 - c2 * a1;
      return {
        prompt: `Løs ligningssystemet $$\\begin{aligned} ${lin2(a1, b1, c1)} &\\quad (\\text{I})\\\\ ${lin2(a2, b2, c2)} &\\quad (\\text{II})\\end{aligned}$$`,
        fields: [{ label: 'x', answer: x0 }, { label: 'y', answer: y0 }],
        hint: 'Gang ligningerne med passende tal, så $x$-leddene bliver lige store, og træk dem fra hinanden (lige store koefficienters metode).',
        solution: steps([
          { text: `Gang (I) med $${par(a2)}$ og (II) med $${par(a1)}$, og træk dem fra hinanden, så $x$ forsvinder:`, tex: `${polyTex([ky, 0], 'y')}=${tn(kc)}` },
          { tex: `y=${tn(y0)}` },
          { text: 'Indsæt $y$ i (I):', tex: `${coef(a1)}x${b1 * y0 < 0 ? '-' : '+'}${Math.abs(b1 * y0)}=${c1}\\quad\\Rightarrow\\quad x=${tn(x0)}` },
          { text: `Løsningen er $(x,y)=(${x0},\\,${y0})$.` },
        ]),
      };
    },
  },
];

// ---------- ligningsløser ----------

/** Finder løsninger til L(x)=R(x) numerisk i [a; b]. */
export function solveNumeric(L, R, a, b, n = 6000) {
  const h = (x) => L(x) - R(x);
  const roots = [];
  const add = (x) => {
    const scale = Math.max(1, Math.abs(L(x)), Math.abs(R(x)));
    if (!Number.isFinite(x) || Math.abs(h(x)) > 1e-6 * scale) return;
    if (!roots.some((r) => Math.abs(r - x) < 1e-6 * Math.max(1, Math.abs(x)))) roots.push(x);
  };
  const dx = (b - a) / n;
  let x0 = a, y0 = h(a), ym = NaN;
  for (let i = 1; i <= n; i++) {
    const x1 = a + i * dx, y1 = h(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) add(x0);
      else if (y0 * y1 < 0) {
        let lo = x0, hi = x1, flo = y0;
        for (let k = 0; k < 80; k++) {
          const mid = (lo + hi) / 2, fm = h(mid);
          if (!Number.isFinite(fm)) break;
          if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
        }
        add((lo + hi) / 2);
      } else if (Number.isFinite(ym) && Math.abs(y0) < Math.abs(ym) && Math.abs(y0) < Math.abs(y1)) {
        // lokalt minimum af |h| – mulig dobbeltrod, hvor grafen kun rører
        let lo = x0 - dx, hi = x1;
        for (let k = 0; k < 100; k++) {
          const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
          if (Math.abs(h(m1)) < Math.abs(h(m2))) hi = m2; else lo = m1;
        }
        add((lo + hi) / 2);
      }
    }
    ym = y0; x0 = x1; y0 = y1;
  }
  if (Number.isFinite(y0) && y0 === 0) add(x0);
  return roots.sort((p, q) => p - q);
}

function solver(root) {
  const { graphBox, panel } = exploreLayout(root);
  const g = new Graph(graphBox, { xmin: -10, xmax: 10, ymin: -7, ymax: 7 });
  const s = { left: 'x^2 - 3', right: '2x', from: -20, to: 20, L: null, R: null, roots: [] };

  g.setScene(() => {
    const items = [];
    if (s.L) items.push({ type: 'fn', f: s.L, color: '--c1', width: 3 });
    if (s.R) items.push({ type: 'fn', f: s.R, color: '--c2', width: 3 });
    s.roots.forEach((x, i) => {
      const y = s.L(x);
      items.push({ type: 'segment', x1: x, y1: 0, x2: x, y2: y, color: '--c3', width: 1.5, dash: [3, 4] });
      items.push({ type: 'point', x, y, color: '--c3', label: `x${s.roots.length > 1 ? String.fromCharCode(8321 + i) : ''} ≈ ${num(x, 3)}` });
    });
    return items;
  });

  const mkInput = (val, label) => el('input', { type: 'text', value: val, spellcheck: 'false', autocomplete: 'off', 'aria-label': label });
  const left = mkInput(s.left, 'Venstre side');
  const right = mkInput(s.right, 'Højre side');
  const from = el('input', { type: 'text', inputmode: 'decimal', value: s.from, 'aria-label': 'Fra x' });
  const to = el('input', { type: 'text', inputmode: 'decimal', value: s.to, 'aria-label': 'Til x' });
  const err = el('div', { class: 'err' });
  const result = el('div', { class: 'formula' });

  const solve = () => {
    const l = tryCompile(left.value), r = tryCompile(right.value);
    const a = Number(from.value.replace(',', '.')), b = Number(to.value.replace(',', '.'));
    err.textContent = l.error ? `Venstre side: ${l.error}` : r.error ? `Højre side: ${r.error}` : !(a < b) ? 'Intervallet skal have "fra" mindre end "til".' : '';
    if (err.textContent) { s.L = l.f ?? null; s.R = r.f ?? null; s.roots = []; result.innerHTML = ''; g.draw(); return; }
    s.L = l.f; s.R = r.f;
    s.roots = solveNumeric(s.L, s.R, a, b).slice(0, 12);
    const list = s.roots.map((x, i) => `<li>${tex(`x${s.roots.length > 1 ? `_{${i + 1}}` : ''}${eq(x, 4)}${tn(x, 4)}`)}</li>`).join('');
    result.innerHTML = s.roots.length
      ? `<p><b>${s.roots.length === 1 ? 'Én løsning' : `${s.roots.length} løsninger`}</b> i intervallet [${num(a)}; ${num(b)}]:</p><ul class="roots">${list}</ul>`
      : `<p><b>Ingen løsninger</b> i intervallet [${num(a)}; ${num(b)}]. Prøv evt. et større interval.</p>`;
    g.draw();
  };
  for (const i of [left, right, from, to]) i.addEventListener('input', solve);

  const examples = [['x^2 - 3', '2x'], ['2^x', '10'], ['ln(x)', '1'], ['sin(x)', '0,5'], ['(x-1)^2', '0'], ['x^3 - 4x', '1']];
  const chips = el('div', { class: 'chips small' }, examples.map(([l, r]) => {
    const b = el('button', { type: 'button', class: 'chip' }, `${l} = ${r}`);
    b.addEventListener('click', () => { left.value = l; right.value = r; solve(); });
    return b;
  }));

  panel.append(
    el('div', { class: 'fn-list' },
      el('div', { class: 'fn-row' }, el('span', { class: 'swatch', style: 'background: var(--c1)' }), el('label', { class: 'fn-input' }, el('span', {}, 'Venstre'), left)),
      el('div', { class: 'fn-row' }, el('span', { class: 'swatch', style: 'background: var(--c2)' }), el('label', { class: 'fn-input' }, el('span', {}, 'Højre'), right)),
      el('div', { class: 'interval' }, el('span', {}, 'Søg efter løsninger for x mellem'), from, el('span', {}, 'og'), to),
      err),
    result,
    el('div', { class: 'panel-label' }, 'Eksempler'),
    chips,
    card('Sådan virker det', `
      <p>Løsningerne er de $x$-værdier, hvor graferne for venstre og højre side <b>skærer hinanden</b>.
      Ligningsløseren finder dem numerisk (som "nSolve" i CAS), så resultaterne er afrundede.</p>
      <p class="muted">Skriv udtryk som i graftegneren, fx <code>2x^2 - 3</code>, <code>e^(0,5x)</code>, <code>sqrt(x+1)</code>.</p>`),
  );
  solve();
}

// ---------- metoder ----------

const learn = `
<h2>Grundreglen</h2>
<p>En ligning er en påstand om, at to udtryk er lige store. Man må gøre <b>det samme på begge sider</b>: lægge til, trække fra, gange og dividere (dog ikke med 0).</p>

<h2>Lineære ligninger</h2>
<p>Saml $x$-leddene på den ene side og tallene på den anden, og divider til sidst med koefficienten foran $x$.</p>
<div class="example">$$\\begin{aligned} 5x-3&=2x+9\\\\ 3x&=12\\\\ x&=4\\end{aligned}$$</div>

<h2>Brøker</h2>
<p>Gang med nævneren på begge sider – eller <b>gang over kors</b>, når der står én brøk på hver side:</p>
<div class="rule">$$\\frac{A}{p}=\\frac{B}{q}\\quad\\Leftrightarrow\\quad q\\cdot A=p\\cdot B$$</div>

<h2>Nulreglen</h2>
<p>Et produkt er 0, netop når mindst én af faktorerne er 0:</p>
<div class="rule">$$a\\cdot b=0\\quad\\Leftrightarrow\\quad a=0\\;\\vee\\; b=0$$</div>
<div class="example">$$(x-2)(x+5)=0\\quad\\Leftrightarrow\\quad x=2\\;\\vee\\;x=-5$$</div>

<h2>Andengradsligninger $ax^2+bx+c=0$</h2>
<ul>
  <li><b>Uden $b$:</b> isolér $x^2$ og tag kvadratroden. Husk $\\pm$.</li>
  <li><b>Uden $c$:</b> sæt $x$ uden for parentes og brug nulreglen.</li>
  <li><b>Generelt:</b> beregn diskriminanten $d=b^2-4ac$.</li>
</ul>
<div class="rule">$$x=\\frac{-b\\pm\\sqrt{d}}{2a}\\qquad d>0:\\text{ to},\\quad d=0:\\text{ én},\\quad d<0:\\text{ ingen løsninger}$$</div>

<h2>Potens- og rodligninger</h2>
<div class="rule">$$x^n=k\\;\\Leftrightarrow\\; x=\\sqrt[n]{k}=k^{1/n}\\quad(x>0)\\qquad\\quad \\sqrt{u}=b\\;\\Rightarrow\\; u=b^2$$</div>
<p>Når man kvadrerer, kan der opstå falske løsninger – <b>gør altid prøve</b>.</p>

<h2>Eksponential- og logaritmeligninger</h2>
<p>Logaritmen "henter eksponenten ned", og $e^x$/$10^x$ ophæver $\\ln$/$\\log$:</p>
<div class="rule">$$a^x=k\\;\\Leftrightarrow\\;x=\\frac{\\ln k}{\\ln a}\\qquad e^x=k\\;\\Leftrightarrow\\;x=\\ln k\\qquad \\ln x=k\\;\\Leftrightarrow\\;x=e^k\\qquad \\log x=k\\;\\Leftrightarrow\\;x=10^k$$</div>

<h2>To ligninger med to ubekendte</h2>
<ul>
  <li><b>Substitution:</b> isolér én variabel i den ene ligning og indsæt i den anden.</li>
  <li><b>Lige store koefficienter:</b> gang ligningerne, så fx $x$-leddene bliver ens, og træk dem fra hinanden.</li>
  <li><b>Grafisk:</b> løsningen er skæringspunktet mellem de to linjer.</li>
</ul>

<h2>Grafisk løsning og CAS</h2>
<p>Løsningerne til $f(x)=g(x)$ er $x$-koordinaterne til <b>skæringspunkterne</b> mellem graferne. Prøv det i <a href="#/ligninger/loeser">ligningsløseren</a>.</p>`;

export default {
  id: 'ligninger',
  title: 'Løs ligninger',
  short: 'Løs ligninger',
  formula: 'x=\\,?',
  desc: 'Øv dig i at løse alle slags ligninger med trin-for-trin-løsninger – eller brug ligningsløseren.',
  learn,
  learnLabel: 'Metoder',
  defaultTab: 'oev',
  tool: { id: 'loeser', label: 'Ligningsløser', mount: solver },
  exercises,
};
