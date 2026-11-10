// Hjælp: alt om siden – især hvordan man skriver matematik.
import { el, math, tex, escapeHtml } from '../ui.js';
import { parse, toTex, run, newEnv } from '../cas.js';
import { attachPreview } from '../mathinput.js';

/** Tabel: beskrivelse | det du skriver | sådan vises det */
function syntaxTable(rows) {
  const body = rows.map(([desc, src]) => {
    let shown;
    try { shown = tex('\\displaystyle ' + toTex(parse(src))); } catch (e) { shown = `<span class="cas-err">${escapeHtml(e.message)}</span>`; }
    return `<tr><td>${desc}</td><td><code>${escapeHtml(src)}</code></td><td>${shown}</td></tr>`;
  }).join('');
  return `<table class="vt help-table"><thead><tr><th>Hvad</th><th>Du skriver</th><th>Det vises som</th></tr></thead><tbody>${body}</tbody></table>`;
}

/** Tabel med CAS-kommandoer, hvor resultatet beregnes live. */
function casTable(rows) {
  const env = newEnv();
  const body = rows.map(([desc, src]) => {
    let res;
    try { const r = run(src, env); res = r.plot ? '<span class="muted">(tegner en graf)</span>' : tex(r.output); } catch (e) { res = `<span class="cas-err">${escapeHtml(e.message)}</span>`; }
    return `<tr><td>${desc}</td><td><code>${escapeHtml(src)}</code></td><td>${res}</td></tr>`;
  }).join('');
  return `<table class="vt help-table"><thead><tr><th>Kommando</th><th>Eksempel</th><th>Resultat</th></tr></thead><tbody>${body}</tbody></table>`;
}

function article(html) {
  return el('article', { class: 'learn card', html: math(html) });
}

function start(root) {
  root.append(article(`
    <h2>Velkommen</h2>
    <p>Interaktiv Matematik er bygget efter kernestoffet i <b>Matematik A</b>. Du kan bruge den til at <b>lære</b> teorien, <b>udforske</b> den ved at trække i grafer og figurer, og <b>øve dig</b> med opgaver, der retter med det samme.</p>

    <h2>Menuen</h2>
    <table class="vt help-table"><tbody>
      <tr><td><b>Emner</b></td><td>Forsiden med alle emner, ordnet efter kernestoffets fire områder. Mærkerne viser, om et forløb er <span class="status s-done">Gennemgået</span>, <span class="status s-now">I gang nu</span> eller <span class="status s-next">Næste forløb</span>.</td></tr>
      <tr><td><b>Interaktive øvelser</b></td><td>Opgaver, hvor du svarer ved at <b>trække</b> i grafer, punkter og vektorer.</td></tr>
      <tr><td><b>Løs ligninger</b></td><td>Træning i ligningsløsning med trin-for-trin-løsninger, en oversigt over metoderne og en <b>ligningsløser</b>.</td></tr>
      <tr><td><b>CAS</b></td><td>Et regneark som i Maple: definér funktioner, differentiér, integrér, løs ligninger og tegn grafer.</td></tr>
      <tr><td><b>Graftegner</b></td><td>Tegn op til fire funktioner på én gang.</td></tr>
      <tr><td><b>Hjælp</b></td><td>Denne side.</td></tr>
    </tbody></table>

    <h2>Et emne har tre faner</h2>
    <ul>
      <li><b>Lær</b> – teori, regler og gennemregnede eksempler. Start her, hvis emnet er nyt.</li>
      <li><b>Udforsk</b> – træk i de store, farvede punkter og skru på skyderne. Udregningerne i panelet ændrer sig med det samme.</li>
      <li><b>Øv dig</b> – nye opgaver hver gang. Vælg en bestemt opgavetype med knapperne øverst, eller tag "Blandet".</li>
    </ul>

    <h2>Grafer</h2>
    <ul>
      <li><b>Træk i et stort punkt</b> for at flytte det. Punkter med en lys ring om kan trækkes.</li>
      <li><b>Træk i baggrunden</b> for at flytte rundt, og <b>zoom</b> med musehjulet, to fingre eller knapperne <b>+</b> og <b>−</b>.</li>
      <li><b>⌂</b> nulstiller visningen. Koordinaterne under musen står nederst til venstre.</li>
    </ul>

    <h2>Point</h2>
    <ul>
      <li>Rigtigt i første forsøg: <b>10 point</b>. Rigtigt i et senere forsøg: <b>5 point</b>.</li>
      <li>Hvis du har set løsningen, får du ingen point – men du kan stadig svare for at øve dig.</li>
      <li>"I træk" tæller, hvor mange opgaver du har klaret i første forsøg i træk. 🔥 ved 3 eller flere!</li>
      <li>Pointene gemmes kun i din browser. Du kan nulstille dem nederst på forsiden.</li>
    </ul>`));
}

function writing(root) {
  const tryInput = el('input', { type: 'text', value: '(x^2 + 1)/(2x) - sqrt(x)', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Prøv at skrive' });
  const preview = attachPreview(tryInput);
  root.append(
    article(`
      <h2>Prøv selv</h2>
      <p>Skriv et udtryk herunder – det vises som pæn matematik, mens du skriver. Det samme sker i alle felter på siden.</p>`),
  );
  root.lastChild.append(el('div', { class: 'help-try' }, tryInput, preview));
  root.lastChild.insertAdjacentHTML('beforeend', math(`
    <h2>Regnearter og potenser</h2>
    ${syntaxTable([
      ['Plus og minus', '3 + x - 2'],
      ['Gange', '2*x*y'],
      ['Gange kan udelades', '2x(x+1)'],
      ['Division / brøk', '(x+1)/(x-1)'],
      ['Potens', 'x^2'],
      ['Potens med udtryk i eksponenten', '2^(x+1)'],
      ['Negativ eksponent', 'x^(-1)'],
      ['Decimaltal (komma eller punktum)', '0,25x + 1.5'],
    ])}
    <p><b>Husk parenteser!</b> <code>1/2x</code> betyder $\\frac12\\cdot x$, mens <code>1/(2x)</code> betyder $\\frac{1}{2x}$. Og <code>2^x+1</code> er $2^x+1$, mens <code>2^(x+1)</code> er $2^{x+1}$.</p>

    <h2>Rødder, konstanter og funktioner</h2>
    ${syntaxTable([
      ['Kvadratrod', 'sqrt(x)'],
      ['n\'te rod (som potens)', 'x^(1/3)'],
      ['Tallet π', 'pi'],
      ['Eulers tal e', 'e^(2x)'],
      ['Naturlig logaritme', 'ln(x)'],
      ['Titalslogaritme', 'log(x)'],
      ['Numerisk værdi', 'abs(x - 3)'],
      ['Sinus, cosinus, tangens', 'sin(x) + cos(x)^2'],
      ['Omvendte (sin⁻¹ osv.)', 'arcsin(0,5)'],
    ])}
    <p class="muted">Vinkler i <code>sin</code>, <code>cos</code> og <code>tan</code> regnes i <b>radianer</b>. I trigonometri-opgaverne står vinklerne i grader. Bemærk: <code>log</code> er titalslogaritmen (som i danske lærebøger) – i Maple betyder <code>log</code> den naturlige logaritme.</p>

    <h2>Svar i opgaverne</h2>
    <ul>
      <li>Du kan svare med tal, brøker og udtryk: <code>3/4</code>, <code>-1,5</code>, <code>sqrt(2)</code>, <code>2pi</code>.</li>
      <li>Står der "afrund til to decimaler", er det nok at svaret er rigtigt på de to decimaler.</li>
      <li>Ved to løsninger (fx $x_1$ og $x_2$) er rækkefølgen ligegyldig.</li>
      <li>Tryk <b>Enter</b> for at tjekke dit svar – og Enter igen for næste opgave.</li>
    </ul>

    <h2>Specialtegn kan også bruges</h2>
    ${syntaxTable([
      ['Kvadrat og kubik', 'x² + x³'],
      ['Gangeprik', '3·x'],
      ['π og √', 'π√2'],
    ])}`));
}

function casHelp(root) {
  root.append(article(`
    <h2>CAS-regnearket</h2>
    <p>Regnearket under <a href="#/cas">CAS</a> virker som Maple: skriv en linje, tryk <b>Enter</b>, og resultatet vises som pæn matematik. Linjerne regnes oppefra og ned, så noget du har defineret, kan bruges længere nede.</p>

    <h2>Definitioner</h2>
    ${casTable([
      ['Gem et tal', 'a := 5'],
      ['Definér en funktion', 'f := x -> x^2 - 4x + 3'],
      ['Samme, kortere', 'g(x) := 2x + 1'],
      ['Brug funktionen', 'f(1)'],
    ])}

    <h2>Kommandoer</h2>
    ${casTable([
      ['Differentiér', 'diff(x^3 - 3x, x)'],
      ['Produkt- og kædereglen', 'diff(x*e^(2x), x)'],
      ['Anden afledede', 'diff(x^4, x, x)'],
      ['Stamfunktion', 'int(6x^2 + 2, x)'],
      ['Bestemt integral', 'int(x^2, x = 0..3)'],
      ['Løs ligning (eksakt for 1. og 2. grad)', 'solve(x^2 - x - 6 = 0, x)'],
      ['Løs i et interval', 'solve(sin(x) = 0,5, x = 0..7)'],
      ['Løs numerisk', 'fsolve(x^3 = 2x + 1, x)'],
      ['Faktorisér', 'factor(2x^2 - 8)'],
      ['Gang parenteser ud', 'expand((x - 1)^3)'],
      ['Forenkl', 'simplify(3x + 2x - x^2*x)'],
      ['Decimaltal', 'evalf(e^2)'],
      ['Indsæt en værdi', 'subs(x = 3, x^2 + 2x)'],
      ['Tegn graf(er)', 'plot([x^2, 2x + 3], x = -3..4)'],
    ])}

    <h2>Gode råd</h2>
    <ul>
      <li>Sæt <b>komma og mellemrum</b> mellem argumenter: <code>diff(x^2, x)</code>. Et komma mellem to cifre (<code>2,5</code>) læses som decimalkomma.</li>
      <li>Ligninger skrives med <code>=</code>, definitioner med <code>:=</code>.</li>
      <li>Kan <code>solve</code> ikke finde en eksakt løsning, løses ligningen numerisk i intervallet $[-100;100]$. Giv selv et interval med <code>x = a..b</code>.</li>
      <li>Får du en fejl, så kig efter manglende parenteser eller et manglende gangetegn mellem to bogstaver, fx <code>a*b</code>.</li>
    </ul>`));
}

function faq(root) {
  root.append(article(`
    <h2>Ofte stillede spørgsmål</h2>

    <h3>Mit svar er rigtigt, men bliver ikke godkendt?</h3>
    <p>Tjek om der skal afrundes, og om du har brugt minus ved et fald. Prøv også at skrive svaret som en brøk eller med flere decimaler. Får du stadig ikke point, så se løsningen – den viser præcis, hvad der regnes ud.</p>

    <h3>Hvordan installerer jeg siden som app?</h3>
    <ul>
      <li><b>iPhone/iPad:</b> åbn siden i Safari → Del → "Føj til hjemmeskærm".</li>
      <li><b>Android, Chrome og Edge:</b> tryk "Installér" øverst på siden, eller brug browserens menu.</li>
    </ul>
    <p>Efter første besøg virker appen også <b>uden internet</b>.</p>

    <h3>Hvor gemmes mine point og mit CAS-ark?</h3>
    <p>Kun i din egen browser på den enhed, du bruger. De deles ikke med nogen, og de følger ikke med til en anden telefon eller computer.</p>

    <h3>Hvorfor virker træk ikke?</h3>
    <p>Kun de store punkter med en lys ring om kan trækkes. Træk du i baggrunden, flytter du hele koordinatsystemet – tryk på ⌂ for at komme tilbage.</p>

    <h3>Hvad betyder "Kommer senere"?</h3>
    <p>Det er emner fra kernestoffet, som endnu ikke er bygget ind i appen. De bliver tilføjet efterhånden.</p>

    <h3>Kan jeg bruge appen til eksamen?</h3>
    <p>Appen er lavet til at lære og træne. Til eksamen skal du bruge de hjælpemidler, din skole tillader.</p>`));
}

export default {
  id: 'hjaelp',
  title: 'Hjælp',
  short: 'Hjælp',
  formula: '',
  desc: 'Alt om siden: hvordan du bruger den, hvordan du skriver matematik, og hvordan CAS-regnearket virker.',
  exercises: [],
  tabs: [
    { id: 'start', label: 'Kom i gang', mount: start },
    { id: 'skriv', label: 'Skriv matematik', mount: writing },
    { id: 'cas', label: 'CAS-kommandoer', mount: casHelp },
    { id: 'faq', label: 'Spørgsmål', mount: faq },
  ],
};
