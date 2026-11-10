import { Graph } from '../graph.js';
import { el, tex, exploreLayout, card } from '../ui.js';
import { tryCompile } from '../parser.js';
import { attachPreview, mathKeyboard } from '../mathinput.js';

const EXAMPLES = ['x^2 - 4', '2sin(x)', '3·0,8^x', 'sqrt(x)', '1/x', 'ln(x)', '(x-1)(x+2)(x-3)/3', 'e^(-x^2)'];

export function mountPlotter(root) {
  const { graphBox, panel } = exploreLayout(root);
  const g = new Graph(graphBox, { xmin: -10, xmax: 10, ymin: -7, ymax: 7 });
  const rows = [
    { name: 'f', src: 'x^2 - 4', color: '--c1' },
    { name: 'g', src: '2sin(x)', color: '--c2' },
    { name: 'h', src: '', color: '--c3' },
    { name: 'k', src: '', color: '--c4' },
  ];

  g.setScene(() => rows.filter((r) => r.f).map((r) => ({ type: 'fn', f: r.f, color: r.color, width: 2.75 })));

  const list = el('div', { class: 'fn-list' });
  for (const r of rows) {
    const input = el('input', { type: 'text', value: r.src, placeholder: 'fx 2x + 1', spellcheck: 'false', autocomplete: 'off', 'aria-label': `${r.name}(x)` });
    const err = el('div', { class: 'err' });
    const compile = () => {
      r.src = input.value;
      if (!r.src.trim()) { r.f = null; err.textContent = ''; return; }
      const res = tryCompile(r.src);
      r.f = res.f ?? null;
      err.textContent = res.error ?? '';
    };
    input.addEventListener('input', () => { compile(); g.draw(); });
    compile();
    r.input = input;
    r.compile = compile;
    list.append(el('div', { class: 'fn-row' },
      el('span', { class: 'swatch', style: `background: var(${r.color})` }),
      el('label', { class: 'fn-input' }, el('span', { html: tex(`${r.name}(x)=`) }), input),
      attachPreview(input, { prefix: `${r.name}(x)=` }),
      err));
  }

  const examples = el('div', { class: 'chips small' }, EXAMPLES.map((e) => {
    const b = el('button', { type: 'button', class: 'chip' }, e);
    b.addEventListener('click', () => {
      const r = rows.find((x) => !x.src.trim()) ?? rows[rows.length - 1];
      r.input.value = e;
      r.input.dispatchEvent(new Event('input'));
    });
    return b;
  }));

  panel.append(
    list,
    mathKeyboard(),
    el('div', { class: 'panel-label' }, 'Eksempler – klik for at tilføje'),
    examples,
    card('Sådan skriver du', `
      <ul>
        <li>Potens: <code>x^2</code>, <code>2^x</code>, <code>e^(0,5x)</code></li>
        <li>Gange kan udelades: <code>3x</code>, <code>2(x+1)</code></li>
        <li>Decimaltal med komma eller punktum: <code>0,8</code> eller <code>0.8</code></li>
        <li>Funktioner: <code>sqrt</code>, <code>ln</code>, <code>log</code>, <code>sin</code>, <code>cos</code>, <code>tan</code>, <code>abs</code>, <code>exp</code></li>
        <li>Konstanter: <code>pi</code> og <code>e</code></li>
      </ul>
      <p class="muted">Zoom med musehjulet eller knapperne. Træk i baggrunden for at flytte.</p>`),
  );
}
