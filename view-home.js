window.CasaApp = window.CasaApp || {};

CasaApp.views = CasaApp.views || {};

CasaApp.views.home = function renderHome(root) {
  const data = CasaApp.state.getData();
  const { escapeHtml, sortByOrder } = CasaApp.utils;
  const openTasks = data.tasks.filter(task => task.status !== 'fatto');
  const high = openTasks.filter(task => task.priority === 'alta');

  CasaApp.components.setHeader('HOME', 'Casa', '<button class="icon-btn" data-add-task>＋</button>');

  root.innerHTML = `
    <section class="card home-summary card-inner stack">
      <h2>Riepilogo rapido</h2>
      <div class="grid-4">
        <div class="metric"><span>🔧</span><p class="num">${openTasks.length}</p><p class="label">Lavori</p></div>
        <div class="metric"><span>💡</span><p class="num">${data.ideas.length}</p><p class="label">Idee</p></div>
        <div class="metric"><span>⚠️</span><p class="num">${high.length}</p><p class="label">Alta</p></div>
        <div class="metric"><span>✅</span><p class="num">${data.tasks.filter(task => task.status === 'fatto').length}</p><p class="label">Fatti</p></div>
      </div>
    </section>

    ${renderHouseMap(data)}

    <section class="stack" style="margin-top:12px">
      <div class="row"><h2>I tuoi spazi</h2><span class="small">Gestione da Opzioni</span></div>
      ${[...data.house.floors].sort(sortByOrder).map(floor => floorBlock(data, floor)).join('')}
    </section>
  `;

  document.querySelector('[data-add-task]')?.addEventListener('click', () => CasaApp.components.openTaskModal());
  root.querySelectorAll('[data-room-open]').forEach(button => {
    button.addEventListener('click', () => CasaApp.state.navigate('stanza', { id: button.dataset.roomOpen }));
  });
};

function renderHouseMap(data) {
  const { escapeHtml, sortByOrder } = CasaApp.utils;
  return `
    <section class="card house-map-card stack">
      <div class="row"><h2>Mappa casa</h2><span class="small">Vista grafica</span></div>
      <div class="house-map">
        ${[...data.house.floors].sort(sortByOrder).map(floor => {
          const rooms = data.house.rooms.filter(room => room.floorId === floor.id).sort(sortByOrder);
          return `
            <div class="map-floor">
              <p class="map-floor-title">${escapeHtml(floor.name)}</p>
              <div class="map-rooms">
                ${rooms.map(room => {
                  const tasks = data.tasks.filter(task => task.roomId === room.id && task.status !== 'fatto').length;
                  const ideas = data.ideas.filter(idea => idea.roomId === room.id).length;
                  return `<button class="map-room" data-room-open="${room.id}"><strong>${room.icon || '🏠'} ${escapeHtml(room.name)}</strong><span>${tasks} lavori · ${ideas} idee</span></button>`;
                }).join('') || '<div class="empty">Nessuna stanza</div>'}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function floorBlock(data, floor) {
  const { escapeHtml, sortByOrder } = CasaApp.utils;
  const rooms = data.house.rooms.filter(room => room.floorId === floor.id).sort(sortByOrder);
  return `
    <section class="card floor-card">
      <div class="floor-title"><h3>⌂ ${escapeHtml(floor.name)}</h3><span class="small">${rooms.length} stanze</span></div>
      <div class="room-grid">
        ${rooms.map(room => {
          const tasks = data.tasks.filter(task => task.roomId === room.id && task.status !== 'fatto').length;
          const ideas = data.ideas.filter(idea => idea.roomId === room.id).length;
          return `
            <button class="room-tile" data-room-open="${room.id}">
              <span class="room-tile-top"><strong>${room.icon || '🏠'} ${escapeHtml(room.name)}</strong></span>
              <span class="room-counts"><span class="badge info">${tasks} lavori</span><span class="badge gray">${ideas} idee</span></span>
            </button>
          `;
        }).join('') || '<div class="empty">Nessuna stanza in questo piano</div>'}
      </div>
    </section>
  `;
}
