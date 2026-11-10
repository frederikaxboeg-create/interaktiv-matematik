import { AREAS, topics, interactive, equations, statusOf } from './topics/index.js';
import { mountPlotter } from './topics/plotter.js';
import { el, tex, math } from './ui.js';
import { Graph } from './graph.js';
import { mountPractice } from './practice.js';
import * as progress from './progress.js';
import { setupPwa } from './pwa.js';
import help from './topics/help.js';
import worksheet, { mountWorksheet } from './topics/worksheet.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const pointsEl = document.getElementById('points');

const NAV = [
  { id: '', label: 'Emner', href: '#/' },
  { id: 'interaktiv', label: 'Interaktive øvelser', href: '#/interaktiv' },
  { id: 'ligninger', label: 'Løs ligninger', href: '#/ligninger' },
  { id: 'cas', label: 'CAS', href: '#/cas' },
  { id: 'graftegner', label: 'Graftegner', href: '#/graftegner' },
  { id: 'hjaelp', label: 'Hjælp', href: '#/hjaelp' },
];
const PAGES = [help, { ...worksheet, tabs: [{ id: 'ark', label: 'Regneark', mount: mountWorksheet }] }];

const STATUS = {
  done: ['Gennemgået', 's-done'],
  now: ['I gang nu', 's-now'],
  next: ['Næste forløb', 's-next'],
};

function buildNav() {
  nav.replaceChildren(...NAV.map((n) => {
    const a = el('a', { href: n.href }, n.label);
    a.dataset.id = n.id;
    return a;
  }));
}

const updatePoints = () => { pointsEl.textContent = progress.totalPoints(); };

function topicCard(t) {
  const s = progress.stats(t.id);
  const st = STATUS[statusOf(t.id)];
  return el('a', { class: 'topic-card', href: `#/${t.id}` },
    el('div', { class: 'topic-formula', html: tex(t.formula) }),
    el('h3', {}, t.title, st ? el('span', { class: `status ${st[1]}` }, st[0]) : null),
    el('p', {}, t.desc),
    el('div', { class: 'topic-meta' },
      el('span', {}, `${t.exercises.length} opgavetyper`),
      el('span', { class: s.points ? 'has' : '' }, `${s.points} point`)));
}

function renderHome() {
  document.title = 'Interaktiv Matematik';
  const now = topics.filter((t) => ['now', 'next'].includes(statusOf(t.id)));

  const train = el('div', { class: 'train-grid' },
    el('a', { class: 'train-card t-interactive', href: '#/interaktiv' },
      el('div', { class: 'train-icon', 'aria-hidden': 'true' }, '✋'),
      el('div', {},
        el('h3', {}, 'Interaktive øvelser'),
        el('p', {}, `Løs opgaver ved at trække i grafer, punkter og vektorer. ${interactive.exercises.length} opgavetyper fra alle emner.`))),
    el('a', { class: 'train-card t-equations', href: '#/ligninger' },
      el('div', { class: 'train-icon', 'aria-hidden': 'true', html: tex('x=?') }),
      el('div', {},
        el('h3', {}, 'Løs ligninger'),
        el('p', {}, `${equations.exercises.length} slags ligninger med trin-for-trin-løsninger, plus en ligningsløser.`))));

  app.append(
    el('section', { class: 'hero' },
      el('p', { class: 'eyebrow' }, 'Matematik A · gymnasiet'),
      el('h1', {}, 'Matematik, du kan røre ved'),
      el('p', { class: 'lead' }, 'Lær teorien, træk i graferne og se, hvad der sker – og øv dig bagefter med opgaver, der giver feedback med det samme.')),
    train,
    now.length ? el('section', { class: 'area' },
      el('div', { class: 'area-head' }, el('h2', {}, 'Lige nu i undervisningen')),
      el('div', { class: 'topic-grid' }, now.map(topicCard))) : null,
    ...AREAS.map((a) => el('section', { class: 'area', id: `omraade-${a.id}` },
      el('div', { class: 'area-head' }, el('h2', {}, a.title), el('p', {}, a.desc)),
      el('div', { class: 'topic-grid' },
        a.topics.map(topicCard),
        a.planned.length ? el('div', { class: 'planned' },
          el('div', { class: 'planned-title' }, 'Kommer senere'),
          el('ul', {}, a.planned.map((p) => el('li', {}, p)))) : null))),
    el('section', { class: 'area' },
      el('div', { class: 'area-head' }, el('h2', {}, 'Værktøjer')),
      el('div', { class: 'topic-grid' },
        el('a', { class: 'topic-card tool', href: '#/graftegner' },
          el('div', { class: 'topic-formula', html: tex('y=f(x)') }),
          el('h3', {}, 'Graftegner'),
          el('p', {}, 'Skriv dine egne funktioner og se graferne. Op til fire ad gangen.')),
        el('a', { class: 'topic-card tool', href: '#/cas' },
          el('div', { class: 'topic-formula', html: tex("\\operatorname{diff}(x^3,\\,x)=3x^2") }),
          el('h3', {}, 'CAS-regneark'),
          el('p', {}, 'Regn som i Maple: definér funktioner, differentiér, integrér, løs ligninger og tegn grafer.')),
        el('a', { class: 'topic-card tool', href: '#/ligninger/loeser' },
          el('div', { class: 'topic-formula', html: tex('f(x)=g(x)') }),
          el('h3', {}, 'Ligningsløser'),
          el('p', {}, 'Skriv en ligning, og få løsningerne – også vist grafisk.')))),
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

function tabsFor(t) {
  if (t.tabs) return t.tabs;
  const tabs = [];
  if (t.learn) tabs.push({ id: 'laer', label: t.learnLabel ?? 'Lær', mount: (b) => renderLearn(b, t) });
  if (t.explore) tabs.push({ id: 'udforsk', label: 'Udforsk', mount: (b) => t.explore(b) });
  if (t.tool) tabs.push({ id: t.tool.id, label: t.tool.label, mount: (b) => t.tool.mount(b) });
  if (t.exercises?.length) tabs.push({ id: 'oev', label: 'Øv dig', mount: (b) => mountPractice(b, t) });
  return tabs;
}

function renderLearn(body, t) {
  const tabs = tabsFor(t).filter((x) => x.id !== 'laer');
  body.append(el('article', { class: 'learn card', html: math(t.learn) }),
    el('div', { class: 'learn-next' },
      el('span', {}, 'Klar til at prøve selv?'),
      ...tabs.map((x, i) => el('a', { class: `btn ${i === tabs.length - 1 ? 'primary' : ''}`, href: `#/${t.id}/${x.id}` }, `${x.label} →`))));
}

function renderTopic(t, tabId) {
  document.title = `${t.title} · Interaktiv Matematik`;
  const tabs = tabsFor(t);
  const tab = tabs.find((x) => x.id === tabId) ?? tabs.find((x) => x.id === t.defaultTab) ?? tabs[0];
  const st = STATUS[statusOf(t.id)];
  const body = el('div', { class: 'topic-body' });
  app.append(
    el('section', { class: 'topic-head' },
      el('div', { class: 'topic-title' },
        el('h1', {}, t.title),
        t.formula ? el('span', { class: 'topic-formula-inline', html: tex(t.formula) }) : null,
        st ? el('span', { class: `status ${st[1]}` }, st[0]) : null),
      el('p', { class: 'lead' }, t.desc),
      tabs.length > 1 ? el('div', { class: 'tabs', role: 'tablist' }, tabs.map((x) => el('a', {
        href: `#/${t.id}/${x.id}`, role: 'tab', class: x === tab ? 'active' : '', 'aria-selected': String(x === tab),
      }, x.label))) : null),
    body);
  tab.mount(body);
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
  const navId = NAV.some((n) => n.id === id) ? id : '';
  for (const a of nav.children) a.classList.toggle('active', a.dataset.id === navId);
  if (id !== current) window.scrollTo(0, 0);
  current = id;
  const topic = [...topics, interactive, ...PAGES].find((t) => t.id === id);
  if (topic) renderTopic(topic, tab);
  else if (id === 'graftegner') renderPlotter();
  else renderHome();
}

setupPwa();
buildNav();
updatePoints();
progress.subscribe(updatePoints);
window.addEventListener('hashchange', route);
route();
