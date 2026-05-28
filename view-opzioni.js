window.CasaApp = window.CasaApp || {};
CasaApp.views = CasaApp.views || {};

CasaApp.views.opzioni = function renderOpzioni(root) {
  const data = CasaApp.state.getData();
  CasaApp.components.setHeader('OPZIONI', 'Impostazioni · v' + CasaApp.CONFIG.VERSION);

  root.innerHTML = `
    <section class="card card-inner stack" style="margin-bottom:14px">
      <div class="row">
        <div>
          <h2>Gestione dati</h2>
          <p class="small">Importa, esporta e proteggi i dati in formato JSON.</p>
        </div>
        <div class="setting-icon">🛡️</div>
      </div>
      <div class="grid-2">
        <button class="ghost-btn" data-export-json>Esporta JSON</button>
        <button class="ghost-btn" data-import-json>Importa JSON</button>
      </div>
    </section>

    <section class="settings-list">
      <button class="setting-row" data-toggle-theme>
        <span class="setting-left"><span class="setting-icon">🌙</span><span><strong>Tema</strong><br><span class="small">${data.settings.theme === 'light' ? 'Chiaro' : 'Scuro'}</span></span></span>
        <span class="toggle ${data.settings.theme === 'dark' ? 'on' : ''}"><span></span></span>
      </button>
      <button class="setting-row" data-manage-floors>
        <span class="setting-left"><span class="setting-icon">▦</span><strong>Gestione piani</strong></span><span>${data.house.floors.length}</span>
      </button>
      <button class="setting-row" data-manage-rooms>
        <span class="setting-left"><span class="setting-icon">⌂</span><strong>Gestione stanze</strong></span><span>${data.house.rooms.length}</span>
      </button>
      <button class="setting-row danger-text" data-reset-data>
        <span class="setting-left"><span class="setting-icon">🗑️</span><strong>Reset dati</strong></span><span>›</span>
      </button>
    </section>

    <section class="card card-inner stack" style="margin-top:14px">
      <h2>Nota</h2>
      <p class="small">Dopo il reset l’app torna alla schermata iniziale di configurazione. Non vengono più caricati dati demo.</p><p class="small"><strong>Versione app:</strong> ${CasaApp.CONFIG.VERSION}</p>
    </section>
  `;

  root.querySelector('[data-export-json]').addEventListener('click', () => CasaApp.storage.exportData(CasaApp.state.getData()));
  root.querySelector('[data-import-json]').addEventListener('click', () => document.getElementById('jsonImportInput').click());
  root.querySelector('[data-toggle-theme]').addEventListener('click', () => {
    CasaApp.state.update(draft => {
      draft.settings.theme = draft.settings.theme === 'dark' ? 'light' : 'dark';
    });
  });
  root.querySelector('[data-manage-floors]').addEventListener('click', () => CasaApp.components.openManageFloorsModal());
  root.querySelector('[data-manage-rooms]').addEventListener('click', () => CasaApp.components.openManageRoomsModal());
  root.querySelector('[data-reset-data]').addEventListener('click', () => {
    if (!confirm('Vuoi eliminare tutti i dati salvati nel browser? Dopo il reset dovrai ricreare piani e stanze.')) return;
    CasaApp.storage.reset();
    CasaApp.state.setData(CasaApp.model.createEmptyData());
    CasaApp.state.navigate('home');
  });
};
