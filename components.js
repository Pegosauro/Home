window.CasaApp = window.CasaApp || {};

CasaApp.components = {
  renderNav(active) {
    const items = [
      { view: 'home', label: 'Home', icon: '⌂' },
      { view: 'lavori', label: 'Lavori', icon: '🔧' },
      { view: 'idee', label: 'Idee', icon: '💡' },
      { view: 'opzioni', label: 'Opzioni', icon: '⚙️' }
    ];
    document.getElementById('bottomNav').innerHTML = items.map(item => `
      <button class="nav-item ${item.view === active ? 'active' : ''}" data-nav="${item.view}">
        <span class="ico">${item.icon}</span>
        <span>${item.label}</span>
      </button>
    `).join('');
    CasaApp.utils.$$('[data-nav]').forEach(button => {
      button.addEventListener('click', () => CasaApp.state.navigate(button.dataset.nav));
    });
  },

  setHeader(title, eyebrow, actionsHtml = '') {
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('eyebrow').textContent = eyebrow;
    document.getElementById('headerActions').innerHTML = actionsHtml;
  },

  openModal(title, contentHtml, onSubmit, submitLabel = 'Salva') {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-label="${CasaApp.utils.escapeHtml(title)}">
        <div class="modal-head">
          <h2>${CasaApp.utils.escapeHtml(title)}</h2>
          <button class="icon-btn" data-close-modal>×</button>
        </div>
        <form class="form-grid" data-modal-form>
          ${contentHtml}
          <div class="modal-foot">
            <button type="button" class="ghost-btn" data-close-modal>Annulla</button>
            <button type="submit" class="primary-btn">${CasaApp.utils.escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </section>
    `;
    root.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => this.closeModal()));
    root.querySelector('[data-modal-form]').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form).entries());
      onSubmit(values);
      this.closeModal();
    });
  },

  openPanel(title, contentHtml) {
    const root = document.getElementById('modalRoot');
    root.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-label="${CasaApp.utils.escapeHtml(title)}">
        <div class="modal-head">
          <h2>${CasaApp.utils.escapeHtml(title)}</h2>
          <button class="icon-btn" data-close-modal>×</button>
        </div>
        ${contentHtml}
      </section>
    `;
    root.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => this.closeModal()));
    return root;
  },

  closeModal() {
    document.getElementById('modalRoot').innerHTML = '';
  },

  ensureRoomAvailable() {
    const data = CasaApp.state.getData();
    if (data.house.floors.length && data.house.rooms.length) return true;
    alert('Crea prima almeno un piano e una stanza.');
    CasaApp.state.navigate('opzioni');
    return false;
  },

  roomOptions(selectedId = '') {
    const { escapeHtml, sortByOrder } = CasaApp.utils;
    const data = CasaApp.state.getData();
    return [...data.house.rooms].sort(sortByOrder).map(room => {
      const floor = CasaApp.state.floorById(room.floorId);
      return `<option value="${room.id}" ${room.id === selectedId ? 'selected' : ''}>${escapeHtml(room.name)} · ${escapeHtml(floor?.name || '')}</option>`;
    }).join('');
  },

  floorOptions(selectedId = '') {
    const { escapeHtml, sortByOrder } = CasaApp.utils;
    const data = CasaApp.state.getData();
    return [...data.house.floors].sort(sortByOrder).map(floor => `<option value="${floor.id}" ${floor.id === selectedId ? 'selected' : ''}>${escapeHtml(floor.name)}</option>`).join('');
  },

  taskCard(task, options = {}) {
    const { escapeHtml, labelPriority, labelStatus } = CasaApp.utils;
    const room = CasaApp.state.roomById(task.roomId);
    const floor = room ? CasaApp.state.floorById(room.floorId) : null;
    const status = labelStatus(task.status);
    return `
      <article class="item-card" data-task-id="${task.id}">
        <div class="item-icon">${room?.icon || '🔧'}</div>
        <div class="item-main">
          <h3>${escapeHtml(task.title)}</h3>
          <p class="item-meta">${escapeHtml(room?.name || 'Senza stanza')} · ${escapeHtml(floor?.name || '')}</p>
          <span class="badge ${task.priority || 'media'}">${labelPriority(task.priority)}</span>
        </div>
        <div class="item-actions">
          <span class="item-status">${escapeHtml(status)}</span>
          <button class="ghost-btn" data-edit-task="${task.id}">Modifica</button>
          ${options.showDelete ? `<button class="danger-btn" data-delete-task="${task.id}">Elimina</button>` : ''}
        </div>
      </article>
    `;
  },

  ideaCard(idea, options = {}) {
    const { escapeHtml, labelIdeaStatus } = CasaApp.utils;
    const room = CasaApp.state.roomById(idea.roomId);
    const floor = room ? CasaApp.state.floorById(room.floorId) : null;
    return `
      <article class="item-card" data-idea-id="${idea.id}">
        <div class="item-icon">💡</div>
        <div class="item-main">
          <h3>${escapeHtml(idea.title)}</h3>
          <p class="item-meta">${escapeHtml(room?.name || 'Senza stanza')} · ${escapeHtml(floor?.name || '')}</p>
          <span class="badge info">${labelIdeaStatus(idea.status)}</span>
          ${idea.description ? `<p class="small" style="margin-top:6px">${escapeHtml(idea.description)}</p>` : ''}
        </div>
        <div class="item-actions">
          <button class="ghost-btn" data-edit-idea="${idea.id}">Modifica</button>
          ${options.showDelete ? `<button class="danger-btn" data-delete-idea="${idea.id}">Elimina</button>` : ''}
        </div>
      </article>
    `;
  },

  bindTaskActions(root) {
    root.querySelectorAll('[data-edit-task]').forEach(btn => btn.addEventListener('click', () => this.openTaskModal(btn.dataset.editTask)));
    root.querySelectorAll('[data-delete-task]').forEach(btn => btn.addEventListener('click', () => this.deleteTask(btn.dataset.deleteTask)));
  },

  bindIdeaActions(root) {
    root.querySelectorAll('[data-edit-idea]').forEach(btn => btn.addEventListener('click', () => this.openIdeaModal(btn.dataset.editIdea)));
    root.querySelectorAll('[data-delete-idea]').forEach(btn => btn.addEventListener('click', () => this.deleteIdea(btn.dataset.deleteIdea)));
  },

  openTaskModal(taskId = null, forcedRoomId = null) {
    if (!this.ensureRoomAvailable()) return;
    const data = CasaApp.state.getData();
    const task = taskId ? data.tasks.find(item => item.id === taskId) : null;
    const roomId = forcedRoomId || task?.roomId || data.house.rooms[0]?.id || '';
    const html = `
      <div class="field"><label>Titolo</label><input name="title" required value="${CasaApp.utils.escapeHtml(task?.title || '')}"></div>
      <div class="field"><label>Stanza</label><select name="roomId" required>${this.roomOptions(roomId)}</select></div>
      <div class="grid-2">
        <div class="field"><label>Priorità</label><select name="priority"><option value="alta" ${task?.priority === 'alta' ? 'selected' : ''}>Alta</option><option value="media" ${!task || task.priority === 'media' ? 'selected' : ''}>Media</option><option value="bassa" ${task?.priority === 'bassa' ? 'selected' : ''}>Bassa</option></select></div>
        <div class="field"><label>Stato</label><select name="status"><option value="da_fare" ${!task || task.status === 'da_fare' ? 'selected' : ''}>Da fare</option><option value="in_corso" ${task?.status === 'in_corso' ? 'selected' : ''}>In corso</option><option value="in_attesa" ${task?.status === 'in_attesa' ? 'selected' : ''}>In attesa</option><option value="fatto" ${task?.status === 'fatto' ? 'selected' : ''}>Fatto</option></select></div>
      </div>
      <div class="field"><label>Note</label><textarea name="description">${CasaApp.utils.escapeHtml(task?.description || '')}</textarea></div>
    `;
    this.openModal(task ? 'Modifica lavoro' : 'Nuovo lavoro', html, values => {
      CasaApp.state.update(draft => {
        if (task) {
          const item = draft.tasks.find(row => row.id === task.id);
          Object.assign(item, values, { updatedAt: CasaApp.utils.todayIso(), completedAt: values.status === 'fatto' ? (item.completedAt || CasaApp.utils.todayIso()) : null });
        } else {
          draft.tasks.push(CasaApp.model.makeTask(values.roomId, values.title, values.priority, values.status, values.description));
        }
      });
    });
  },

  openIdeaModal(ideaId = null, forcedRoomId = null) {
    if (!this.ensureRoomAvailable()) return;
    const data = CasaApp.state.getData();
    const idea = ideaId ? data.ideas.find(item => item.id === ideaId) : null;
    const roomId = forcedRoomId || idea?.roomId || data.house.rooms[0]?.id || '';
    const html = `
      <div class="field"><label>Titolo</label><input name="title" required value="${CasaApp.utils.escapeHtml(idea?.title || '')}"></div>
      <div class="field"><label>Stanza</label><select name="roomId" required>${this.roomOptions(roomId)}</select></div>
      <div class="field"><label>Stato idea</label><select name="status"><option value="bozza" ${!idea || idea.status === 'bozza' ? 'selected' : ''}>Bozza</option><option value="da_valutare" ${idea?.status === 'da_valutare' ? 'selected' : ''}>Da valutare</option><option value="approvata" ${idea?.status === 'approvata' ? 'selected' : ''}>Approvata</option><option value="archiviata" ${idea?.status === 'archiviata' ? 'selected' : ''}>Archiviata</option></select></div>
      <div class="field"><label>Note</label><textarea name="description">${CasaApp.utils.escapeHtml(idea?.description || '')}</textarea></div>
    `;
    this.openModal(idea ? 'Modifica idea' : 'Nuova idea', html, values => {
      CasaApp.state.update(draft => {
        if (idea) {
          const item = draft.ideas.find(row => row.id === idea.id);
          Object.assign(item, values, { updatedAt: CasaApp.utils.todayIso() });
        } else {
          draft.ideas.push(CasaApp.model.makeIdea(values.roomId, values.title, values.status, values.description));
        }
      });
    });
  },

  deleteTask(taskId) {
    if (!confirm('Eliminare questo lavoro?')) return;
    CasaApp.state.update(draft => {
      draft.tasks = draft.tasks.filter(task => task.id !== taskId);
    });
  },

  deleteIdea(ideaId) {
    if (!confirm('Eliminare questa idea?')) return;
    CasaApp.state.update(draft => {
      draft.ideas = draft.ideas.filter(idea => idea.id !== ideaId);
    });
  },

  openFloorModal(floorId = null) {
    const data = CasaApp.state.getData();
    const floor = floorId ? data.house.floors.find(item => item.id === floorId) : null;
    const nextOrder = data.house.floors.length + 1;
    const html = `
      <div class="field"><label>Nome piano</label><input name="name" required placeholder="Es. Piano Terra" value="${CasaApp.utils.escapeHtml(floor?.name || '')}"></div>
      <div class="field"><label>Ordine</label><input name="order" type="number" value="${CasaApp.utils.escapeHtml(floor?.order ?? nextOrder)}"></div>
    `;
    this.openModal(floor ? 'Modifica piano' : 'Nuovo piano', html, values => {
      CasaApp.state.update(draft => {
        if (floor) {
          const item = draft.house.floors.find(row => row.id === floor.id);
          Object.assign(item, { name: values.name, order: Number(values.order || 0) });
        } else {
          draft.house.floors.push({ id: CasaApp.utils.id('floor'), name: values.name, order: Number(values.order || nextOrder) });
        }
      });
    });
  },

  openRoomModal(roomId = null, forcedFloorId = null) {
    const data = CasaApp.state.getData();
    if (!data.house.floors.length) {
      alert('Crea prima almeno un piano.');
      this.openFloorModal();
      return;
    }
    const room = roomId ? data.house.rooms.find(item => item.id === roomId) : null;
    const floorId = forcedFloorId || room?.floorId || data.house.floors[0]?.id || '';
    const nextOrder = data.house.rooms.filter(item => item.floorId === floorId).length + 1;
    const html = `
      <div class="field"><label>Nome stanza</label><input name="name" required placeholder="Es. Cucina" value="${CasaApp.utils.escapeHtml(room?.name || '')}"></div>
      <div class="field"><label>Piano</label><select name="floorId" required>${this.floorOptions(floorId)}</select></div>
      <div class="grid-2">
        <div class="field"><label>Icona</label><input name="icon" value="${CasaApp.utils.escapeHtml(room?.icon || '🏠')}"></div>
        <div class="field"><label>Ordine</label><input name="order" type="number" value="${CasaApp.utils.escapeHtml(room?.order ?? nextOrder)}"></div>
      </div>
    `;
    this.openModal(room ? 'Modifica stanza' : 'Nuova stanza', html, values => {
      CasaApp.state.update(draft => {
        if (room) {
          const item = draft.house.rooms.find(row => row.id === room.id);
          Object.assign(item, {
            floorId: values.floorId,
            name: values.name,
            icon: values.icon || '🏠',
            order: Number(values.order || 0)
          });
        } else {
          draft.house.rooms.push({
            id: CasaApp.utils.id('room'),
            floorId: values.floorId,
            name: values.name,
            icon: values.icon || '🏠',
            color: '#218bff',
            order: Number(values.order || nextOrder),
            notes: ''
          });
        }
      });
    });
  },

  deleteFloor(floorId) {
    const data = CasaApp.state.getData();
    const floor = data.house.floors.find(item => item.id === floorId);
    if (!floor) return;
    const roomIds = data.house.rooms.filter(room => room.floorId === floorId).map(room => room.id);
    const message = roomIds.length
      ? `Eliminare "${floor.name}"? Verranno eliminate anche ${roomIds.length} stanze con lavori e idee collegati.`
      : `Eliminare il piano "${floor.name}"?`;
    if (!confirm(message)) return;
    CasaApp.state.update(draft => {
      draft.house.floors = draft.house.floors.filter(item => item.id !== floorId);
      draft.house.rooms = draft.house.rooms.filter(room => room.floorId !== floorId);
      draft.tasks = draft.tasks.filter(task => !roomIds.includes(task.roomId));
      draft.ideas = draft.ideas.filter(idea => !roomIds.includes(idea.roomId));
    });
    if (!CasaApp.state.needsSetup()) this.openManageFloorsModal();
  },

  deleteRoom(roomId) {
    const data = CasaApp.state.getData();
    const room = data.house.rooms.find(item => item.id === roomId);
    if (!room) return;
    if (!confirm(`Eliminare la stanza "${room.name}"? Verranno eliminati anche lavori e idee collegati.`)) return;
    CasaApp.state.update(draft => {
      draft.house.rooms = draft.house.rooms.filter(item => item.id !== roomId);
      draft.tasks = draft.tasks.filter(task => task.roomId !== roomId);
      draft.ideas = draft.ideas.filter(idea => idea.roomId !== roomId);
    });
    if (!CasaApp.state.needsSetup()) this.openManageRoomsModal();
  },

  openManageFloorsModal() {
    const data = CasaApp.state.getData();
    const { escapeHtml, sortByOrder } = CasaApp.utils;
    const content = `
      <div class="stack manage-list">
        <button class="primary-btn" data-add-floor-modal>+ Aggiungi piano</button>
        ${[...data.house.floors].sort(sortByOrder).map(floor => {
          const count = data.house.rooms.filter(room => room.floorId === floor.id).length;
          return `
            <article class="manage-row">
              <div><strong>${escapeHtml(floor.name)}</strong><br><span class="small">Ordine ${escapeHtml(floor.order ?? 0)} · ${count} stanze</span></div>
              <div class="manage-actions">
                <button class="ghost-btn" data-edit-floor="${floor.id}">Modifica</button>
                <button class="danger-btn" data-delete-floor="${floor.id}">Elimina</button>
              </div>
            </article>
          `;
        }).join('') || '<div class="empty">Nessun piano presente.</div>'}
      </div>
    `;
    const root = this.openPanel('Gestione piani', content);
    root.querySelector('[data-add-floor-modal]')?.addEventListener('click', () => this.openFloorModal());
    root.querySelectorAll('[data-edit-floor]').forEach(btn => btn.addEventListener('click', () => this.openFloorModal(btn.dataset.editFloor)));
    root.querySelectorAll('[data-delete-floor]').forEach(btn => btn.addEventListener('click', () => this.deleteFloor(btn.dataset.deleteFloor)));
  },

  openManageRoomsModal() {
    const data = CasaApp.state.getData();
    const { escapeHtml, sortByOrder } = CasaApp.utils;
    const rooms = [...data.house.rooms].sort((a, b) => {
      const fa = CasaApp.state.floorById(a.floorId);
      const fb = CasaApp.state.floorById(b.floorId);
      return sortByOrder(fa || {}, fb || {}) || sortByOrder(a, b);
    });
    const content = `
      <div class="stack manage-list">
        <button class="primary-btn" data-add-room-modal>+ Aggiungi stanza</button>
        ${rooms.map(room => {
          const floor = CasaApp.state.floorById(room.floorId);
          const tasks = data.tasks.filter(task => task.roomId === room.id).length;
          const ideas = data.ideas.filter(idea => idea.roomId === room.id).length;
          return `
            <article class="manage-row">
              <div><strong>${escapeHtml(room.icon || '🏠')} ${escapeHtml(room.name)}</strong><br><span class="small">${escapeHtml(floor?.name || 'Senza piano')} · Ordine ${escapeHtml(room.order ?? 0)} · ${tasks} lavori · ${ideas} idee</span></div>
              <div class="manage-actions">
                <button class="ghost-btn" data-edit-room="${room.id}">Modifica</button>
                <button class="danger-btn" data-delete-room="${room.id}">Elimina</button>
              </div>
            </article>
          `;
        }).join('') || '<div class="empty">Nessuna stanza presente.</div>'}
      </div>
    `;
    const root = this.openPanel('Gestione stanze', content);
    root.querySelector('[data-add-room-modal]')?.addEventListener('click', () => this.openRoomModal());
    root.querySelectorAll('[data-edit-room]').forEach(btn => btn.addEventListener('click', () => this.openRoomModal(btn.dataset.editRoom)));
    root.querySelectorAll('[data-delete-room]').forEach(btn => btn.addEventListener('click', () => this.deleteRoom(btn.dataset.deleteRoom)));
  }
};
