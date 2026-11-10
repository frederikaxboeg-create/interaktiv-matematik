// Statistik: deskriptorer, regression og binomialfordeling.

export const sum = (a) => a.reduce((s, x) => s + x, 0);
export const mean = (a) => sum(a) / a.length;
export function median(a) {
  const s = [...a].sort((p, q) => p - q), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
/** Kvartiler som medianen af nederste og øverste halvdel (midterste tal udelades ved ulige antal). */
export function quartiles(a) {
  const s = [...a].sort((p, q) => p - q), n = s.length;
  const lower = s.slice(0, Math.floor(n / 2)), upper = s.slice(Math.ceil(n / 2));
  return { min: s[0], q1: lower.length ? median(lower) : s[0], med: median(s), q3: upper.length ? median(upper) : s[n - 1], max: s[n - 1] };
}
/** Spredning (standardafvigelse) – population (n) eller stikprøve (n − 1). */
export function sd(a, sample = false) {
  const m = mean(a);
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - (sample ? 1 : 0)));
}

// ---------- regression (mindste kvadraters metode) ----------
export function fitLinear(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  const sxy = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))), sxx = sum(xs.map((x) => (x - mx) ** 2));
  const a = sxy / sxx, b = my - a * mx;
  const ssTot = sum(ys.map((y) => (y - my) ** 2)), ssRes = sum(ys.map((y, i) => (y - (a * xs[i] + b)) ** 2));
  return { a, b, r2: ssTot ? 1 - ssRes / ssTot : 1, f: (x) => a * x + b };
}
/** y = b · a^x (lineær regression på ln y). */
export function fitExp(xs, ys) {
  if (ys.some((y) => y <= 0)) return null;
  const L = fitLinear(xs, ys.map(Math.log));
  const a = Math.exp(L.a), b = Math.exp(L.b);
  return { a, b, r2: L.r2, f: (x) => b * a ** x };
}
/** y = b · x^a (lineær regression på ln y mod ln x). */
export function fitPower(xs, ys) {
  if (ys.some((y) => y <= 0) || xs.some((x) => x <= 0)) return null;
  const L = fitLinear(xs.map(Math.log), ys.map(Math.log));
  const a = L.a, b = Math.exp(L.b);
  return { a, b, r2: L.r2, f: (x) => (x > 0 ? b * x ** a : NaN) };
}
/** y = a x² + b x + c. */
export function fitQuad(xs, ys) {
  const S = (k) => sum(xs.map((x) => x ** k)), T = (k) => sum(xs.map((x, i) => x ** k * ys[i]));
  const M = [[S(4), S(3), S(2), T(2)], [S(3), S(2), S(1), T(1)], [S(2), S(1), xs.length, T(0)]];
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    [M[i], M[p]] = [M[p], M[i]];
    if (Math.abs(M[i][i]) < 1e-12) return null;
    for (let r = 0; r < 3; r++) if (r !== i) { const k = M[r][i] / M[i][i]; for (let c = i; c < 4; c++) M[r][c] -= k * M[i][c]; }
  }
  const [a, b, c] = [0, 1, 2].map((i) => M[i][3] / M[i][i]);
  const f = (x) => a * x * x + b * x + c, my = mean(ys);
  const ssTot = sum(ys.map((y) => (y - my) ** 2)), ssRes = sum(ys.map((y, i) => (y - f(xs[i])) ** 2));
  return { a, b, c, r2: ssTot ? 1 - ssRes / ssTot : 1, f };
}

// ---------- binomialfordeling ----------
export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
export const binomPmf = (n, p, k) => choose(n, k) * p ** k * (1 - p) ** (n - k);
export const binomCdf = (n, p, k) => { let s = 0; for (let i = 0; i <= Math.min(k, n); i++) s += binomPmf(n, p, i); return Math.min(1, s); };
