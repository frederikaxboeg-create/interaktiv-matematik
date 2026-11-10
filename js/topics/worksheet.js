// CAS-regneark i Maple-stil: skriv en linje, tryk Enter, og få resultatet som pæn matematik.
import { Graph } from '../graph.js';
import { el, tex, math, card } from '../ui.js';
import { run, newEnv, MathError, parse, toTex } from '../cas.js';
import { mathKeyboard } from '../mathinput.js';

const KEY = 'interaktiv-matematik:cas';
const START = [
  'f := x -> x^3 - 3x',
  'diff(f(x), x)',
  'solve(diff(f(x), x) = 0, x)',
  'int(x^2, x = 0..3)',
  'plot(f(x), x = -3..3)',
];

const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) && v.length ? v : null; } catch { return null; } };
const save = (lines) => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* ignorer */ } };

export const EXAMPLES = [
  ['Definér en funktion', 'f := x -> 2x^2 - 3x + 1'],
  ['Funktionsværdi', 'f(4)'],
  ['Differentiér', 'diff(x^2*e^x, x)'],
  ['Anden afledede', 'diff(sin(2x), x, x)'],
  ['Stamfunktion', 'int(3x^2 + cos(x), x)'],
  ['Bestemt integral', 'int(4 - x^2, x = -2..2)'],
  ['Løs ligning', 'solve(x^2 - 5x + 6 = 0, x)'],
  ['Løs numerisk', 'fsolve(e^x = 3 - x, x)'],
  ['Faktorisér', 'factor(x^3 - 7x + 6)'],
  ['Gang ud', 'expand((x + 2)^3)'],
  ['Decimaltal', 'evalf(sqrt(2) + pi)'],
  ['Indsæt', 'subs(x = 2, x^3 + 1)'],
  ['Tegn grafer', 'plot([sin(x), cos(x)], x = -6..6)'],
];

export function mountWorksheet(root) {
  const sheet = el('div', { class: 'cas-sheet card' });
  const side = el('div', { class: 'explore-panel' });
  root.append(el('div', { class: 'cas-layout' }, sheet, side));

  let lines = (load() ?? START).map((src) => ({ src }));
  const graphs = new Set();

  function render(focusIndex) {
    for (const g of graphs) g.destroy();
    graphs.clear();
    sheet.replaceChildren();
    const env = newEnv();
    lines.forEach((line, i) => {
      const input = el('input', { type: 'text', value: line.src, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': `Linje ${i + 1}`, placeholder: i === lines.length - 1 ? 'Skriv her og tryk Enter …' : '' });
      input.dataset.math = '1';
      const preview = el('div', { class: 'cas-preview' });
      const out = el('div', { class: 'cas-out' });
      const row = el('div', { class: 'cas-line' }, el('span', { class: 'cas-prompt', 'aria-hidden': 'true' }, '>'), el('div', { class: 'cas-input' }, input, preview), out);
      sheet.append(row);

      const showPreview = () => {
        const v = input.value.trim();
        if (!v) { preview.innerHTML = ''; return; }
        try { preview.innerHTML = tex('\\displaystyle ' + toTex(parse(v, [...env.funcs.keys(), ...env.vars.keys()]))); } catch { preview.innerHTML = ''; }
      };
      // resultat
      if (line.src.trim()) {
        try {
          const r = run(line.src, env);
          if (r.plot) {
            const box = el('div', { class: 'cas-plot' });
            out.append(box);
            const [a, b] = r.plot.range;
            let lo = Infinity, hi = -Infinity;
            for (const f of r.plot.fns) for (let k = 0; k <= 200; k++) { const y = f(a + ((b - a) * k) / 200); if (Number.isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
            if (!Number.isFinite(lo)) { lo = -5; hi = 5; }
            if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
            const pad = (hi - lo) * 0.1;
            const g = new Graph(box, { xmin: a, xmax: b, ymin: Math.max(lo - pad, -1e6), ymax: Math.min(hi + pad, 1e6), equalAspect: false, aspect: '16 / 8' });
            const colors = ['--c1', '--c2', '--c3', '--c4', '--c5'];
            g.setScene(() => r.plot.fns.map((f, k) => ({ type: 'fn', f, color: colors[k % 5], width: 2.5 })));
            graphs.add(g);
            out.append(el('div', { class: 'cas-legend', html: r.plot.labels.map((l, k) => `<span><i style="background: var(${colors[k % 5]})"></i>${tex(l)}</span>`).join('') }));
          } else {
            out.innerHTML = tex(r.output, true);
          }
          if (r.noteTex) out.append(el('div', { class: 'cas-note', html: tex(r.noteTex) }));
          else if (r.note) out.append(el('div', { class: 'cas-note' }, r.note));
          preview.innerHTML = tex('\\displaystyle ' + r.input);
        } catch (e) {
          out.append(el('div', { class: 'cas-err' }, e instanceof MathError || e instanceof Error ? e.message : String(e)));
          showPreview();
        }
      }
      input.addEventListener('input', () => { line.src = input.value; save(lines.map((l) => l.src)); showPreview(); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (i === lines.length - 1 && input.value.trim()) lines.push({ src: '' });
          render(Math.min(i + 1, lines.length - 1));
        } else if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); sheet.querySelectorAll('.cas-line input')[i - 1].focus(); }
        else if (e.key === 'ArrowDown' && i < lines.length - 1) { e.preventDefault(); sheet.querySelectorAll('.cas-line input')[i + 1].focus(); }
        else if (e.key === 'Backspace' && !input.value && lines.length > 1) {
          e.preventDefault();
          lines.splice(i, 1);
          save(lines.map((l) => l.src));
          render(Math.max(0, i - 1));
        }
      });
    });
    if (lines[lines.length - 1].src.trim()) { lines.push({ src: '' }); render(focusIndex); return; }
    save(lines.map((l) => l.src));
    if (focusIndex != null) {
      const inp = sheet.querySelectorAll('.cas-line input')[focusIndex];
      inp?.focus({ preventScroll: false });
      inp?.setSelectionRange(inp.value.length, inp.value.length);
    }
  }

  const clear = el('button', { type: 'button', class: 'btn ghost' }, 'Ryd arket');
  clear.addEventListener('click', () => { lines = [{ src: '' }]; render(0); });
  const reset = el('button', { type: 'button', class: 'btn ghost' }, 'Vis eksempel');
  reset.addEventListener('click', () => { lines = START.map((src) => ({ src })); render(); });

  const examples = el('div', { class: 'cas-examples' }, EXAMPLES.map(([label, src]) => {
    const b = el('button', { type: 'button', class: 'cas-ex' }, el('span', {}, label), el('code', {}, src));
    b.addEventListener('click', () => {
      const last = lines[lines.length - 1];
      if (last.src.trim()) lines.push({ src }); else last.src = src;
      render(lines.length - 1);
    });
    return b;
  }));

  side.append(
    el('div', { class: 'panel-label' }, 'Matematiktastatur'),
    mathKeyboard([['→', ' -> '], ['..', '..']]),
    el('div', { class: 'actions' }, clear, reset),
    el('div', { class: 'panel-label' }, 'Eksempler – klik for at indsætte'),
    examples,
    card('Sådan bruger du arket', `
      <ul>
        <li>Skriv en linje og tryk <b>Enter</b>. Formlen vises pænt, mens du skriver.</li>
        <li>Definér med <code>:=</code>, fx <code>a := 5</code> eller <code>f := x -> x^2</code>.</li>
        <li>Brug <b>komma + mellemrum</b> mellem argumenter: <code>diff(x^2, x)</code>. Decimalkomma skrives uden mellemrum: <code>2,5</code>.</li>
        <li>Pil op/ned skifter linje. Slet en tom linje med ⌫.</li>
      </ul>
      <p class="muted">Se alle kommandoer under <a href="#/hjaelp/cas">Hjælp</a>.</p>`),
  );
  render();
}

export default {
  id: 'cas',
  title: 'CAS-regneark',
  short: 'CAS',
  formula: '',
  desc: 'Regn som i Maple: definér funktioner, differentiér, integrér, løs ligninger og tegn grafer – med pæn matematikvisning.',
  exercises: [],
};
