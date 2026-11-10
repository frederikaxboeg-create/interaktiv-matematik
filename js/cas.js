// Lille CAS (computer-algebra-system) med Maple-agtig syntaks.
//
//  parse(src)      → syntakstræ (AST)
//  toTex(ast)      → pæn 2D-formel (TeX til KaTeX)
//  toFn(ast, 'x')  → hurtig JS-funktion til grafer
//  simplify, diff, integrate, solve …  → symbolsk regning
//  run(src, env)   → udfør én linje i regnearket (f := x -> …, solve(…), diff(…) osv.)
//
// Knuder i træet:
//  {t:'num', v, dec}  {t:'var', n}  {t:'const', n:'pi'|'e'}  {t:'neg', a}
//  {t:'op', op:'+'|'-'|'*'|'/'|'^', a, b}  {t:'fn', n, a}  {t:'call', n, args}
//  {t:'eq', a, b}  {t:'range', a, b}  {t:'list', items}  {t:'lambda', param, body}
//  {t:'assign', name, value}

export class MathError extends Error {}
const fail = (m) => { throw new MathError(m); };

export const FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs,
};
const ALIAS = { kvrod: 'sqrt', arcsin: 'asin', arccos: 'acos', arctan: 'atan' };
const CONSTS = { pi: Math.PI, e: Math.E };
export const COMMANDS = ['solve', 'fsolve', 'diff', 'int', 'integrate', 'evalf', 'expand', 'simplify', 'factor', 'plot', 'subs'];

// ---------- byggeklodser ----------
export const N = (v, dec = false) => ({ t: 'num', v: Math.abs(v) < 1e-13 ? 0 : v, dec });
const V = (n) => ({ t: 'var', n });
const op = (o, a, b) => ({ t: 'op', op: o, a, b });
const neg = (a) => (a.t === 'num' ? N(-a.v, a.dec) : a.t === 'neg' ? a.a : { t: 'neg', a });
const fn = (n, a) => ({ t: 'fn', n, a });
const isNum = (n, v) => n.t === 'num' && (v === undefined || Math.abs(n.v - v) < 1e-12);
const key = (n) => JSON.stringify(n, (k, v) => (k === 'dec' ? undefined : typeof v === 'number' ? +v.toPrecision(12) : v));

// ---------- tokenizer ----------
function tokenize(src, known) {
  const s = src
    .replace(/[−–]/g, '-').replace(/[·×⋅]/g, '*').replace(/÷/g, '/')
    .replace(/²/g, '^2').replace(/³/g, '^3').replace(/π/g, 'pi').replace(/√/g, 'sqrt').replace(/→/g, '->');
  const names = [...Object.keys(FUNCS), ...Object.keys(ALIAS), ...Object.keys(CONSTS), ...COMMANDS, ...known]
    .sort((a, b) => b.length - a.length);
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s|;|\$/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(s[i + 1] ?? ''))) {
      let j = i;
      while (/[0-9]/.test(s[j] ?? '')) j++;
      let dec = false;
      if ((s[j] === '.' || s[j] === ',') && /[0-9]/.test(s[j + 1] ?? '')) { dec = true; j++; while (/[0-9]/.test(s[j] ?? '')) j++; }
      toks.push({ t: 'num', v: Number(s.slice(i, j).replace(',', '.')), dec });
      i = j;
      continue;
    }
    if (/[a-zA-ZæøåÆØÅ_]/.test(ch)) {
      let j = i;
      while (/[a-zA-Z0-9æøåÆØÅ_]/.test(s[j] ?? '')) j++;
      const lw = s.slice(i, j).toLowerCase();
      if (names.includes(lw) || s.slice(j).trimStart().startsWith(':=')) {
        toks.push({ t: 'id', v: ALIAS[lw] ?? lw });
      } else {
        // del ordet op: kendte navne først, ellers enkeltbogstaver (så "2xsin(x)" virker)
        let k = 0;
        while (k < lw.length) {
          if (/[0-9]/.test(lw[k])) {
            let m = k;
            while (/[0-9]/.test(lw[m] ?? '')) m++;
            toks.push({ t: 'num', v: Number(lw.slice(k, m)), dec: false });
            k = m;
            continue;
          }
          const name = names.find((n) => lw.startsWith(n, k));
          if (name) { toks.push({ t: 'id', v: ALIAS[name] ?? name }); k += name.length; } else { toks.push({ t: 'id', v: lw[k] }); k++; }
        }
      }
      i = j;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (two === ':=' || two === '->' || two === '..') { toks.push({ t: two }); i += 2; continue; }
    if ('+-*/^(),=[]'.includes(ch)) { toks.push({ t: ch }); i++; continue; }
    fail(`Ukendt tegn "${ch}"`);
  }
  return toks;
}

const show = (t) => (t.t === 'num' ? String(t.v) : t.t === 'id' ? t.v : t.t);

// ---------- parser ----------
export function parse(src, known = []) {
  const toks = tokenize(String(src), known);
  if (!toks.length) fail('Skriv et udtryk');
  let p = 0;
  const is = (t, o = 0) => toks[p + o]?.t === t;
  const next = () => toks[p++];
  const expect = (t) => {
    if (!is(t)) fail(t === ')' ? 'Der mangler en slutparentes' : t === ']' ? 'Der mangler ]' : `Forventede "${t}"`);
    p++;
  };

  function statement() {
    if (is('id') && is(':=', 1)) { const name = next().v; next(); return { t: 'assign', name, value: lambdaOrEq() }; }
    if (is('id') && is('(', 1) && is('id', 2) && is(')', 3) && is(':=', 4)) {
      const name = next().v; next(); const param = next().v; next(); next();
      return { t: 'assign', name, value: { t: 'lambda', param, body: equation() } };
    }
    return lambdaOrEq();
  }
  function lambdaOrEq() {
    if (is('id') && is('->', 1)) { const param = next().v; next(); return { t: 'lambda', param, body: equation() }; }
    if (is('(') && is('id', 1) && is(')', 2) && is('->', 3)) { next(); const param = next().v; next(); next(); return { t: 'lambda', param, body: equation() }; }
    return equation();
  }
  function equation() {
    const a = expr();
    if (is('=')) { next(); return { t: 'eq', a, b: expr() }; }
    return a;
  }
  function arg() {
    let a = expr();
    if (is('..')) { next(); return { t: 'range', a, b: expr() }; }
    if (is('=')) {
      next();
      let b = expr();
      if (is('..')) { next(); b = { t: 'range', a: b, b: expr() }; }
      a = { t: 'eq', a, b };
    }
    return a;
  }
  function args(close) {
    const out = [];
    if (!is(close)) { out.push(arg()); while (is(',')) { next(); out.push(arg()); } }
    expect(close);
    return out;
  }
  function expr() {
    let left = term();
    while (is('+') || is('-')) { const o = next().t; left = op(o, left, term()); }
    return left;
  }
  function term() {
    let left = unary();
    for (;;) {
      if (is('*') || is('/')) { const o = next().t; left = op(o, left, unary()); }
      else if (is('num') || is('id') || is('(') || is('[')) left = op('*', left, power()); // implicit gange
      else break;
    }
    return left;
  }
  function unary() {
    if (is('-')) { next(); return neg(unary()); }
    if (is('+')) { next(); return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (is('^')) { next(); return op('^', base, unary()); }
    return base;
  }
  function primary() {
    const t = next();
    if (!t) fail('Udtrykket slutter for tidligt');
    if (t.t === 'num') return N(t.v, t.dec);
    if (t.t === '(') { const e = expr(); expect(')'); return e; }
    if (t.t === '[') return { t: 'list', items: args(']') };
    if (t.t === 'id') {
      const n = t.v;
      if (n in FUNCS) {
        if (is('(')) { next(); const a = expr(); expect(')'); return fn(n, a); }
        if (!toks[p] || ['+', '-', ')', ',', '=', ']', '..'].includes(toks[p].t)) fail(`Skriv en parentes efter ${n}, fx ${n}(x)`);
        return fn(n, power());
      }
      if (COMMANDS.includes(n)) {
        if (!is('(')) fail(`Skriv en parentes efter ${n}, fx ${n}(x^2, x)`);
        next();
        return { t: 'call', n: n === 'integrate' ? 'int' : n, args: args(')') };
      }
      if (known.includes(n) && is('(')) { next(); return { t: 'call', n, args: args(')') }; }
      if (n in CONSTS) return { t: 'const', n };
      return V(n);
    }
    fail(`Uventet "${show(t)}"`);
  }

  const node = statement();
  if (p < toks.length) fail(`Uventet "${show(toks[p])}"`);
  return node;
}

// ---------- hjælpere til træet ----------
function mapKids(n, f) {
  switch (n.t) {
    case 'op': case 'eq': case 'range': return { ...n, a: f(n.a), b: f(n.b) };
    case 'neg': case 'fn': return { ...n, a: f(n.a) };
    case 'call': return { ...n, args: n.args.map(f) };
    case 'list': return { ...n, items: n.items.map(f) };
    case 'lambda': return { ...n, body: f(n.body) };
    case 'assign': return { ...n, value: f(n.value) };
    default: return n;
  }
}

export function freeVars(n, out = new Set()) {
  if (n.t === 'var') out.add(n.n);
  else if (n.t === 'lambda') { const inner = freeVars(n.body); inner.delete(n.param); inner.forEach((x) => out.add(x)); }
  else mapKids(n, (c) => { freeVars(c, out); return c; });
  return out;
}
const has = (n, v) => freeVars(n).has(v);

export function subst(n, name, rep) {
  if (n.t === 'var') return n.n === name ? rep : n;
  if (n.t === 'lambda' && n.param === name) return n;
  return mapKids(n, (c) => subst(c, name, rep));
}

/** Indsæt brugerens definitioner (a := 5, f := x -> …). */
export function resolve(n, env, depth = 0) {
  if (depth > 60) fail('Definitionerne henviser til sig selv i ring');
  const r = (c) => resolve(c, env, depth + 1);
  if (n.t === 'var' && env?.vars.has(n.n)) return r(env.vars.get(n.n));
  if (n.t === 'call' && env?.funcs.has(n.n)) {
    const L = env.funcs.get(n.n);
    if (n.args.length !== 1) fail(`${n.n} tager ét argument`);
    return r(subst(L.body, L.param, r(n.args[0])));
  }
  return mapKids(n, r);
}

// ---------- tal og TeX ----------
function frac(v) {
  for (let q = 2; q <= 1000; q++) {
    const p = Math.round(v * q);
    if (Math.abs(v - p / q) < 1e-9 * Math.max(1, Math.abs(v))) return [p, q];
  }
  return null;
}
export function decTex(v, digits = 10) {
  if (!Number.isFinite(v)) return v > 0 ? '\\infty' : v < 0 ? '-\\infty' : '\\text{udefineret}';
  let s = String(Number(v.toPrecision(digits)));
  if (s.includes('e')) {
    const [m, e] = s.split('e');
    return `${m.replace('.', '{,}')}\\cdot 10^{${Number(e)}}`;
  }
  return s.replace('.', '{,}');
}
export function numTex(v) {
  if (!Number.isFinite(v)) return decTex(v);
  if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
  const f = frac(v);
  if (f) return `${f[0] < 0 ? '-' : ''}\\frac{${Math.abs(f[0])}}{${f[1]}}`;
  return decTex(v);
}
const isNegNum = (n) => n.t === 'num' && n.v < 0;
function prec(n) {
  if (n.t === 'op') return { '+': 1, '-': 1, '*': 2, '/': 3, '^': 4 }[n.op];
  if (n.t === 'neg' || isNegNum(n)) return 2;
  if (n.t === 'num' && !n.dec && !Number.isInteger(n.v) && frac(n.v)) return 3; // brøk
  if (n.t === 'eq' || n.t === 'lambda' || n.t === 'assign') return 0;
  return 5;
}
const P = (s) => `\\left(${s}\\right)`;
const FN_TEX = { sin: '\\sin', cos: '\\cos', tan: '\\tan', asin: '\\sin^{-1}', acos: '\\cos^{-1}', atan: '\\tan^{-1}', ln: '\\ln', log: '\\log' };
const name = (n) => (n.length > 1 ? `\\mathrm{${n}}` : n);

export function toTex(n) {
  switch (n.t) {
    case 'num': return n.dec ? decTex(n.v) : numTex(n.v);
    case 'const': return n.n === 'pi' ? '\\pi' : 'e';
    case 'var': return name(n.n);
    case 'neg': return `-${prec(n.a) < 2 || n.a.t === 'neg' || isNegNum(n.a) ? P(toTex(n.a)) : toTex(n.a)}`;
    case 'op': {
      const { a, b } = n;
      if (n.op === '+') {
        if (b.t === 'neg') return `${toTex(a)}-${prec(b.a) <= 1 ? P(toTex(b.a)) : toTex(b.a)}`;
        if (isNegNum(b)) return `${toTex(a)}-${toTex(N(-b.v, b.dec))}`;
        return `${toTex(a)}+${toTex(b)}`;
      }
      if (n.op === '-') return `${toTex(a)}-${prec(b) <= 2 && b.t !== 'op' || prec(b) <= 1 ? P(toTex(b)) : toTex(b)}`;
      if (n.op === '/') return `\\frac{${toTex(a)}}{${toTex(b)}}`;
      if (n.op === '^') {
        const base = a.t === 'fn' && a.n !== 'sqrt' && a.n !== 'abs' ? P(toTex(a)) : prec(a) < 5 ? P(toTex(a)) : toTex(a);
        return `${base}^{${toTex(b)}}`;
      }
      // gange
      const L = prec(a) < 2 ? P(toTex(a)) : toTex(a);
      const R = prec(b) < 2 || b.t === 'neg' || isNegNum(b) ? P(toTex(b)) : toTex(b);
      const rNumLike = /^[0-9\\{]/.test(R) && !R.startsWith('\\left') && !R.startsWith('\\sqrt') && !/^\\(sin|cos|tan|ln|log|pi|mathrm)/.test(R);
      const sep = rNumLike || (a.t === 'num' && b.t === 'num') ? '\\cdot ' : a.t === 'num' ? '' : '\\,';
      return `${L}${sep}${R}`;
    }
    case 'fn': {
      const a = toTex(n.a);
      if (n.n === 'sqrt') return `\\sqrt{${a}}`;
      if (n.n === 'abs') return `\\left|${a}\\right|`;
      if (n.n === 'exp') return `e^{${a}}`;
      return `${FN_TEX[n.n]}${P(a)}`;
    }
    case 'call': {
      const A = n.args;
      if (n.n === 'diff' && A.length >= 1) {
        const v = A[1] ? toTex(A[1]) : 'x', k = Math.max(1, A.length - 1);
        return `\\frac{d${k > 1 ? `^{${k}}` : ''}}{d${v}${k > 1 ? `^{${k}}` : ''}}${P(toTex(A[0]))}`;
      }
      if (n.n === 'int' && A.length >= 1) {
        const r = A[1];
        if (r && r.t === 'eq' && r.b.t === 'range') return `\\int_{${toTex(r.b.a)}}^{${toTex(r.b.b)}}${toTex(A[0])}\\,d${toTex(r.a)}`;
        return `\\int ${toTex(A[0])}\\,d${r ? toTex(r) : 'x'}`;
      }
      return `${COMMANDS.includes(n.n) ? `\\operatorname{${n.n}}` : name(n.n)}${P(A.map(toTex).join(',\\;'))}`;
    }
    case 'eq': return `${toTex(n.a)}=${toTex(n.b)}`;
    case 'range': return `${toTex(n.a)}\\,..\\,${toTex(n.b)}`;
    case 'list': return `\\left[${n.items.map(toTex).join(',\\;')}\\right]`;
    case 'lambda': return `${name(n.param)}\\mapsto ${toTex(n.body)}`;
    case 'assign': return `${name(n.name)}:=${toTex(n.value)}`;
    default: return '?';
  }
}

// ---------- numerisk ----------
export function toFn(n, v = 'x') {
  switch (n.t) {
    case 'num': { const c = n.v; return () => c; }
    case 'const': { const c = CONSTS[n.n]; return () => c; }
    case 'var': if (n.n === v) return (x) => x; return fail(`Ukendt variabel "${n.n}"`);
    case 'neg': { const a = toFn(n.a, v); return (x) => -a(x); }
    case 'fn': { const f = FUNCS[n.n], a = toFn(n.a, v); return (x) => f(a(x)); }
    case 'op': {
      const a = toFn(n.a, v), b = toFn(n.b, v);
      switch (n.op) {
        case '+': return (x) => a(x) + b(x);
        case '-': return (x) => a(x) - b(x);
        case '*': return (x) => a(x) * b(x);
        case '/': return (x) => a(x) / b(x);
        default: return (x) => Math.pow(a(x), b(x));
      }
    }
    default: return fail('Det her er ikke et udtryk, der kan regnes ud');
  }
}
const numeric = (n) => toFn(n, '\u0000')(0);

/** Funktion af flere variable, fx toFnVars(ast, ['x', 'y']) → (x, y) => … */
export function toFnVars(n, names) {
  const idx = Object.fromEntries(names.map((nm, i) => [nm, i]));
  const go = (n) => {
    switch (n.t) {
      case 'num': { const c = n.v; return () => c; }
      case 'const': { const c = CONSTS[n.n]; return () => c; }
      case 'var': { if (!(n.n in idx)) fail(`Ukendt variabel "${n.n}"`); const i = idx[n.n]; return (a) => a[i]; }
      case 'neg': { const a = go(n.a); return (s) => -a(s); }
      case 'fn': { const f = FUNCS[n.n], a = go(n.a); return (s) => f(a(s)); }
      case 'op': {
        const a = go(n.a), b = go(n.b);
        switch (n.op) {
          case '+': return (s) => a(s) + b(s);
          case '-': return (s) => a(s) - b(s);
          case '*': return (s) => a(s) * b(s);
          case '/': return (s) => a(s) / b(s);
          default: return (s) => Math.pow(a(s), b(s));
        }
      }
      default: return fail('Skriv et udtryk i x og y');
    }
  };
  const f = go(n);
  return (...args) => f(args);
}
const isDec = (n) => (n.t === 'num' ? n.dec : n.t === 'const' ? false : ['op', 'neg', 'fn'].includes(n.t) && (isDec(n.a) || (n.t === 'op' && isDec(n.b))));

// ---------- polynomier ----------
const ptrim = (p) => { const r = p.map((c) => (Math.abs(c) < 1e-12 ? 0 : c)); while (r.length > 1 && r[r.length - 1] === 0) r.pop(); return r; };
const padd = (a, b) => ptrim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)));
const pmul = (a, b) => { const r = new Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { r[i + j] += x * y; })); return ptrim(r); };

/** Koefficienter [c0, c1, …] hvis n er et polynomium i v med talkoefficienter, ellers null. */
export function toPoly(n, v) {
  let dec = false;
  const go = (n) => {
    switch (n.t) {
      case 'num': dec ||= n.dec; return [n.v];
      case 'var': return n.n === v ? [0, 1] : null;
      case 'neg': { const a = go(n.a); return a && a.map((c) => -c); }
      case 'op': {
        const a = go(n.a);
        if (!a) return null;
        if (n.op === '^') {
          if (n.b.t !== 'num' || !Number.isInteger(n.b.v) || n.b.v < 0 || n.b.v > 12) return null;
          let r = [1];
          for (let i = 0; i < n.b.v; i++) r = pmul(r, a);
          return r;
        }
        const b = go(n.b);
        if (!b) return null;
        if (n.op === '+') return padd(a, b);
        if (n.op === '-') return padd(a, b.map((c) => -c));
        if (n.op === '*') return pmul(a, b);
        if (b.length === 1 && b[0] !== 0) return a.map((c) => c / b[0]);
        return null;
      }
      default: return null;
    }
  };
  const r = go(n);
  if (r) r.dec = dec;
  return r;
}

export function fromPoly(c, v, dec = c.dec) {
  const list = [];
  for (let k = c.length - 1; k >= 0; k--) {
    if (Math.abs(c[k]) < 1e-12) continue;
    list.push([c[k], k === 0 ? null : k === 1 ? V(v) : op('^', V(v), N(k))]);
  }
  return buildSum(list, dec);
}

// ---------- forenkling ----------
function coefRest(n) {
  if (n.t === 'num') return [n.v, null];
  if (n.t === 'neg') { const [c, r] = coefRest(n.a); return [-c, r]; }
  if (n.t === 'op' && n.op === '*' && n.a.t === 'num') return [n.a.v, n.b];
  if (n.t === 'op' && n.op === '/' && n.b.t === 'num') { const [c, r] = coefRest(n.a); return [c / n.b.v, r]; }
  return [1, n];
}
function terms(n, sign, out) {
  if (n.t === 'op' && (n.op === '+' || n.op === '-')) { terms(n.a, sign, out); terms(n.b, n.op === '+' ? sign : -sign, out); return out; }
  if (n.t === 'neg') return terms(n.a, -sign, out);
  const [c, r] = coefRest(n);
  out.push([sign * c, r]);
  return out;
}
function buildSum(list, dec = false) {
  const map = new Map(), order = [];
  let constant = 0;
  for (const [c, r] of list) {
    if (r === null) { constant += c; continue; }
    const k = key(r);
    if (!map.has(k)) { map.set(k, [0, r]); order.push(k); }
    map.get(k)[0] += c;
  }
  const items = order.map((k) => map.get(k)).filter(([c]) => Math.abs(c) > 1e-12);
  if (Math.abs(constant) > 1e-12) items.push([constant, null]);
  if (!items.length) return N(0, dec);
  let out = null;
  for (const [c, r] of items) {
    const abs = Math.abs(c);
    const t = r === null ? N(abs, dec) : Math.abs(abs - 1) < 1e-12 ? r : op('*', N(abs, dec), r);
    out = out ? op(c < 0 ? '-' : '+', out, t) : c < 0 ? neg(t) : t;
  }
  return out;
}
function factorsOf(n, out) {
  if (n.t === 'op' && n.op === '*') { factorsOf(n.a, out); factorsOf(n.b, out); }
  else if (n.t === 'num') { out.c *= n.v; out.dec ||= n.dec; }
  else if (n.t === 'neg') { out.c *= -1; factorsOf(n.a, out); }
  else if (n.t === 'op' && n.op === '^') out.list.push([n.a, n.b]);
  else if (n.t === 'op' && n.op === '/' && n.b.t === 'num') { out.c /= n.b.v; factorsOf(n.a, out); }
  else if (n.t === 'op' && n.op === '/') { factorsOf(n.a, out); out.den.push(n.b); }
  else out.list.push([n, N(1)]);
  return out;
}
function buildProduct(f) {
  // Alle faktorer samles i ét regnskab med eksponenter: tælleren tæller positivt, nævneren negativt.
  let c = f.c;
  const entries = [...f.list];
  for (const d0 of f.den ?? []) {
    const g = factorsOf(simp(d0), { c: 1, list: [], dec: false, den: [] });
    c /= g.c;
    for (const [b, e] of g.list) entries.push([b, e.t === 'num' ? N(-e.v) : neg(e)]);
    for (const dd of g.den) entries.push([dd, N(1)]);
  }
  if (Math.abs(c) < 1e-15) return N(0, f.dec);
  const map = new Map(), order = [];
  for (const [b, e] of entries) {
    const k = key(b);
    if (!map.has(k)) { map.set(k, [b, []]); order.push(k); }
    map.get(k)[1].push(e);
  }
  const num = [], den = [];
  for (const k of order) {
    const [b, es] = map.get(k);
    const e = es.length === 1 ? es[0] : es.every((x) => x.t === 'num') ? N(es.reduce((s, x) => s + x.v, 0)) : simp(es.reduce((s, x) => op('+', s, x)));
    if (isNum(e, 0)) continue;
    if (e.t === 'num' && e.v < 0) den.push(isNum(e, -1) ? b : op('^', b, N(-e.v)));
    else num.push(isNum(e, 1) ? b : op('^', b, e));
  }
  // tal først, derefter x-potenser, derefter resten
  num.sort((p, q) => rank(p) - rank(q));
  const prod = (list) => list.reduce((acc, x) => (acc ? op('*', acc, x) : x), null);
  const body = prod(num);
  if (!den.length) {
    if (!body) return N(c, f.dec);
    if (Math.abs(c - 1) < 1e-12) return body;
    if (Math.abs(c + 1) < 1e-12) return neg(body);
    return op('*', N(c, f.dec), body);
  }
  // brøk: koefficienten p/q fordeles på tæller og nævner
  let p = c, q = 1;
  const fr = !Number.isInteger(c) && !f.dec && frac(c);
  if (fr) { p = fr[0]; q = fr[1]; }
  const top = body ? (Math.abs(Math.abs(p) - 1) < 1e-12 ? body : op('*', N(Math.abs(p), f.dec), body)) : N(Math.abs(p), f.dec);
  let bottom = prod(den);
  if (q !== 1) bottom = op('*', N(q), bottom);
  const r = op('/', top, bottom);
  return p < 0 ? neg(r) : r;
}
const rank = (p) => (p.t === 'var' || (p.t === 'op' && p.op === '^' && p.a.t === 'var') ? 0 : p.t === 'op' && p.op === '^' ? 1 : 2);

const containsSum = (n) => n.t === 'op' && (n.op === '+' || n.op === '-' || containsSum(n.a) || containsSum(n.b)) || (n.t === 'neg' && containsSum(n.a));

function simp(n, v = 'x') {
  const s = (c) => simp(c, v);
  switch (n.t) {
    case 'num': case 'var': case 'const': return n;
    case 'neg': return s(op('*', N(-1), n.a));
    case 'fn': {
      const a = s(n.a);
      if (a.t === 'num') {
        if (n.n === 'sqrt' && a.v >= 0 && Number.isInteger(Math.sqrt(a.v))) return N(Math.sqrt(a.v));
        if (n.n === 'sqrt' && Number.isInteger(a.v) && a.v > 0 && !a.dec) {
          for (let k = Math.floor(Math.sqrt(a.v)); k > 1; k--) if (a.v % (k * k) === 0) return op('*', N(k), fn('sqrt', N(a.v / (k * k))));
        }
        if (n.n === 'abs') return N(Math.abs(a.v), a.dec);
        if (a.v === 0 && ['sin', 'tan', 'asin', 'atan'].includes(n.n)) return N(0);
        if (a.v === 0 && ['cos', 'exp'].includes(n.n)) return N(1);
        if (a.v === 1 && n.n === 'ln') return N(0);
        if (n.n === 'log' && Number.isInteger(Math.log10(a.v)) && a.v > 0) return N(Math.log10(a.v));
        if (a.dec) return N(FUNCS[n.n](a.v), true);
      }
      if (n.n === 'ln' && a.t === 'const' && a.n === 'e') return N(1);
      if (n.n === 'ln' && a.t === 'fn' && a.n === 'exp') return a.a;
      if (n.n === 'ln' && a.t === 'op' && a.op === '^' && a.a.t === 'const' && a.a.n === 'e') return a.b;
      if (n.n === 'exp' && a.t === 'fn' && a.n === 'ln') return a.a;
      if (n.n === 'exp') return s(op('^', { t: 'const', n: 'e' }, a));
      return fn(n.n, a);
    }
    case 'op': {
      const a = s(n.a), b = s(n.b);
      let r;
      if (n.op === '+' || n.op === '-') r = buildSum(terms(op(n.op, a, b), 1, []), isDec(a) || isDec(b));
      else if (n.op === '*') r = buildProduct(factorsOf(op('*', a, b), { c: 1, list: [], dec: false, den: [] }));
      else if (n.op === '/') {
        if (isNum(b, 0)) fail('Division med 0');
        if (b.t === 'num') r = s(op('*', N(1 / b.v, b.dec), a));
        else if (key(a) === key(b)) r = N(1);
        else if (b.t === 'op' && b.op === '^' && b.b.t === 'num' && !containsSum(a) && a.t !== 'num') r = s(op('*', a, op('^', b.a, N(-b.b.v))));
        else if (b.t === 'var' && !containsSum(a) && a.t !== 'num' && has(a, b.n)) r = s(op('*', a, op('^', b, N(-1))));
        else if (a.t === 'num' && a.v < 0) r = neg(op('/', N(-a.v, a.dec), b));
        else r = buildProduct(factorsOf(a, { c: 1, list: [], dec: false, den: [b] }));
      } else {
        // potens
        if (isNum(b, 0)) return N(1);
        if (isNum(b, 1)) return a;
        if (isNum(a, 1)) return N(1);
        if (a.t === 'num' && b.t === 'num') {
          const val = a.v ** b.v;
          if (Number.isInteger(b.v) || a.dec || b.dec || Math.abs(val - Math.round(val)) < 1e-9) return N(Math.abs(val - Math.round(val)) < 1e-9 ? Math.round(val) : val, a.dec || b.dec);
        }
        if (a.t === 'op' && a.op === '^' && b.t === 'num' && a.b.t === 'num') return s(op('^', a.a, N(a.b.v * b.v)));
        if (a.t === 'fn' && a.n === 'sqrt' && b.t === 'num' && Number.isInteger(b.v) && b.v % 2 === 0) return s(op('^', a.a, N(b.v / 2)));
        if (a.t === 'op' && a.op === '*' && b.t === 'num' && Number.isInteger(b.v)) return s(op('*', op('^', a.a, b), op('^', a.b, b)));
        if (a.t === 'const' && a.n === 'e' && b.t === 'fn' && b.n === 'ln') return b.a;
        r = op('^', a, b);
      }
      // polynomier i x samles og ordnes (men produkter som 6(2x+1)^2 bevares)
      if (r.t === 'op' && (r.op === '+' || r.op === '-' || !containsSum(r)) && has(r, v)) {
        const pl = toPoly(r, v);
        if (pl && pl.length <= 13) return fromPoly(pl, v);
      }
      return r;
    }
    case 'eq': return { t: 'eq', a: s(n.a), b: s(n.b) };
    default: return mapKids(n, s);
  }
}

export function simplify(n, v) {
  return simp(n, v ?? mainVar(n));
}
export function mainVar(n) {
  const vs = freeVars(n);
  if (vs.has('x')) return 'x';
  return [...vs][0] ?? 'x';
}

// ---------- differentiation ----------
export function diff(n, v = 'x') {
  if (!has(n, v)) return N(0);
  const D = (c) => diff(c, v);
  switch (n.t) {
    case 'var': return N(1);
    case 'neg': return neg(D(n.a));
    case 'op': {
      const { a, b } = n;
      switch (n.op) {
        case '+': return op('+', D(a), D(b));
        case '-': return op('-', D(a), D(b));
        case '*': return op('+', op('*', D(a), b), op('*', a, D(b)));
        case '/':
          if (!has(b, v)) return op('/', D(a), b);
          return op('/', op('-', op('*', D(a), b), op('*', a, D(b))), op('^', b, N(2)));
        default:
          if (!has(b, v)) return op('*', op('*', b, op('^', a, op('-', b, N(1)))), D(a));
          if (!has(a, v)) return op('*', op('*', n, a.t === 'const' && a.n === 'e' ? N(1) : fn('ln', a)), D(b));
          return op('*', n, op('+', op('*', D(b), fn('ln', a)), op('/', op('*', b, D(a)), a)));
      }
    }
    case 'fn': {
      const u = n.a;
      const outer = {
        sin: () => fn('cos', u),
        cos: () => neg(fn('sin', u)),
        tan: () => op('/', N(1), op('^', fn('cos', u), N(2))),
        exp: () => fn('exp', u),
        ln: () => op('/', N(1), u),
        log: () => op('/', N(1), op('*', u, fn('ln', N(10)))),
        sqrt: () => op('/', N(1), op('*', N(2), fn('sqrt', u))),
        abs: () => op('/', u, fn('abs', u)),
        asin: () => op('/', N(1), fn('sqrt', op('-', N(1), op('^', u, N(2))))),
        acos: () => neg(op('/', N(1), fn('sqrt', op('-', N(1), op('^', u, N(2)))))),
        atan: () => op('/', N(1), op('+', N(1), op('^', u, N(2)))),
      }[n.n]();
      return op('*', outer, D(u));
    }
    default: return fail('Kan ikke differentiere dette udtryk');
  }
}

// ---------- integration ----------
function linear(u, v) {
  const p = toPoly(u, v);
  return p && p.length === 2 && p[1] !== 0 ? p[1] : null;
}
/** Symbolsk stamfunktion (uden +k), eller null hvis den ikke kan findes. */
export function integrate(n, v = 'x') {
  n = simp(n, v);
  if (!has(n, v)) return op('*', n, V(v));
  const pl = toPoly(n, v);
  if (pl) return fromPoly([0, ...pl.map((c, i) => c / (i + 1))], v, pl.dec);
  if (n.t === 'op' && (n.op === '+' || n.op === '-') || n.t === 'neg') {
    const parts = terms(n, 1, []);
    let out = null;
    for (const [c, r] of parts) {
      const I = r === null ? V(v) : integrate(r, v);
      if (!I) return null;
      const t = op('*', N(c), I);
      out = out ? op('+', out, t) : t;
    }
    return simp(out, v);
  }
  const [c, r] = coefRest(n);
  if (r && Math.abs(c - 1) > 1e-12) { const I = integrate(r, v); return I && simp(op('*', N(c), I), v); }
  if (n.t === 'op' && n.op === '*') {
    // konstant faktor (fx 2·sin(x) eller pi·x)
    if (!has(n.a, v)) { const I = integrate(n.b, v); return I && simp(op('*', n.a, I), v); }
    if (!has(n.b, v)) { const I = integrate(n.a, v); return I && simp(op('*', n.b, I), v); }
    return null;
  }
  if (n.t === 'op' && n.op === '/') {
    if (!has(n.b, v)) { const I = integrate(n.a, v); return I && simp(op('/', I, n.b), v); }
    const k = linear(n.b, v);
    if (!has(n.a, v) && k) return simp(op('*', op('/', n.a, N(k)), fn('ln', n.b)), v);
    return null;
  }
  if (n.t === 'op' && n.op === '^') {
    const { a, b } = n;
    const k = linear(a, v);
    if (k && !has(b, v)) {
      if (isNum(b, -1)) return simp(op('*', N(1 / k), fn('ln', a)), v);
      return simp(op('/', op('^', a, op('+', b, N(1))), op('*', N(k), op('+', b, N(1)))), v);
    }
    const kb = linear(b, v);
    if (kb && !has(a, v)) {
      if (a.t === 'const' && a.n === 'e') return simp(op('/', n, N(kb)), v);
      return simp(op('/', n, op('*', N(kb), fn('ln', a))), v);
    }
    return null;
  }
  if (n.t === 'fn') {
    const k = linear(n.a, v);
    if (!k) return null;
    const u = n.a;
    const F = {
      sin: () => neg(fn('cos', u)),
      cos: () => fn('sin', u),
      exp: () => fn('exp', u),
      sqrt: () => op('*', N(2 / 3), op('^', u, N(1.5))),
    }[n.n];
    return F ? simp(op('/', F(), N(k)), v) : null;
  }
  return null;
}

/** Numerisk integral med Simpsons metode. */
export function simpson(f, a, b, n = 2000) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}

// ---------- ligninger ----------
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

/** Løser en ligning i v. Eksakt for 1. og 2. grad, ellers numerisk. Returnerer TeX-linjer. */
export function solveTex(eqNode, v, range, numericOnly = false) {
  const lhs = eqNode.t === 'eq' ? op('-', eqNode.a, eqNode.b) : eqNode;
  const pl = numericOnly ? null : toPoly(simp(lhs, v), v);
  const vt = name(v);
  if (pl && pl.length === 1) return [Math.abs(pl[0]) < 1e-12 ? '\\text{Ligningen er sand for alle }' + vt : '\\text{Ingen løsninger}'];
  if (pl && pl.length === 2) return [`${vt}=${numTex(-pl[0] / pl[1])}`];
  if (pl && pl.length === 3) {
    const [c, b, a] = pl, d = b * b - 4 * a * c;
    if (d < -1e-12) return ['\\text{Ingen reelle løsninger } (d<0)'];
    if (Math.abs(d) < 1e-12) return [`${vt}=${numTex(-b / (2 * a))}`];
    const sq = Math.sqrt(d);
    const r1 = (-b - sq) / (2 * a), r2 = (-b + sq) / (2 * a);
    const nice = (x) => Math.abs(x - Math.round(x)) < 1e-9 || frac(x);
    if (nice(r1) && nice(r2)) return [`${vt}=${numTex(Math.min(r1, r2))}`, `${vt}=${numTex(Math.max(r1, r2))}`];
    const exact = `\\frac{${numTex(-b)}\\pm\\sqrt{${numTex(d)}}}{${numTex(2 * a)}}`;
    return [`${vt}=${exact}`, `${vt}\\approx ${decTex(Math.min(r1, r2), 6)}\\;\\vee\\;${vt}\\approx ${decTex(Math.max(r1, r2), 6)}`];
  }
  const f = toFn(lhs, v);
  const [a, b] = range ?? [-100, 100];
  const roots = solveNumeric(f, () => 0, a, b, 20000);
  if (!roots.length) return [`\\text{Ingen løsninger fundet for } ${vt}\\in[${numTex(a)};\\,${numTex(b)}]`];
  return roots.slice(0, 20).map((r) => `${vt}\\approx ${decTex(r, 8)}`);
}

// ---------- faktorisering ----------
function factorTex(n, v) {
  const pl = toPoly(simp(n, v), v);
  if (!pl || pl.length < 3) return toTex(simp(n, v));
  let p = [...pl];
  const lead = p[p.length - 1];
  p = p.map((c) => c / lead);
  const f = toFn(fromPoly(p, v), v);
  const roots = solveNumeric(f, () => 0, -60, 60, 24000)
    .map((r) => (Math.abs(r - Math.round(r)) < 1e-7 ? Math.round(r) : frac(r) && frac(r)[1] <= 12 ? frac(r)[0] / frac(r)[1] : null))
    .filter((r) => r !== null);
  const facs = [];
  for (const r of roots) {
    // syntetisk division, gentag ved dobbeltrødder
    for (let rep = 0; rep < p.length; rep++) {
      const q = []; let carry = 0;
      for (let i = p.length - 1; i >= 0; i--) { carry = p[i] + carry * r; q.unshift(carry); }
      if (Math.abs(q[0]) > 1e-6) break;
      p = q.slice(1);
      facs.push(r);
      if (p.length < 2) break;
    }
  }
  if (!facs.length) return toTex(simp(n, v));
  const counts = new Map();
  facs.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1));
  const lin = [...counts].map(([r, k]) => {
    const t = toTex(simp(op('-', V(v), N(r)), v));
    return `${r === 0 ? name(v) : P(t)}${k > 1 ? `^{${k}}` : ''}`;
  });
  const rest = p.length > 1 ? P(toTex(fromPoly(p, v))) : '';
  const c = Math.abs(lead - 1) < 1e-12 ? '' : Math.abs(lead + 1) < 1e-12 ? '-' : numTex(lead);
  return `${c}${lin.join('')}${rest}`;
}

/** Regner indlejrede kommandoer ud symbolsk, fx solve(diff(f(x), x) = 0, x). */
function symbolic(n) {
  n = mapKids(n, symbolic);
  if (n.t !== 'call' || !COMMANDS.includes(n.n)) return n;
  const A = n.args, e = A[0];
  if (!e) return n;
  switch (n.n) {
    case 'diff': {
      let r = e;
      const vs = A.slice(1).map((a) => varOf(a).v);
      for (const v of vs.length ? vs : [mainVar(e)]) r = simp(diff(simp(r, v), v), v);
      return r;
    }
    case 'int': {
      const { v, range } = varOf(A[1], mainVar(e));
      const F = integrate(e, v);
      if (!range) return F ?? fail('Kunne ikke finde en stamfunktion symbolsk');
      if (F) return simp(op('-', subst(F, v, A[1].b.b), subst(F, v, A[1].b.a)), v);
      return N(simpson(toFn(simp(e, v), v), range[0], range[1]), true);
    }
    case 'expand': { const v = mainVar(e), pl = toPoly(simp(e, v), v); return pl ? fromPoly(pl, v) : simplify(e); }
    case 'simplify': return simplify(e);
    case 'evalf': return N(numeric(simplify(e)), true);
    case 'subs': return e.t === 'eq' && e.a.t === 'var' && A[1] ? simplify(subst(A[1], e.a.n, e.b)) : n;
    default: return n;
  }
}

// ---------- regnearket ----------
export function newEnv() { return { vars: new Map(), funcs: new Map() }; }

const varOf = (a, fallback) => {
  if (!a) return { v: fallback };
  if (a.t === 'var') return { v: a.n };
  if (a.t === 'eq' && a.a.t === 'var' && a.b.t === 'range') return { v: a.a.n, range: [numeric(a.b.a), numeric(a.b.b)] };
  return fail('Andet argument skal være en variabel, fx x eller x = 0..3');
};

/**
 * Udfører én linje. Returnerer { input: TeX, output: TeX | null, note?: tekst, plot?: {...} }.
 */
export function run(src, env) {
  const known = [...env.funcs.keys(), ...env.vars.keys()];
  const ast = parse(src, known);
  const input = toTex(ast);

  if (ast.t === 'assign') {
    if (COMMANDS.includes(ast.name) || ast.name in FUNCS || ast.name in CONSTS) fail(`"${ast.name}" er et reserveret navn`);
    if (ast.value.t === 'lambda') {
      const body = simplify(resolve(ast.value.body, env), ast.value.param);
      env.funcs.set(ast.name, { param: ast.value.param, body });
      env.vars.delete(ast.name);
      return { input, output: `${name(ast.name)}:=${name(ast.value.param)}\\mapsto ${toTex(body)}` };
    }
    const val = simplify(resolve(ast.value, env));
    env.vars.set(ast.name, val);
    env.funcs.delete(ast.name);
    return { input, output: `${name(ast.name)}:=${toTex(val)}` };
  }

  if (ast.t === 'call' && COMMANDS.includes(ast.n)) {
    const A = ast.args.map((a) => symbolic(resolve(a, env)));
    if (!A.length) fail(`${ast.n} mangler argumenter`);
    const e = A[0];
    switch (ast.n) {
      case 'diff': {
        const vs = A.slice(1).map((a) => varOf(a).v);
        let r = e;
        for (const v of vs.length ? vs : [mainVar(e)]) r = simp(diff(simp(r, v), v), v);
        return { input, output: toTex(r) };
      }
      case 'int': {
        const { v, range } = varOf(A[1], mainVar(e));
        const F = integrate(e, v);
        if (!range) {
          if (!F) fail('Kunne ikke finde en stamfunktion symbolsk. Prøv et bestemt integral, fx int(f, x = 0..2).');
          return { input, output: `${toTex(F)}+k` };
        }
        const [a, b] = range;
        if (F) {
          const exact = simp(op('-', subst(F, v, A[1].b.b), subst(F, v, A[1].b.a)), v);
          const ex = toTex(exact);
          return {
            input,
            output: exact.t === 'num' ? ex : `${ex}\\approx ${decTex(numeric(exact), 8)}`,
            note: `Stamfunktion: F(${v}) = …`, noteTex: `F(${name(v)})=${toTex(F)}`,
          };
        }
        const I = simpson(toFn(simp(e, v), v), a, b);
        return { input, output: `\\approx ${decTex(I, 8)}`, note: 'Udregnet numerisk' };
      }
      case 'solve': case 'fsolve': {
        const { v, range } = varOf(A[1], mainVar(e));
        const lines = solveTex(simplify(e, v), v, range, ast.n === 'fsolve');
        return { input, output: lines.join(',\\qquad ') };
      }
      case 'evalf': {
        const digits = A[1] ? numeric(A[1]) : 10;
        const s = simplify(e);
        if (freeVars(s).size) fail('evalf kræver et udtryk uden variable');
        return { input, output: decTex(numeric(s), Math.max(1, Math.min(15, digits))) };
      }
      case 'expand': {
        const v = mainVar(e), pl = toPoly(simp(e, v), v);
        return { input, output: toTex(pl ? fromPoly(pl, v) : simplify(e)) };
      }
      case 'simplify': return { input, output: toTex(simplify(e)) };
      case 'factor': return { input, output: factorTex(e, mainVar(e)) };
      case 'subs': {
        // subs(x = 2, udtryk)
        if (e.t !== 'eq' || e.a.t !== 'var' || !A[1]) fail('Brug subs(x = 2, udtryk)');
        const r = simplify(subst(A[1], e.a.n, e.b));
        return { input, output: toTex(r) + (r.t !== 'num' && !freeVars(r).size ? `\\approx ${decTex(numeric(r), 8)}` : '') };
      }
      case 'plot': {
        const items = e.t === 'list' ? e.items : [e];
        const { v, range } = varOf(A[1], 'x');
        const fns = items.map((it) => toFn(simplify(it, v), v));
        return { input, output: null, plot: { fns, range: range ?? [-10, 10], labels: items.map(toTex) } };
      }
    }
  }

  const r = symbolic(resolve(ast, env));
  if (r.t === 'eq') {
    const v = mainVar(r);
    const s = { t: 'eq', a: simplify(r.a, v), b: simplify(r.b, v) };
    return { input, output: toTex(s), note: `Tip: skriv solve(${src.trim()}, ${v}) for at løse ligningen.` };
  }
  if (r.t === 'lambda') return { input, output: toTex(r) };
  const s = simplify(r);
  let output = toTex(s);
  if (!freeVars(s).size && s.t !== 'num') {
    const val = numeric(s);
    if (Number.isFinite(val)) output += `\\approx ${decTex(val, 10)}`;
  }
  return { input, output };
}
