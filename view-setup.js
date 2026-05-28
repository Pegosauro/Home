window.CasaApp = window.CasaApp || {};
CasaApp.views = CasaApp.views || {};

CasaApp.views.setup = function renderSetup(root) {
  const data = CasaApp.state.getData();
  const { escapeHtml, sortByOrder } = CasaApp.utils;
  const hasFloors = data.house.floors.length > 0;
  const hasRooms = data.house.rooms.length > 0;
  const canStart = hasFloors && hasRooms;

  CasaApp.components.setHeader('CONFIGURA CASA', 'Primo avvio');

  root.innerHTML = `
    <section class="setup-hero card card-inner stack">
      <div class="setup-icon">⌂</div>
      <div>
        <h2>Imposta piani e stanze</h2>
        <p class="small">L’app parte vuota. Crea almeno un piano e una stanza per iniziare a inserire lavori e idee.</p>
      </div>
    </section>

    <section class="card card-inner stack setup-step ${hasFloors ? 'done' : ''}">
      <div class="row">
        <div>
          <h2>1. Piani</h2>
          <p class="small">Esempi: Piano Terra, Primo Piano, Esterno, Garage.</p>
        </div>
        <button class="primary-btn" data-setup-add-floor>+ Piano</button>
      </div>
      <div class="setup-list">
        ${[...data.house.floors].sort(sortByOrder).map(floor => `
          <article class="setup-pill">
            <span>${escapeHtml(floor.name)}</span>
            <button class="ghost-btn" data-setup-edit-floor="${floor.id}">Modifica</button>
          </article>
        `).join('') || '<div class="empty">Nessun piano creato.</div>'}
      </div>
    </section>

    <section class="card card-inner stack setup-step ${hasRooms ? 'done' : ''}">
      <div class="row">
        <div>
          <h2>2. Stanze</h2>
          <p class="small">Associa ogni stanza a un piano.</p>
        </div>
        <button class="primary-btn" data-setup-add-room ${hasFloors ? '' : 'disabled'}>+ Stanza</button>
      </div>
      <div class="setup-list">
        ${[...data.house.rooms].sort(sortByOrder).map(room => {
          const floor = CasaApp.state.floorById(room.floorId);
          return `
            <article class="setup-pill">
              <span>${escapeHtml(room.icon || '🏠')} ${escapeHtml(room.name)} <small>· ${escapeHtml(floor?.name || '')}</small></span>
              <button class="ghost-btn" data-setup-edit-room="${room.id}">Modifica</button>
            </article>
          `;
        }).join('') || '<div class="empty">Nessuna stanza creata.</div>'}
      </div>
    </section>

    <section class="setup-actions">
      <button class="primary-btn wide" data-start-app ${canStart ? '' : 'disabled'}>Entra nell’app</button>
      <button class="ghost-btn wide" data-import-json>Importa JSON esistente</button>
    </section>
  `;

  root.querySelector('[data-setup-add-floor]')?.addEventListener('click', () => CasaApp.components.openFloorModal());
  root.querySelector('[data-setup-add-room]')?.addEventListener('click', () => {
    if (!hasFloors) {
      alert('Crea prima un piano.');
      return;
    }
    CasaApp.components.openRoomModal();
  });
  root.querySelectorAll('[data-setup-edit-floor]').forEach(btn => btn.addEventListener('click', () => CasaApp.components.openFloorModal(btn.dataset.setupEditFloor)));
  root.querySelectorAll('[data-setup-edit-room]').forEach(btn => btn.addEventListener('click', () => CasaApp.components.openRoomModal(btn.dataset.setupEditRoom)));
  root.querySelector('[data-start-app]')?.addEventListener('click', () => {
    if (!canStart) {
      alert('Crea almeno un piano e una stanza.');
      return;
    }
    CasaApp.state.navigate('home');
  });
  root.querySelector('[data-import-json]')?.addEventListener('click', () => document.getElementById('jsonImportInput').click());
};
