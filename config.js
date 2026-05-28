window.CasaApp = window.CasaApp || {};

CasaApp.CONFIG = {
  STORAGE_KEY: 'casa-app-v1-data',
  VERSION: '1.3.0'
};

CasaApp.utils = {
  $(selector, root = document) {
    return root.querySelector(selector);
  },
  $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  },
  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;'
    }[char]));
  },
  id(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  },
  labelPriority(value) {
    return ({ alta: 'Alta', media: 'Media', bassa: 'Bassa' }[value] || value || 'Media');
  },
  labelStatus(value) {
    return ({ da_fare: 'Da fare', in_corso: 'In corso', in_attesa: 'In attesa', fatto: 'Fatto' }[value] || value || 'Da fare');
  },
  labelIdeaStatus(value) {
    return ({ bozza: 'Bozza', da_valutare: 'Da valutare', approvata: 'Approvata', archiviata: 'Archiviata' }[value] || value || 'Bozza');
  },
  sortByOrder(a, b) {
    return (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name || '').localeCompare(String(b.name || ''));
  },
  todayIso() {
    return new Date().toISOString();
  },
  downloadText(filename, text) {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};

CasaApp.model = {
  makeTask(roomId, title, priority = 'media', status = 'da_fare', description = '') {
    const now = CasaApp.utils.todayIso();
    return {
      id: CasaApp.utils.id('task'),
      roomId,
      title,
      description,
      priority,
      status,
      estimatedTime: '',
      dueDate: '',
      materials: [],
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'fatto' ? now : null
    };
  },
  makeIdea(roomId, title, status = 'bozza', description = '') {
    const now = CasaApp.utils.todayIso();
    return {
      id: CasaApp.utils.id('idea'),
      roomId,
      title,
      description,
      status,
      budget: '',
      createdAt: now,
      updatedAt: now
    };
  },
  createEmptyData() {
    const now = CasaApp.utils.todayIso();
    return {
      version: CasaApp.CONFIG.VERSION,
      settings: { theme: 'dark', accentColor: '#218bff', compactMode: false },
      house: { floors: [], rooms: [] },
      tasks: [],
      ideas: [],
      createdAt: now,
      updatedAt: now
    };
  },
  normalizeData(input) {
    const base = this.createEmptyData();
    const source = input && typeof input === 'object' ? input : {};
    return {
      ...base,
      ...source,
      version: source.version || CasaApp.CONFIG.VERSION,
      settings: { ...base.settings, ...(source.settings || {}) },
      house: {
        floors: Array.isArray(source?.house?.floors) ? source.house.floors : [],
        rooms: Array.isArray(source?.house?.rooms) ? source.house.rooms : []
      },
      tasks: Array.isArray(source.tasks) ? source.tasks : [],
      ideas: Array.isArray(source.ideas) ? source.ideas : [],
      updatedAt: source.updatedAt || base.updatedAt,
      createdAt: source.createdAt || base.createdAt
    };
  }
};
