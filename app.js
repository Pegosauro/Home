window.addEventListener('DOMContentLoaded', () => {
  cleanupLegacyCache();

  CasaApp.state.init();
  CasaApp.state.route = CasaApp.state.readHash();
  CasaApp.state.subscribe(renderApp);

  window.addEventListener('hashchange', () => CasaApp.state.syncRouteFromHash());

  document.getElementById('jsonImportInput').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = await CasaApp.storage.importFile(file);
      CasaApp.state.setData(imported);
      alert('Importazione completata.');
    } catch (error) {
      alert('File JSON non valido.');
      console.error(error);
    } finally {
      event.target.value = '';
    }
  });

  renderApp();
});

function cleanupLegacyCache() {
  // Durante lo sviluppo su GitHub Pages evita che vecchi service worker/cache
  // continuino a mostrare versioni precedenti dell'app.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations?.().then(registrations => {
      registrations.forEach(registration => registration.unregister());
    }).catch(console.warn);
  }
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key))).catch(console.warn);
  }
}

function renderApp() {
  const root = document.getElementById('app');
  const route = CasaApp.state.route || { view: 'home', params: {} };
  const view = route.view || 'home';

  if (CasaApp.state.needsSetup()) {
    document.getElementById('bottomNav').innerHTML = '';
    CasaApp.views.setup(root);
    return;
  }

  CasaApp.components.renderNav(view === 'stanza' ? 'home' : view);

  if (view === 'home') CasaApp.views.home(root, route.params);
  else if (view === 'lavori') CasaApp.views.lavori(root, route.params);
  else if (view === 'idee') CasaApp.views.idee(root, route.params);
  else if (view === 'opzioni') CasaApp.views.opzioni(root, route.params);
  else if (view === 'stanza') CasaApp.views.stanza(root, route.params);
  else CasaApp.views.home(root, route.params);
}
