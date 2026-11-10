// Installérbar app: registrerer service workeren og viser en "Installér"-knap,
// når browseren tilbyder det (Chrome, Edge, Android). På iPhone installeres via
// Del-menuen → "Føj til hjemmeskærm".

export function setupPwa() {
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* appen virker fint uden */ });
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
