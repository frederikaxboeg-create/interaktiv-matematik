// Udtryk i x → JS-funktion. Bygger på CAS-motoren i cas.js, så graftegner,
// opgaver og regneark forstår præcis det samme matematiksprog.
import { parse, toFn, MathError } from './cas.js';

const EXPR = ['num', 'const', 'var', 'op', 'neg', 'fn'];

/** Oversætter et udtryk i x til en funktion f(x). Kaster en fejl med dansk tekst. */
export function compile(src) {
  const ast = parse(src);
  if (!EXPR.includes(ast.t)) throw new MathError('Skriv et udtryk i x – uden lighedstegn og kommandoer');
  return toFn(ast, 'x');
}

export function tryCompile(src) {
  try { return { f: compile(src) }; } catch (e) { return { error: e.message }; }
}

/** Et talsvar fra en elev: "2,5", "-3/4", "sqrt(2)" osv. Giver NaN ved fejl. */
export function evalNumber(src) {
  if (!src || !src.trim()) return NaN;
  try { return compile(src)(NaN); } catch { return NaN; }
}
