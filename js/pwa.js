// Installérbar app: registrerer service workeren og viser en "Installér"-knap,
// når browseren tilbyder det (Chrome, Edge, Android). På iPhone installeres via
// Del-menuen → "Føj til hjemmeskærm".

export function setupPwa() {
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // Når en ny version er installeret, genindlæses siden én gang, så man ser den med det samme.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
        // Tjek for en ny version, når man vender tilbage til appen, og hver halve time.
        const check = () => reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
        setInterval(check, 30 * 60 * 1000);
      }).catch(() => { /* appen virker fint uden */ });
    });
  }

  const btn = document.getElementById('install');
  if (!btn) return;
  let deferred = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    btn.hidden = true;
  });

  window.addEventListener('appinstalled', () => { btn.hidden = true; });
}
