/* Service worker: gemmer appens filer, så den også virker uden internet.
 * Strategi: svar straks fra cachen og hent en frisk version i baggrunden
 * (stale-while-revalidate), så opdateringer slår igennem ved næste åbning.
 * Hæv CACHE-versionen, når du udgiver ændringer. */
const CACHE = 'interaktiv-matematik-v7';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/cas.js',
  'js/graph.js',
  'js/main.js',
  'js/mathinput.js',
  'js/parser.js',
  'js/practice.js',
  'js/progress.js',
  'js/pwa.js',
  'js/ui.js',
  'js/util.js',
  'js/topics/derivative.js',
  'js/topics/diffeq.js',
  'js/topics/equations.js',
  'js/topics/exponential.js',
  'js/topics/help.js',
  'js/topics/index.js',
  'js/topics/integral.js',
  'js/topics/linear.js',
  'js/topics/normal.js',
  'js/topics/percent.js',
  'js/topics/plotter.js',
  'js/topics/power.js',
  'js/topics/probability.js',
  'js/topics/quadratic.js',
  'js/topics/trig.js',
  'js/topics/vectors.js',
  'js/topics/worksheet.js',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg',
  'vendor/katex/katex.min.css',
  'vendor/katex/katex.min.js',
  'vendor/katex/fonts/KaTeX_AMS-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Caligraphic-Bold.woff2',
  'vendor/katex/fonts/KaTeX_Caligraphic-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Fraktur-Bold.woff2',
  'vendor/katex/fonts/KaTeX_Fraktur-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Main-Bold.woff2',
  'vendor/katex/fonts/KaTeX_Main-BoldItalic.woff2',
  'vendor/katex/fonts/KaTeX_Main-Italic.woff2',
  'vendor/katex/fonts/KaTeX_Main-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Math-BoldItalic.woff2',
  'vendor/katex/fonts/KaTeX_Math-Italic.woff2',
  'vendor/katex/fonts/KaTeX_SansSerif-Bold.woff2',
  'vendor/katex/fonts/KaTeX_SansSerif-Italic.woff2',
  'vendor/katex/fonts/KaTeX_SansSerif-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Script-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size1-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size2-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size3-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Size4-Regular.woff2',
  'vendor/katex/fonts/KaTeX_Typewriter-Regular.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then((cache) =>
    cache.match(req, { ignoreSearch: true }).then((cached) => {
      const fresh = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    })));
});
