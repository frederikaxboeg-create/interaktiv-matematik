// Live 2D-formelvisning under indtastningsfelter og et lille matematiktastatur.
import { el, tex } from './ui.js';
import { parse, toTex } from './cas.js';

/**
 * Viser det, man skriver, som en pæn formel lige under feltet.
 * when: 'always' | 'nontrivial' (kun når der står mere end et simpelt tal)
 */
export function attachPreview(input, { prefix = '', when = 'always', known } = {}) {
  const box = el('div', { class: 'math-preview', 'aria-live': 'polite' });
  const update = () => {
    const v = input.value.trim();
    if (!v || (when === 'nontrivial' && /^[-+]?\d+([.,]\d+)?$/.test(v))) { box.innerHTML = ''; box.classList.remove('on'); return; }
    try {
      box.innerHTML = tex('\\displaystyle ' + prefix + toTex(parse(v, known ? known() : [])));
      box.classList.add('on');
      box.classList.remove('bad');
    } catch {
      box.innerHTML = '';
      box.classList.remove('on');
    }
  };
  input.addEventListener('input', update);
  input.dataset.math = '1';
  update();
  box.refresh = update;
  return box;
}

let lastInput = null;
document.addEventListener('focusin', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.dataset.math) lastInput = e.target;
});

const KEYS = [
  ['x²', '^2'], ['xⁿ', '^'], ['√', 'sqrt(', ')'], ['a/b', '/'], ['( )', '(', ')'],
  ['π', 'pi'], ['eˣ', 'e^(', ')'], ['ln', 'ln(', ')'], ['log', 'log(', ')'], ['|x|', 'abs(', ')'],
  ['sin', 'sin(', ')'], ['cos', 'cos(', ')'], ['tan', 'tan(', ')'], ['=', '='], [':=', ' := '],
];

/** Knapper der indsætter matematik i det felt, man sidst stod i. */
export function mathKeyboard(extra = []) {
  const wrap = el('div', { class: 'math-keys', role: 'toolbar', 'aria-label': 'Matematiktastatur' });
  for (const [label, before, after = ''] of [...KEYS, ...extra]) {
    const b = el('button', { type: 'button', class: 'mkey', title: `Indsæt ${before}${after}` }, label);
    b.addEventListener('mousedown', (e) => e.preventDefault()); // behold fokus i feltet
    b.addEventListener('click', () => {
      const inp = lastInput && lastInput.isConnected ? lastInput : document.querySelector('input[data-math]');
      if (!inp) return;
      const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? s;
      const sel = inp.value.slice(s, e);
      inp.value = inp.value.slice(0, s) + before + sel + after + inp.value.slice(e);
      const pos = s + before.length + sel.length;
      inp.focus();
      inp.setSelectionRange(pos, pos);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    wrap.append(b);
  }
  return wrap;
}
