window.CasaApp = window.CasaApp || {};
CasaApp.views = CasaApp.views || {};

CasaApp.views.stanza = function renderStanza(root, params) {
  const data = CasaApp.state.getData();
  const room = data.house.rooms.find(item => item.id === params.id) || data.house.rooms[0];
  if (!room) {
    CasaApp.state.navigate('home');
    return;
  }
  const floor = CasaApp.state.floorById(room.floorId);
  const tasks = data.tasks.filter(task => task.roomId === room.id);
  const openTasks = tasks.filter(task => task.status !== 'fatto');
  const ideas = data.ideas.filter(idea => idea.roomId === room.id);

  CasaApp.components.setHeader(room.name.toUpperCase(), floor?.name || 'Stanza', '<button class="icon-btn" data-back-home>‹</button>');

  root.innerHTML = `
    <section class="room-hero card card-inner stack">
      <div class="room-icon-large">${room.icon || '🏠'}</div>
      <div>
        <h2>${CasaApp.utils.escapeHtml(room.name)}</h2>
        <p class="small">${CasaApp.utils.escapeHtml(floor?.name || '')}</p>
      </div>
      <div class="grid-2">
        <div class="metric"><span>🔧</span><p class="num">${openTasks.length}</p><p class="label">Lavori aperti</p></div>
        <div class="metric"><span>💡</span><p class="num">${ideas.length}</p><p class="label">Idee</p></div>
      </div>
    </section>

    <section class="stack" style="margin-top:14px">
      <div class="row"><h2>Lavori</h2><button class="primary-btn" data-add-room-task>+ Lavoro</button></div>
      ${tasks.length ? tasks.map(task => CasaApp.components.taskCard(task, { showDelete: true })).join('') : '<div class="empty">Nessun lavoro per questa stanza.</div>'}
    </section>

    <section class="stack" style="margin-top:16px">
      <div class="row"><h2>Idee</h2><button class="primary-btn" data-add-room-idea>+ Idea</button></div>
      ${ideas.length ? ideas.map(idea => CasaApp.components.ideaCard(idea, { showDelete: true })).join('') : '<div class="empty">Nessuna idea per questa stanza.</div>'}
    </section>
  `;

  document.querySelector('[data-back-home]')?.addEventListener('click', () => CasaApp.state.navigate('home'));
  root.querySelector('[data-add-room-task]')?.addEventListener('click', () => CasaApp.components.openTaskModal(null, room.id));
  root.querySelector('[data-add-room-idea]')?.addEventListener('click', () => CasaApp.components.openIdeaModal(null, room.id));
  CasaApp.components.bindTaskActions(root);
  CasaApp.components.bindIdeaActions(root);
};
