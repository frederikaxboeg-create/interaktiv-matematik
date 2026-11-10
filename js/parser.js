// En lille, sikker parser til matematiske udtryk i x.
// Understøtter + - * / ^, parenteser, implicit gange (2x, 3(x+1), x sin(x)),
// decimalkomma, konstanterne pi og e samt de almindelige funktioner.

const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, kvrod: Math.sqrt,
  ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs,
};
const CONSTS = { pi: Math.PI, e: Math.E };
const NAMES = [...Object.keys(FUNCS), ...Object.keys(CONSTS), 'x', 'π']
  .sort((a, b) => b.length - a.length);

function tokenize(src) {
  const s = src
    .replace(/\s+/g, '')
    .replace(/[−–]/g, '-')
    .replace(/[·×⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .toLowerCase();
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[0-9.,]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9.,]/.test(s[j])) j++;
      const raw = s.slice(i, j);
      const v = Number(raw.replace(',', '.'));
      if (!/^\d*[.,]?\d*$/.test(raw) || Number.isNaN(v)) throw new Error(`Ugyldigt tal "${raw}"`);
      toks.push({ t: 'num', v });
      i = j;
      continue;
    }
    if (/[a-zπ]/.test(ch)) {
      let j = i;
      while (j < s.length && /[a-zπ]/.test(s[j])) j++;
      const word = s.slice(i, j);
      let k = 0;
      while (k < word.length) {
        const name = NAMES.find((n) => word.startsWith(n, k));
        if (!name) throw new Error(`Ukendt navn "${word.slice(k)}"`);
        toks.push({ t: 'id', v: name === 'π' ? 'pi' : name });
        k += name.length;
      }
      i = j;
      continue;
    }
    if ('+-*/^()'.includes(ch)) { toks.push({ t: ch }); i++; continue; }
    throw new Error(`Ukendt tegn "${ch}"`);
  }
  return toks;
}

const show = (t) => (t.t === 'num' || t.t === 'id' ? t.v : t.t);

/** Oversætter et udtryk til en JS-funktion f(x). Kaster en fejl med dansk tekst. */
export function compile(src) {
  const toks = tokenize(src);
  if (!toks.length) throw new Error('Skriv et udtryk');
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const expect = (t) => {
    if (!toks[p] || toks[p].t !== t) throw new Error(t === ')' ? 'Der mangler en slutparentes' : `Forventede "${t}"`);
    p++;
  };

  function expr() {
    let left = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const r = term();
      const l = left;
      left = op === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return left;
  }
  function term() {
    let left = unary();
    for (;;) {
      const t = peek();
      if (!t) break;
      if (t.t === '*' || t.t === '/') {
        next();
        const r = unary();
        const l = left;
        left = t.t === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      } else if (t.t === 'num' || t.t === 'id' || t.t === '(') {
        const r = power(); // implicit gange
        const l = left;
        left = (x) => l(x) * r(x);
      } else break;
    }
    return left;
  }
  function unary() {
    const t = peek();
    if (t && t.t === '-') { next(); const u = unary(); return (x) => -u(x); }
    if (t && t.t === '+') { next(); return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() && peek().t === '^') {
      next();
      const ex = unary();
      return (x) => Math.pow(base(x), ex(x));
    }
    return base;
  }
  function primary() {
    const t = next();
    if (!t) throw new Error('Udtrykket slutter for tidligt');
    if (t.t === 'num') { const v = t.v; return () => v; }
    if (t.t === '(') { const e = expr(); expect(')'); return e; }
    if (t.t === 'id') {
      if (t.v === 'x') return (x) => x;
      if (t.v in CONSTS) { const v = CONSTS[t.v]; return () => v; }
      const fn = FUNCS[t.v];
      if (!peek() || peek().t !== '(') throw new Error(`Skriv en parentes efter ${t.v}, fx ${t.v}(x)`);
      next();
      const a = expr();
      expect(')');
      return (x) => fn(a(x));
    }
    throw new Error(`Uventet "${show(t)}"`);
  }

  const f = expr();
  if (p < toks.length) throw new Error(`Uventet "${show(toks[p])}"`);
  return f;
}

export function tryCompile(src) {
  try { return { f: compile(src) }; } catch (e) { return { error: e.message }; }
}

/** Et talsvar fra en elev: "2,5", "-3/4", "sqrt(2)" osv. Giver NaN ved fejl. */
export function evalNumber(src) {
  if (!src || !src.trim()) return NaN;
  try { return compile(src)(NaN); } catch { return NaN; }
}
