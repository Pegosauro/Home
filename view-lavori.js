window.CasaApp = window.CasaApp || {};
CasaApp.views = CasaApp.views || {};

CasaApp.views.lavori = function renderLavori(root) {
  const data = CasaApp.state.getData();
  const filter = CasaApp.state.taskFilter || 'tutti';
  const tasks = [...data.tasks].filter(task => filter === 'tutti' || task.priority === filter);
  const order = { alta: 1, media: 2, bassa: 3 };
  tasks.sort((a, b) => (order[a.priority] || 9) - (order[b.priority] || 9) || String(a.title).localeCompare(String(b.title)));

  CasaApp.components.setHeader('LAVORI', 'Operatività', '<button class="icon-btn" data-add-task>＋</button>');

  root.innerHTML = `
    <div class="filter-bar">
      ${filterButton('tutti', 'Tutti', filter)}
      ${filterButton('alta', 'Alta', filter)}
      ${filterButton('media', 'Media', filter)}
      ${filterButton('bassa', 'Bassa', filter)}
    </div>
    <section class="stack">
      ${tasks.length ? tasks.map(task => CasaApp.components.taskCard(task, { showDelete: true })).join('') : '<div class="empty">Nessun lavoro presente.</div>'}
    </section>
  `;

  document.querySelector('[data-add-task]')?.addEventListener('click', () => CasaApp.components.openTaskModal());
  root.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    CasaApp.state.taskFilter = button.dataset.filter;
    CasaApp.state.emit();
  }));
  CasaApp.components.bindTaskActions(root);
};

function filterButton(value, label, active) {
  return `<button class="chip ${active === value ? 'active' : ''}" data-filter="${value}">${label}</button>`;
}
