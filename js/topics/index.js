// Emnerne, ordnet efter kernestoffet i Matematik A (studieplanen i Lectio).
import linear from './linear.js';
import quadratic from './quadratic.js';
import exponential from './exponential.js';
import power from './power.js';
import percent from './percent.js';
import derivative from './derivative.js';
import integral from './integral.js';
import diffeq from './diffeq.js';
import trig from './trig.js';
import vectors from './vectors.js';
import circle from './circle.js';
import probability from './probability.js';
import normal from './normal.js';
import equations from './equations.js';

// status: 'done' = gennemgået, 'now' = forløb i gang, 'next' = næste forløb
export const AREAS = [
  {
    id: 'tal',
    title: 'Tal og algebra',
    desc: 'Procent og vækst, potenser og ligninger.',
    topics: [percent, equations],
    status: { procent: 'done' },
    planned: ['Talmængder, potens og rod', 'Ligefrem og omvendt proportionalitet'],
  },
  {
    id: 'geometri',
    title: 'Geometri, trigonometri og vektorer',
    desc: 'Trekanter, sinus og cosinus, vektorer i planen, linjer og cirkler.',
    topics: [trig, vectors, circle],
    status: { trigonometri: 'done', vektorer: 'done' },
    planned: ['Vektorer i rummet'],
  },
  {
    id: 'funktioner',
    title: 'Funktioner og infinitesimalregning',
    desc: 'Funktionstyperne, differential- og integralregning og differentialligninger.',
    topics: [linear, quadratic, exponential, power, derivative, integral, diffeq],
    status: { lineaere: 'done', andengrads: 'done', eksponentielle: 'done', potens: 'done', differential: 'now', integral: 'next' },
    planned: ['Regression og modellering'],
  },
  {
    id: 'sandsynlighed',
    title: 'Sandsynlighed og statistik',
    desc: 'Kombinatorik, sandsynlighed, binomialfordelingen og normalfordelingen.',
    topics: [probability, normal],
    status: { sandsynlighed: 'done' },
    planned: ['Deskriptiv statistik', 'Hypotesetest i binomialfordelingen'],
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
