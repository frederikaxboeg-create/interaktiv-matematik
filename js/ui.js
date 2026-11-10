// Små DOM-hjælpere og formelvisning (KaTeX).
import { tn, round } from './util.js';

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function tex(src, display = false) {
  if (window.katex) {
    try {
      return window.katex.renderToString(src, { displayMode: display, throwOnError: false });
    } catch { /* fald tilbage til rå tekst */ }
  }
  return `<code>${escapeHtml(src)}</code>`;
}

/** Tekst/HTML hvor $...$ og $$...$$ vises som formler. */
export function math(str) {
  return String(str)
    .split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g)
    .map((part) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) return tex(part.slice(2, -2), true);
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) return tex(part.slice(1, -1));
      return part;
    })
    .join('');
}

export function slider({ label, min, max, step, value, onInput, format = (v) => tn(v) }) {
  const out = el('span', { class: 'slider-val' });
  const input = el('input', { type: 'range', min, max, step, value, 'aria-label': label });
  const row = el('label', { class: 'slider' },
    el('span', { class: 'slider-label', html: tex(label) }), input, out);
  const read = () => round(+input.value, 4);
  const show = () => { out.innerHTML = tex(format(read())); };
  input.addEventListener('input', () => { show(); onInput(read()); });
  show();
  return { row, input, set(v) { input.value = v; show(); } };
}

export function toggle(label, checked, onChange) {
  const input = el('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'toggle' }, input, el('span', { class: 'toggle-ui' }), el('span', { html: label }));
}

export function segmented(options, value, onChange) {
  const wrap = el('div', { class: 'segmented', role: 'group' });
  const render = () => {
    for (const b of wrap.children) b.setAttribute('aria-pressed', String(b.dataset.value === value));
  };
  for (const o of options) {
    const b = el('button', { type: 'button', html: o.label });
    b.dataset.value = o.value;
    b.addEventListener('click', () => { value = o.value; render(); onChange(value); });
    wrap.append(b);
  }
  render();
  return wrap;
}

export function exploreLayout(root) {
  const graphBox = el('div', { class: 'explore-graph' });
  const panel = el('div', { class: 'explore-panel' });
  root.append(el('div', { class: 'explore' }, graphBox, panel));
  return { graphBox, panel };
}

export function card(title, html, cls = '') {
  return el('section', { class: `panel-card ${cls}` },
    title ? el('h3', {}, title) : null,
    el('div', { class: 'panel-card-body', html: math(html) }));
}

export function hint(text) {
  return el('p', { class: 'tip', html: math(text) });
}
