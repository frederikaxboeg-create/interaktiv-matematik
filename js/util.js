// Tal, tilfældighed og små TeX-hjælpere.

export const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const rintNZ = (a, b) => { let v; do v = rint(a, b); while (v === 0); return v; };
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function round(v, d = 2) {
  const p = 10 ** d;
  const r = Math.round(v * p) / p;
  return Object.is(r, -0) ? 0 : r;
}

export const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

/** Tal som almindelig tekst: decimalkomma og rigtigt minustegn. */
export function num(x, d = 2) {
  if (!Number.isFinite(x)) return '–';
  return String(round(x, d)).replace('.', ',').replace('-', '−');
}

/** Tal til TeX: decimalkomma uden ekstra mellemrum. */
export function tn(x, d = 2) {
  if (!Number.isFinite(x)) return '\\text{–}';
  return String(round(x, d)).replace('.', '{,}');
}

/** "=" hvis tallet vises præcist, ellers "≈". */
export const eq = (x, d = 2) => (Math.abs(round(x, d) - x) < 1e-9 ? '=' : '\\approx');

/** Negative tal i parentes, fx når de indsættes i en formel. */
export const par = (x, d = 2) => (x < 0 ? `(${tn(x, d)})` : tn(x, d));

/** Led med fortegn, fx "+ 3" eller "- 1,13" (afrundes før fortegnet bestemmes). */
export function plus(x, d = 2) {
  const r = round(x, d);
  return `${r < 0 ? '-' : '+'}${tn(Math.abs(r), d)}`;
}

/** Punkt i TeX: (2 ; −1,5) */
export const pt = (x, y, d = 2) => `(${tn(x, d)}\\,;\\,${tn(y, d)})`;

/** Polynomium i TeX ud fra koefficienter (højeste grad først). */
export function polyTex(coeffs, v = 'x', d = 2) {
  const n = coeffs.length - 1;
  let out = '';
  coeffs.forEach((c, i) => {
    c = round(c, d);
    if (c === 0) return;
    const p = n - i;
    const abs = Math.abs(c);
    const coef = abs === 1 && p > 0 ? '' : tn(abs, d);
    const term = p === 0 ? '' : p === 1 ? v : `${v}^{${p}}`;
    if (!out) out = (c < 0 ? '-' : '') + coef + term;
    else out += ` ${c < 0 ? '-' : '+'} ${coef}${term}`;
  });
  return out || '0';
}

export const linTex = (a, b, v = 'x') => polyTex([a, b], v);
