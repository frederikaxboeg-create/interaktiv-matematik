# Interaktiv Matematik

**Live:** https://frederikaxboeg-create.github.io/interaktiv-matematik/

En interaktiv matematik-app til gymnasiet. Den kan bruges som hjemmeside, installeres som app og virker uden internet. Hvert emne har to dele:

- **Udforsk** – træk i punkter og skru på parametre, og se graf og udregninger ændre sig live.
- **Øv dig** – tilfældigt genererede opgaver med øjeblikkelig feedback, hint, fuld løsning og point.

## Indhold

Appen følger kernestoffet i Matematik A og er delt op i kategorier:

- **Emner** (ordnet efter kernestoffets områder) – hvert emne har fanerne *Lær* (teori og eksempler), *Udforsk* (træk i grafer og figurer) og *Øv dig* (opgaver):
  - *Tal og algebra:* Procent og rente
  - *Geometri, trigonometri og vektorer:* Trigonometri, Vektorer i planen
  - *Funktioner og infinitesimalregning:* Lineære, andengrads-, eksponentielle og potensfunktioner, Differentialregning, Integralregning, Differentialligninger
  - *Sandsynlighed og statistik:* Sandsynlighedsregning og binomialfordelingen
- **Interaktive øvelser** – alle opgaver, hvor man løser ved at trække i grafer, punkter og vektorer
- **Løs ligninger** – otte ligningstyper med trin-for-trin-løsninger, en metodeoversigt og en ligningsløser
- **CAS-regneark** – regn som i Maple: `f := x -> …`, `diff`, `int`, `solve`, `fsolve`, `factor`, `expand`, `evalf`, `subs` og `plot`
- **Graftegner**
- **Hjælp** – alt om siden, matematiksproget og CAS-kommandoerne

Alle indtastningsfelter viser det, du skriver, som pæn matematik (2D), mens du skriver.

Emner fra kernestoffet, der endnu ikke er lavet, står som "Kommer senere" på forsiden.

## Installér som app

- **Android/Chrome/Edge:** tryk "Installér" øverst, eller brug browserens menu
- **iPhone/iPad:** åbn siden i Safari → Del → "Føj til hjemmeskærm"
- **Mac/PC:** i Chrome eller Edge, klik på installér-ikonet i adresselinjen
- Efter første besøg virker appen også uden internet

## Udgiv ændringer

Appen ligger på GitHub Pages fra `main`-grenen. For at udgive en ændring:

1. Hæv `CACHE`-versionen i `sw.js` (f.eks. `interaktiv-matematik-v2`), så installerede apps henter de nye filer
2. Tilføjer du en ny fil, skal den også med i `FILES`-listen i `sw.js`
3. `git commit -am "Beskrivelse"` og `git push`

Siden er opdateret efter et par minutter.

## Kør appen lokalt

Der er intet build-trin – det er ren HTML, CSS og JavaScript. Start en lokal webserver i mappen:

```bash
python3 -m http.server 5173
```

Åbn derefter <http://localhost:5173>.

(Appen bruger ES-moduler, så den skal hentes via en webserver – at dobbeltklikke på `index.html` virker ikke.)

## Struktur

```
index.html          Skal for appen (topbjælke + <main>)
css/style.css       Alt design, inkl. mørk tilstand
js/main.js          Routing (#/emne, #/emne/oev) og forside
js/graph.js         Interaktivt koordinatsystem på canvas (zoom, panorering, trækbare punkter)
js/cas.js           CAS-motor: parser, 2D-visning (TeX), forenkling, diff, int, solve
js/parser.js        Udtryk i x → funktion (bygger på cas.js)
js/mathinput.js     Live formelvisning og matematiktastatur
js/practice.js      Opgavemotor: tjek af svar, hint, løsning, point
js/progress.js      Point og fremskridt i localStorage
js/ui.js, util.js   DOM-hjælpere, KaTeX-formler, talformatering med decimalkomma
js/topics/*.js      Et modul pr. emne: explore() + en liste af opgavegeneratorer
js/pwa.js, sw.js    Installérbar app og offline-cache
manifest.webmanifest, icons/   App-navn, farver og ikoner
vendor/katex/       KaTeX 0.16.11 (MIT-licens) til formler – ligger lokalt, så det virker offline
```

### Tilføj en ny opgavetype

Tilføj et objekt til `exercises` i det relevante emne-modul:

```js
{
  id: 'min-opgave',
  title: 'Min opgave',
  make() {
    const a = rint(1, 5);
    return {
      prompt: `Hvad er $${a}\\cdot 2$?`,
      fields: [{ label: 'x', answer: a * 2 }],
      hint: 'Gang med 2.',
      solution: `$$${a}\\cdot 2 = ${a * 2}$$`,
    };
  },
}
```

Formler skrives i TeX mellem `$...$` (inline) eller `$$...$$` (centreret) og vises med KaTeX.
