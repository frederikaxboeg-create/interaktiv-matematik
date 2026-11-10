// Point og fremskridt, gemt i browseren (localStorage).
const KEY = 'interaktiv-matematik:v1';
const listeners = new Set();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
let data = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* fx privat vindue */ }
  for (const fn of listeners) fn();
}

export function stats(topicId) {
  return (data[topicId] ??= { points: 0, solved: 0, attempts: 0, streak: 0, best: 0 });
}

export function record(topicId, { correct, points = 0, keepStreak = true }) {
  const s = stats(topicId);
  s.attempts++;
  if (correct) {
    s.solved++;
    s.points += points;
    s.streak = keepStreak ? s.streak + 1 : 0;
    s.best = Math.max(s.best, s.streak);
  } else {
    s.streak = 0;
  }
  save();
}

export function breakStreak(topicId) {
  stats(topicId).streak = 0;
  save();
}

export const totalPoints = () => Object.values(data).reduce((sum, s) => sum + (s.points || 0), 0);

export function reset() {
  data = {};
  save();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
