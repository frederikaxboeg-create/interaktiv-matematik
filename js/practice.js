// Opgavemotor: viser genererede opgaver, tjekker svar og giver point.
//
// En opgave (returneret af make()) kan have:
//   prompt     – tekst med $formler$
//   fields     – [{ label, answer, tol?, rel? }]   talsvar
//   unordered  – true hvis felternes rækkefølge er ligegyldig (fx to rødder)
//   choices    – [{ html, correct }]                multiple choice
//   graph      – { view, state, scene(state, revealed), aspect? }
//   check      – (state) => boolean                 til graf-opgaver
//   hint, solution
import { el, math, tex } from './ui.js';
import { pick } from './util.js';
import { Graph } from './graph.js';
import { evalNumber } from './parser.js';
import * as progress from './progress.js';

const PRAISE = ['Flot!', 'Sådan!', 'Godt regnet!', 'Stærkt!', 'Præcis!', 'Det sidder!'];

function close(v, answer, f) {
  if (f.rel) return Math.abs(v - answer) <= f.rel * Math.abs(answer) + 1e-9;
  return Math.abs(v - answer) <= (f.tol ?? 0.01) + 1e-9;
}

export function mountPractice(root, topic) {
  const types = topic.exercises;
  let filter = 'all';
  let ex, attempts, revealed, done, lastId, graph, inputs, feedback, solBox, hintBox, checkBtn, nextBtn;

  const statsEl = el('div', { class: 'stats' });
  const chips = el('div', { class: 'chips' });
  const card = el('article', { class: 'card ex-card' });
  root.append(el('div', { class: 'practice' }, el('div', { class: 'practice-top' }, chips, statsEl), card));

  function renderChips() {
    const mk = (id, label) => {
      const b = el('button', { type: 'button', class: 'chip' + (filter === id ? ' active' : '') }, label);
      b.addEventListener('click', () => { filter = id; renderChips(); next(); });
      return b;
    };
    chips.replaceChildren(mk('all', 'Blandet'), ...types.map((t) => mk(t.id, t.title)));
  }

  function renderStats() {
    const s = progress.stats(topic.id);
    statsEl.innerHTML =
      `<span class="stat"><b>${s.points}</b> point</span>` +
      `<span class="stat"><b>${s.solved}</b> løst</span>` +
      `<span class="stat streak${s.streak >= 3 ? ' hot' : ''}" title="Bedste: ${s.best}"><b>${s.streak}</b> i træk</span>`;
  }

  function next() {
    const pool = filter === 'all' ? types : types.filter((t) => t.id === filter);
    let t = pick(pool);
    if (pool.length > 1 && t.id === lastId) t = pick(pool.filter((x) => x.id !== lastId));
    lastId = t.id;
    ex = t.make();
    ex.typeTitle = t.title;
    attempts = 0;
    revealed = false;
    done = false;
    render();
  }

  function setFeedback(kind, html) {
    feedback.className = `feedback ${kind}`;
    feedback.innerHTML = math(html);
    feedback.hidden = false;
  }

  function render() {
    graph?.destroy();
    graph = null;
    inputs = [];
    card.replaceChildren();
    card.append(
      el('div', { class: 'ex-type' }, ex.typeTitle),
      el('div', { class: 'ex-prompt', html: math(ex.prompt) }),
    );

    if (ex.graph) {
      const box = el('div', { class: 'ex-graph' });
      card.append(box);
      const st = ex.graph.state ?? {};
      graph = new Graph(box, { ...ex.graph.view, aspect: ex.graph.aspect ?? '16 / 10' });
      graph.setScene(() => ex.graph.scene(st, revealed || done));
      if (ex.check) card.append(el('p', { class: 'tip' }, 'Træk i de store punkter. Træk i baggrunden for at flytte rundt.'));
    }

    if (ex.fields) {
      const form = el('div', { class: 'fields' });
      for (const f of ex.fields) {
        const inp = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': f.label });
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); done ? next() : check(); }
        });
        inp.addEventListener('input', () => inp.classList.remove('ok', 'bad'));
        inputs.push(inp);
        form.append(el('label', { class: 'field' },
          el('span', { class: 'field-label', html: tex(f.label) }),
          el('span', { class: 'field-eq' }, '='),
          inp));
      }
      card.append(form);
    }

    if (ex.choices) {
      const grid = el('div', { class: 'choices' });
      for (const c of ex.choices) {
        const b = el('button', { type: 'button', class: 'choice', html: math(c.html) });
        b.addEventListener('click', () => choose(c, b));
        c.button = b;
        grid.append(b);
      }
      card.append(grid);
    }

    feedback = el('div', { class: 'feedback', role: 'status', 'aria-live': 'polite', hidden: true });
    const actions = el('div', { class: 'actions' });
    if (!ex.choices) {
      checkBtn = el('button', { type: 'button', class: 'btn primary' }, 'Tjek svar');
      checkBtn.addEventListener('click', check);
      actions.append(checkBtn);
    } else checkBtn = null;
    if (ex.hint) {
      const hb = el('button', { type: 'button', class: 'btn ghost' }, 'Hint');
      hb.addEventListener('click', () => { hintBox.hidden = !hintBox.hidden; });
      actions.append(hb);
    }
    const sb = el('button', { type: 'button', class: 'btn ghost' }, 'Vis løsning');
    sb.addEventListener('click', reveal);
    nextBtn = el('button', { type: 'button', class: 'btn next' }, 'Næste opgave →');
    nextBtn.addEventListener('click', next);
    actions.append(sb, nextBtn);

    hintBox = el('div', { class: 'hint-box', hidden: true, html: ex.hint ? math(`<b>Hint:</b> ${ex.hint}`) : '' });
    solBox = el('div', { class: 'solution', hidden: true, html: math(`<h4>Løsning</h4>${ex.solution ?? ''}`) });
    card.append(feedback, actions, hintBox, solBox);

    if (inputs[0] && matchMedia('(pointer: fine)').matches) inputs[0].focus({ preventScroll: true });
  }

  function check() {
    if (done) return;
    let ok;
    if (ex.fields) {
      const vals = inputs.map((i) => evalNumber(i.value));
      if (vals.some((v) => !Number.isFinite(v))) {
        setFeedback('warn', `Skriv et tal i ${inputs.length > 1 ? 'alle felterne' : 'feltet'}. Du kan bruge decimalkomma, brøker som 3/4 og fx sqrt(2).`);
        return;
      }
      if (ex.unordered) {
        const got = [...vals].sort((a, b) => a - b);
        const want = ex.fields.map((f) => f.answer).sort((a, b) => a - b);
        ok = got.every((v, i) => close(v, want[i], ex.fields[0]));
        inputs.forEach((inp) => { inp.classList.toggle('ok', ok); inp.classList.toggle('bad', !ok); });
      } else {
        const res = vals.map((v, i) => close(v, ex.fields[i].answer, ex.fields[i]));
        res.forEach((r, i) => { inputs[i].classList.toggle('ok', r); inputs[i].classList.toggle('bad', !r); });
        ok = res.every(Boolean);
      }
    } else if (ex.check) {
      ok = ex.check(ex.graph.state);
    }
    finish(ok);
  }

  function choose(c, btn) {
    if (done || btn.disabled) return;
    if (c.correct) btn.classList.add('ok');
    else { btn.classList.add('bad'); btn.disabled = true; }
    finish(!!c.correct);
  }

  function finish(ok) {
    attempts++;
    if (ok) {
      done = true;
      const pts = revealed ? 0 : attempts === 1 ? 10 : 5;
      progress.record(topic.id, { correct: true, points: pts, keepStreak: !revealed && attempts === 1 });
      setFeedback('ok', `<b>${pick(PRAISE)}</b> ${pts ? `+${pts} point.` : 'Rigtigt – men ingen point, når løsningen er vist.'}`);
      solBox.hidden = false;
      if (ex.choices) for (const c of ex.choices) { if (c.correct) c.button.classList.add('ok'); c.button.disabled = true; }
      inputs.forEach((i) => (i.readOnly = true));
      if (checkBtn) checkBtn.disabled = true;
      nextBtn.classList.add('primary');
      nextBtn.focus({ preventScroll: true });
      graph?.draw();
    } else {
      progress.record(topic.id, { correct: false });
      setFeedback('bad', attempts >= 2 && ex.hint && hintBox.hidden
        ? 'Ikke helt. Prøv at kigge på hintet.'
        : 'Ikke helt rigtigt. Prøv igen!');
    }
    renderStats();
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    solBox.hidden = false;
    graph?.draw();
    if (!done) {
      progress.breakStreak(topic.id);
      renderStats();
      setFeedback('info', 'Løsningen er vist. Prøv at svare alligevel – men det giver ikke point.');
    }
  }

  renderChips();
  renderStats();
  next();
}
