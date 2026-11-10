// Emnerne, ordnet efter kernestoffet i Matematik A (studieplanen i Lectio).
import numbers from './numbers.js';
import percent from './percent.js';
import equations from './equations.js';
import trig from './trig.js';
import vectors from './vectors.js';
import circle from './circle.js';
import space from './space.js';
import functions from './functions.js';
import linear from './linear.js';
import quadratic from './quadratic.js';
import exponential from './exponential.js';
import power from './power.js';
import trigfunc from './trigfunc.js';
import regression from './regression.js';
import derivative from './derivative.js';
import integral from './integral.js';
import diffeq from './diffeq.js';
import statistics from './statistics.js';
import probability from './probability.js';
import normal from './normal.js';
import hypothesis from './hypothesis.js';

// status: 'done' = gennemgået, 'now' = forløb i gang, 'next' = næste forløb
export const AREAS = [
  {
    id: 'tal',
    title: 'Tal og algebra',
    desc: 'Tallene og algebra, procent og vækst, og ligninger.',
    topics: [numbers, percent, equations],
    status: { procent: 'done', tal: 'done' },
    planned: [],
  },
  {
    id: 'geometri',
    title: 'Geometri, trigonometri og vektorer',
    desc: 'Trekanter, vektorer i planen og rummet, linjer, cirkler og kugler.',
    topics: [trig, vectors, circle, space],
    status: { trigonometri: 'done', vektorer: 'done' },
    planned: [],
  },
  {
    id: 'funktioner',
    title: 'Funktioner og infinitesimalregning',
    desc: 'Funktionstyperne, regression, differential- og integralregning og differentialligninger.',
    topics: [functions, linear, quadratic, exponential, power, trigfunc, regression, derivative, integral, diffeq],
    status: { lineaere: 'done', andengrads: 'done', eksponentielle: 'done', potens: 'done', regression: 'done', differential: 'now', integral: 'next' },
    planned: [],
  },
  {
    id: 'sandsynlighed',
    title: 'Sandsynlighed og statistik',
    desc: 'Deskriptiv statistik, sandsynlighed, binomial- og normalfordelingen og hypotesetest.',
    topics: [statistics, probability, normal, hypothesis],
    status: { sandsynlighed: 'done' },
    planned: [],
  },
];

export const topics = AREAS.flatMap((a) => a.topics);
export const statusOf = (id) => AREAS.map((a) => a.status[id]).find(Boolean);
export { equations };

/** Alle opgaver, hvor man trækker i grafer og figurer, samlet i én kategori. */
export const interactive = {
  id: 'interaktiv',
  title: 'Interaktive øvelser',
  short: 'Interaktive øvelser',
  formula: '',
  desc: 'Opgaver, hvor du løser ved at trække i grafer, punkter og vektorer. Fra alle emner.',
  exercises: topics.flatMap((t) => t.exercises
    .filter((e) => e.interactive)
    .map((e) => ({ ...e, id: `${t.id}-${e.id}`, label: `${t.title} · ${e.title}` }))),
};
