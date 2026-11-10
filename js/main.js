import { topics } from './topics/index.js';
import { mountPlotter } from './topics/plotter.js';
import { el, tex } from './ui.js';
import { Graph } from './graph.js';
import { mountPractice } from './practice.js';
import * as progress from './progress.js';
import { setupPwa } from './pwa.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const pointsEl = document.getElementById('points');

function buildNav() {
  nav.replaceChildren(
    ...topics.map((t) => el('a', { href: `#/${t.id}`, 'data-id': t.id }, t.short)),
    el('a', { href: '#/graftegner', 'data-id': 'graftegner' }, 'Graftegner'),
  );
}

const updatePoints = () => { pointsEl.textContent = progress.totalPoints(); };

function renderHome() {
  document.title = 'Interaktiv Matematik';
  const grid = el('div', { class: 'topic-grid' });
  for (const t of topics) {
    const s = progress.stats(t.id);
    grid.append(el('a', { class: 'topic-card', href: `#/${t.id}` },
      el('div', { class: 'topic-formula', html: tex(t.formula) }),
      el('h2', {}, t.title),
      el('p', {}, t.desc),
      el('div', { class: 'topic-meta' },
        el('span', {}, `${t.exercises.length} opgavetyper`),
        el('span', { class: s.points ? 'has' : '' }, `${s.points} point`))));
  }
  grid.append(el('a', { class: 'topic-card tool', href: '#/graftegner' },
    el('div', { class: 'topic-formula', html: tex('y=\\,?') }),
    el('h2', {}, 'Graftegner'),
    el('p', {}, 'Skriv dine egne funktioner og se graferne med det samme. Op til fire ad gangen.'),
    el('div', { class: 'topic-meta' }, el('span', {}, 'Værktøj'))));

  app.append(
    el('section', { class: 'hero' },
      el('p', { class: 'eyebrow' }, 'Matematik for gymnasiet'),
      el('h1', {}, 'Matematik, du kan røre ved'),
      el('p', { class: 'lead' }, 'Træk i punkter, skru på parametre og se, hvad der sker. Øv dig bagefter med opgaver, der giver feedback med det samme.')),
    grid,
    el('p', { class: 'footnote' },
      'Dine point gemmes kun i denne browser. ',
      (() => {
        const b = el('button', { type: 'button', class: 'link' }, 'Nulstil point');
        b.addEventListener('click', () => {
          if (confirm('Vil du nulstille alle dine point?')) { progress.reset(); route(); }
        });
        return b;
      })()),
  );
}

function renderTopic(t, tab) {
  document.title = `${t.title} · Interaktiv Matematik`;
  const tabs = el('div', { class: 'tabs', role: 'tablist' },
    el('a', { href: `#/${t.id}`, class: tab === 'udforsk' ? 'active' : '', role: 'tab', 'aria-selected': String(tab === 'udforsk') }, 'Udforsk'),
    el('a', { href: `#/${t.id}/oev`, class: tab === 'oev' ? 'active' : '', role: 'tab', 'aria-selected': String(tab === 'oev') }, 'Øv dig'));
  const body = el('div', { class: 'topic-body' });
  app.append(
    el('section', { class: 'topic-head' },
      el('div', { class: 'topic-title' },
        el('h1', {}, t.title),
        el('span', { class: 'topic-formula-inline', html: tex(t.formula) })),
      el('p', { class: 'lead' }, t.desc),
      tabs),
    body);
  if (tab === 'oev') mountPractice(body, t);
  else t.explore(body);
}

function renderPlotter() {
  document.title = 'Graftegner · Interaktiv Matematik';
  const body = el('div', { class: 'topic-body' });
  app.append(
    el('section', { class: 'topic-head' },
      el('div', { class: 'topic-title' }, el('h1', {}, 'Graftegner')),
      el('p', { class: 'lead' }, 'Skriv en forskrift, så tegnes grafen med det samme.')),
    body);
  mountPlotter(body);
}

let current = null;
function route() {
  const [id = '', tab = ''] = location.hash.replace(/^#\/?/, '').split('/');
  app.replaceChildren();
  Graph.prune();
  for (const a of nav.children) a.classList.toggle('active', a.dataset.id === id);
  if (id !== current) window.scrollTo(0, 0);
  current = id;
  const topic = topics.find((t) => t.id === id);
  if (topic) renderTopic(topic, tab === 'oev' ? 'oev' : 'udforsk');
  else if (id === 'graftegner') renderPlotter();
  else renderHome();
}

setupPwa();
buildNav();
updatePoints();
progress.subscribe(updatePoints);
window.addEventListener('hashchange', route);
route();
