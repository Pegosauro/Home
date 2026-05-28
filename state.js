window.CasaApp = window.CasaApp || {};

CasaApp.state = {
  data: null,
  route: { view: 'home', params: {} },
  taskFilter: 'tutti',
  listeners: [],
  init() {
    this.data = CasaApp.storage.load();
    this.applyTheme();
  },
  getData() {
    return this.data;
  },
  setData(nextData) {
    this.data = CasaApp.model.normalizeData(nextData);
    CasaApp.storage.save(this.data);
    this.applyTheme();
    this.emit();
  },
  update(mutator) {
    const draft = structuredClone ? structuredClone(this.data) : JSON.parse(JSON.stringify(this.data));
    mutator(draft);
    draft.updatedAt = CasaApp.utils.todayIso();
    this.setData(draft);
  },
  subscribe(listener) {
    this.listeners.push(listener);
  },
  emit() {
    this.listeners.forEach(listener => listener());
  },
  navigate(view, params = {}) {
    this.route = { view, params };
    window.location.hash = params.id ? `${view}/${params.id}` : view;
    this.emit();
  },
  readHash() {
    const raw = window.location.hash.replace(/^#/, '').trim();
    if (!raw) return { view: 'home', params: {} };
    const [view, id] = raw.split('/');
    return { view: view || 'home', params: id ? { id } : {} };
  },
  syncRouteFromHash() {
    this.route = this.readHash();
    this.emit();
  },
  applyTheme() {
    const theme = this.data?.settings?.theme || 'dark';
    document.documentElement.dataset.theme = theme;
    document.body.classList.toggle('theme-light', theme === 'light');
  },
  roomById(id) {
    return this.data.house.rooms.find(room => room.id === id);
  },
  floorById(id) {
    return this.data.house.floors.find(floor => floor.id === id);
  },
  needsSetup() {
    const floors = this.data?.house?.floors || [];
    const rooms = this.data?.house?.rooms || [];
    return floors.length === 0 || rooms.length === 0;
  }
};
