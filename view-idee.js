window.CasaApp = window.CasaApp || {};
CasaApp.views = CasaApp.views || {};

CasaApp.views.idee = function renderIdee(root) {
  const data = CasaApp.state.getData();
  const ideas = [...data.ideas].sort((a, b) => String(a.title).localeCompare(String(b.title)));
  CasaApp.components.setHeader('IDEE', 'Progetti futuri', '<button class="icon-btn" data-add-idea>＋</button>');

  root.innerHTML = `
    <section class="stack">
      ${ideas.length ? ideas.map(idea => CasaApp.components.ideaCard(idea, { showDelete: true })).join('') : '<div class="empty">Nessuna idea presente.</div>'}
    </section>
  `;

  document.querySelector('[data-add-idea]')?.addEventListener('click', () => CasaApp.components.openIdeaModal());
  CasaApp.components.bindIdeaActions(root);
};
