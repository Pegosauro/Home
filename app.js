/* ============================================================
   HOME APP — app.js
   JavaScript vanilla, nessun import/export, nessuna libreria.
   Gestione click centralizzata (event delegation) per Safari iPhone.
   ============================================================ */
(function () {
  "use strict";

  /* ==========================================================
     CONFIG
     ========================================================== */
  var CONFIG = {
    STORAGE_KEY: "casa-app-v2-data",
    VERSION: "2.9.2",
    DEFAULT_ACCENT: "#218bff",
    ACCENTS: ["#218bff", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#f97316", "#22c55e", "#14b8a6"],
    ROOM_COLORS: ["#218bff", "#38c172", "#f5a623", "#ff5a5f", "#a855f7", "#06b6d4", "#ec4899", "#f97316", "#64748b", "#ef4444"],
    // Categorie "Dove comprare" per la lista spesa
    SHOP_CATEGORIES: [
      { k: "ferramenta", l: "Ferramenta" },
      { k: "arredamento", l: "Arredamento" },
      { k: "supermercato", l: "Supermercato" },
      { k: "giardinaggio", l: "Giardinaggio" },
      { k: "elettricita", l: "Elettricità/Illum." },
      { k: "idraulica", l: "Idraulica" },
      { k: "colori", l: "Colori/Vernici" },
      { k: "online", l: "Online" },
      { k: "altro", l: "Altro" }
    ],
    // ----- Backup su Google Drive (OAuth implicit, redirect, nessuna libreria) -----
    GDRIVE: {
      // ⬇️ INCOLLA QUI, UNA VOLTA SOLA, il tuo OAuth Client ID
      //    (es. "12345-abc.apps.googleusercontent.com").
      //    NON è un segreto e NON è per-utente: identifica l'app. Ogni utente
      //    (tu, amici, parenti) preme "Collega Google Drive" e fa login col
      //    PROPRIO account → il backup va sul SUO Drive. Finché è vuoto, la
      //    sezione "Backup cloud" resta disattivata.
      CLIENT_ID: "459414540865-uujs8bir389qendgpoud8nsqp74uo374.apps.googleusercontent.com",
      // drive.file = scope NON sensibile: l'app vede/gestisce SOLO i file che
      // crea lei (il backup), non il resto del Drive. Permette di pubblicare
      // l'app "in produzione" senza verifica Google → login aperto a chiunque.
      SCOPE: "https://www.googleapis.com/auth/drive.file",
      FILE_NAME: "casa-app-backup.json",
      AUTO_DEBOUNCE_MS: 6000
    }
  };
  function shopCatLabel(k) {
    for (var i = 0; i < CONFIG.SHOP_CATEGORIES.length; i++) if (CONFIG.SHOP_CATEGORIES[i].k === k) return CONFIG.SHOP_CATEGORIES[i].l;
    return "";
  }
  function isShopCat(k) { return !!shopCatLabel(k); }

  var PRIO_LABEL = { alta: "Alta", media: "Media", bassa: "Bassa" };
  var PRIO_RANK = { alta: 0, media: 1, bassa: 2 };
  var STATUS_LABEL = { da_fare: "Da fare", in_corso: "In corso", in_attesa: "In attesa", fatto: "Fatto" };
  var IDEA_LABEL = { bozza: "Bozza", wip: "WIP", realizzato: "Realizzato" };
  var IDEA_RANK = { wip: 0, bozza: 1, realizzato: 2 };
  // Migrazione dal vecchio schema a 4 stati: i progetti salvati prima passano
  // al nuovo modello (Bozza / WIP / Realizzato) al caricamento.
  var IDEA_STATUS_MIGRATE = {
    bozza: "bozza", da_valutare: "bozza", approvata: "wip", archiviata: "realizzato",
    wip: "wip", realizzato: "realizzato"
  };

  // Modalità di ordinamento (chiave + etichetta). "manuale" sblocca il drag&drop.
  var TASK_SORTS = [
    ["manuale", "Manuale"],
    ["scadenza", "Scadenza"],
    ["priorita", "Priorità"],
    ["stanza", "Stanza"],
    ["recenti", "Aggiunti di recente"]
  ];
  var IDEA_SORTS = [
    ["manuale", "Manuale"],
    ["stato", "Stato"],
    ["costo", "Costo"],
    ["recenti", "Aggiunti di recente"]
  ];
  // Sotto-sezioni della pagina Opzioni (menu ad albero). Chiave = #opzioni/<chiave>.
  var OPT_SECTIONS = { aspetto: "Aspetto", backup: "Backup e dati", diagnostica: "Diagnostica" };

  function sortLabel(sorts, key) {
    for (var i = 0; i < sorts.length; i++) if (sorts[i][0] === key) return sorts[i][1];
    return sorts[0][1];
  }
  function hasSort(sorts, key) {
    for (var i = 0; i < sorts.length; i++) if (sorts[i][0] === key) return true;
    return false;
  }

  // Icone SVG inline (inner markup, viewBox 0 0 24 24)
  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
    tasks: '<path d="M4 6.5 5.5 8 8 5"/><path d="M4 12.5 5.5 14 8 11"/><path d="M4 18.5 5.5 20 8 17"/><path d="M11 6h9"/><path d="M11 12h9"/><path d="M11 18h9"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.8 10.7c.5.4.8 1 .8 1.6V16h6v-.7c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/>',
    settings: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    x: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5 11 15l4.5-5"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="M5 5l1.4 1.4"/><path d="M17.6 17.6 19 19"/><path d="M19 5l-1.4 1.4"/><path d="M6.4 17.6 5 19"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.6 0-.4-.2-.8-.5-1-.3-.3-.4-.6-.4-1 0-.8.6-1.4 1.4-1.4H16a5 5 0 0 0 5-5c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="10.5" r="1.1"/><circle cx="12" cy="7.5" r="1.1"/><circle cx="16.5" cy="10.5" r="1.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    key: '<circle cx="7.5" cy="15.5" r="4"/><path d="M10.3 12.7 21 2"/><path d="M16.5 6.5l3 3"/><path d="M14.5 8.5l2 2"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    pin: '<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 4v4h-4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.3 11.4a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 7H6"/>',
    listcheck: '<path d="M11 6h10"/><path d="M11 12h10"/><path d="M11 18h10"/><path d="M3 6.5 4.2 7.7 6.5 5"/><path d="M3 12.5 4.2 13.7 6.5 11"/><path d="M3 18.5 4.2 19.7 6.5 17"/>',
    extlink: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    grip: '<path d="M8 7h8"/><path d="M8 12h8"/><path d="M8 17h8"/>',
    sort: '<path d="M7 4v16"/><path d="M4 8l3-4 3 4"/><path d="M17 20V4"/><path d="M14 16l3 4 3-4"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v3"/><path d="M16 3v3"/>',
    bag: '<path d="M6 8h12l-.8 11.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.9-2.5 2s1.1 2 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2c-1 0-2-.4-2.5-1.2"/><path d="M12 6.5v11"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 9.5a3.5 3.5 0 0 1-.5 8.5z"/>',
    cloudUp: '<path d="M7.5 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.5 9.5a3.5 3.5 0 0 1 .2 7"/><path d="M12 21v-7"/><path d="M9 16l3-3 3 3"/>',
    // Icone stanze
    door: '<path d="M5 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M13 12h.01"/>',
    living: '<path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/><path d="M3 14a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3z"/><path d="M6 20v1"/><path d="M18 20v1"/>',
    bed: '<path d="M2 9v10"/><path d="M2 13h18a2 2 0 0 1 2 2v4"/><path d="M6 13V9a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v4"/>',
    kitchen: '<path d="M7 3v8"/><path d="M5 3v3a2 2 0 0 0 2 2"/><path d="M9 3v3a2 2 0 0 1-2 2"/><path d="M7 11v10"/><path d="M17 3c-1.7 0-3 2-3 4.5S15.3 11 17 11"/><path d="M17 3v18"/>',
    bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M6 12V6a2 2 0 0 1 4 0"/><path d="M8 19l-1 2"/><path d="M17 19l1 2"/>',
    work: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8"/><path d="M12 16v4"/>',
    wardrobe: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M12 3v18"/><path d="M10 11h.01"/><path d="M14 11h.01"/>',
    garage: '<path d="M3 13l1.7-5a2 2 0 0 1 1.9-1.3h10.8a2 2 0 0 1 1.9 1.3L21 13v5h-2v-2H5v2H3z"/><circle cx="7.5" cy="15.5" r="1.1"/><circle cx="16.5" cy="15.5" r="1.1"/>',
    storage: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
    plant: '<path d="M12 22V11"/><path d="M12 13c0-3 2.2-5 5.5-5 0 3.3-2.2 5-5.5 5z"/><path d="M12 16c0-3-2.2-5-5.5-5 0 3.3 2.2 5 5.5 5z"/>',
    laundry: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="14" r="3.6"/><path d="M8 6.5h.01"/><path d="M11 6.5h.01"/>',
    stairs: '<path d="M4 20h4v-4h4v-4h4V8h4"/>'
  };

  var ROOM_ICON_KEYS = ["living", "bed", "kitchen", "bath", "work", "wardrobe", "garage", "storage", "plant", "laundry", "stairs", "door"];

  /* ==========================================================
     STATE
     ========================================================== */
  var state = {
    data: null,            // dati applicativi (vedi DATA MODEL)
    filterPrio: "tutti",   // filtro corrente sezione LAVORI
    currentTaskId: null,   // lavoro aperto nella pagina dettaglio
    currentIdeaId: null,   // idea aperta nella pagina dettaglio
    manageFloorId: null,   // piano in gestione (drill-down stanze in Opzioni)
    doneOpen: false,       // sezione "Completati" (Lavori) espansa
    archOpen: false,       // sezione "Realizzati" (Progetti) espansa
    boughtOpen: false      // sezione "Presi" (Spesa) espansa
  };

  var pendingConfirm = null; // callback conferma azione distruttiva
  var pendingCancel = null;
  var segSuppressUntil = 0;  // ignora il click sintetico dopo un drag della barra filtri

  // Riferimenti DOM principali
  var elHeader, elView, elNav, elToast, elModal;

  /* ==========================================================
     STORAGE
     ========================================================== */
  function loadData() {
    try {
      var raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object" || !obj.house) return null;
      return normalizeData(obj);
    } catch (e) {
      return null;
    }
  }

  function persist() {
    if (!state.data) return;
    state.data.updatedAt = nowISO();
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.data));
    } catch (e) {
      toast("Spazio di salvataggio pieno", "error");
    }
    gdScheduleAuto(); // backup cloud automatico (se collegato e attivo)
  }

  /* ==========================================================
     DATA MODEL
     ========================================================== */
  function createDefaultData() {
    var iso = nowISO();
    return {
      version: CONFIG.VERSION,
      settings: { theme: "dark", accentColor: CONFIG.DEFAULT_ACCENT, compactMode: false, taskSort: "priorita", ideaSort: "recenti" },
      house: { floors: [], rooms: [] },
      tasks: [],
      ideas: [],
      shopping: [],
      createdAt: iso,
      updatedAt: iso
    };
  }

  // Garantisce che un oggetto importato/caricato abbia tutti i campi
  function normalizeData(obj) {
    var d = createDefaultData();
    // d.version resta CONFIG.VERSION: normalizziamo sempre allo schema corrente.
    if (obj.settings && typeof obj.settings === "object") {
      d.settings.theme = obj.settings.theme === "light" ? "light" : "dark";
      d.settings.accentColor = isHex(obj.settings.accentColor) ? obj.settings.accentColor : CONFIG.DEFAULT_ACCENT;
      d.settings.compactMode = !!obj.settings.compactMode;
      if (hasSort(TASK_SORTS, obj.settings.taskSort)) d.settings.taskSort = obj.settings.taskSort;
      if (hasSort(IDEA_SORTS, obj.settings.ideaSort)) d.settings.ideaSort = obj.settings.ideaSort;
    }
    if (obj.house && typeof obj.house === "object") {
      d.house.floors = Array.isArray(obj.house.floors) ? obj.house.floors : [];
      d.house.rooms = Array.isArray(obj.house.rooms) ? obj.house.rooms : [];
    }
    // Insieme degli id stanza validi (per ripulire riferimenti pendenti)
    var validRoom = {};
    d.house.rooms.forEach(function (r) { if (r && r.id) validRoom[r.id] = true; });
    function migrateRoomIds(x) {
      // Migrazione: roomId (singolo) -> roomIds (array). Mantiene solo stanze esistenti.
      var ids = Array.isArray(x.roomIds) ? x.roomIds : (x.roomId ? [x.roomId] : []);
      var seen = {}, out = [];
      ids.forEach(function (id) { if (validRoom[id] && !seen[id]) { seen[id] = true; out.push(id); } });
      return out;
    }
    d.tasks = (Array.isArray(obj.tasks) ? obj.tasks : []).map(function (t, idx) {
      t.roomIds = migrateRoomIds(t);
      delete t.roomId;
      t.dueDate = typeof t.dueDate === "string" ? t.dueDate : "";
      t.checklist = Array.isArray(t.checklist) ? t.checklist : [];
      // order: posizione per l'ordinamento "Manuale". Se assente, usa l'indice
      // (così l'ordine attuale resta stabile finché non si trascina a mano).
      t.order = typeof t.order === "number" ? t.order : idx;
      return t;
    });
    d.ideas = (Array.isArray(obj.ideas) ? obj.ideas : []).map(function (i, idx) {
      i.roomIds = migrateRoomIds(i);
      delete i.roomId;
      i.checklist = Array.isArray(i.checklist) ? i.checklist : [];
      i.link = typeof i.link === "string" ? i.link : "";
      i.cost = typeof i.cost === "string" ? i.cost : (i.cost != null ? String(i.cost) : "");
      i.status = IDEA_STATUS_MIGRATE[i.status] || "bozza";
      i.order = typeof i.order === "number" ? i.order : idx;
      return i;
    });
    d.shopping = (Array.isArray(obj.shopping) ? obj.shopping : []).map(function (s) {
      // Migrazione: il vecchio campo roomId diventa un collegamento generico.
      var linkType = s.linkType || (s.roomId ? "room" : "");
      var linkId = s.linkId || (s.roomId || null);
      if (!linkId) linkType = "";
      return {
        id: s.id || uid("shop"), text: s.text || "", qty: s.qty || "",
        category: isShopCat(s.category) ? s.category : "",
        note: typeof s.note === "string" ? s.note : "",
        linkType: linkType, linkId: linkId,
        done: !!s.done, createdAt: s.createdAt || nowISO()
      };
    });
    d.createdAt = obj.createdAt || d.createdAt;
    d.updatedAt = obj.updatedAt || d.updatedAt;
    return d;
  }

  function createFloor(name) {
    return { id: uid("floor"), name: name, order: state.data.house.floors.length + 1 };
  }
  function createRoom(name, floorId, opts) {
    opts = opts || {};
    return {
      id: uid("room"),
      floorId: floorId,
      name: name,
      icon: opts.icon || "door",
      color: opts.color || CONFIG.DEFAULT_ACCENT,
      order: state.data.house.rooms.length + 1,
      notes: opts.notes || ""
    };
  }
  // Posizione "Manuale" per un nuovo elemento: in fondo alla lista esistente.
  function nextOrder(list) {
    var m = -1;
    (list || []).forEach(function (x) { if (typeof x.order === "number" && x.order > m) m = x.order; });
    return m + 1;
  }
  function createTask(d) {
    var iso = nowISO();
    return {
      id: uid("task"), roomIds: Array.isArray(d.roomIds) ? d.roomIds : [], title: d.title, description: d.description || "",
      priority: d.priority || "media", status: d.status || "da_fare",
      dueDate: d.dueDate || "",
      checklist: [], order: nextOrder(state.data && state.data.tasks),
      createdAt: iso, updatedAt: iso, completedAt: d.status === "fatto" ? iso : null
    };
  }
  function createCheckItem(text) {
    return { id: uid("chk"), text: text, done: false };
  }
  function createShopItem(d) {
    return {
      id: uid("shop"), text: d.text, qty: d.qty || "",
      category: d.category || "", note: d.note || "",
      linkType: d.linkType || "", linkId: d.linkId || null,
      done: false, createdAt: nowISO()
    };
  }
  function createIdea(d) {
    var iso = nowISO();
    return {
      id: uid("idea"), roomIds: Array.isArray(d.roomIds) ? d.roomIds : [], title: d.title, description: d.description || "",
      status: d.status || "bozza", link: d.link || "", cost: d.cost || "",
      checklist: [], order: nextOrder(state.data && state.data.ideas),
      createdAt: iso, updatedAt: iso
    };
  }

  // --- query helpers sul modello ---
  function floors() { return state.data.house.floors.slice().sort(byOrderName); }
  function rooms() { return state.data.house.rooms.slice().sort(byOrderName); }
  function roomsOf(floorId) { return rooms().filter(function (r) { return r.floorId === floorId; }); }
  function tasksOf(roomId) { return state.data.tasks.filter(function (t) { return (t.roomIds || []).indexOf(roomId) >= 0; }); }
  function ideasOf(roomId) { return state.data.ideas.filter(function (i) { return (i.roomIds || []).indexOf(roomId) >= 0; }); }
  function openTasksOf(roomId) { return tasksOf(roomId).filter(function (t) { return t.status !== "fatto"; }); }
  function findFloor(id) { return state.data.house.floors.filter(function (f) { return f.id === id; })[0]; }
  function findRoom(id) { return state.data.house.rooms.filter(function (r) { return r.id === id; })[0]; }
  function findTask(id) { return state.data.tasks.filter(function (t) { return t.id === id; })[0]; }
  function findIdea(id) { return state.data.ideas.filter(function (i) { return i.id === id; })[0]; }
  function findShop(id) { return state.data.shopping.filter(function (s) { return s.id === id; })[0]; }
  // Proprietario della checklist in base alla pagina dettaglio aperta (lavoro o idea)
  function currentChecklistOwner() {
    var r = parseHash();
    if (r.name === "lavoro") return findTask(r.param);
    if (r.name === "idea") return findIdea(r.param);
    return null;
  }
  function floorNameOf(id) { var f = findFloor(id); return f ? f.name : "—"; }
  function roomFloorName(roomId) { var r = findRoom(roomId); return r ? floorNameOf(r.floorId) : "—"; }

  function byOrderName(a, b) {
    var ao = a.order || 0, bo = b.order || 0;
    if (ao !== bo) return ao - bo;
    return String(a.name).localeCompare(String(b.name), "it");
  }

  /* --- ordinamento liste (Lavori / Idee) --- */
  function taskSort() { return (state.data.settings && state.data.settings.taskSort) || "priorita"; }
  function ideaSort() { return (state.data.settings && state.data.settings.ideaSort) || "recenti"; }
  function setSort(kind, key) {
    if (kind === "task") state.data.settings.taskSort = key;
    else state.data.settings.ideaSort = key;
    persist();
  }

  function byManual(a, b) {
    var r = (a.order || 0) - (b.order || 0);
    return r || String(a.createdAt).localeCompare(String(b.createdAt));
  }
  function byCreatedDesc(a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }
  function byPrio(a, b) {
    var r = PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
    return r || byCreatedDesc(a, b);
  }
  function byDue(a, b) {
    var da = a.dueDate || "", db = b.dueDate || "";
    if (da && db) { if (da !== db) return da < db ? -1 : 1; }
    else if (da) return -1;   // con scadenza prima
    else if (db) return 1;    // senza scadenza in fondo
    return byPrio(a, b);
  }
  function roomSortKey(t) {
    var rid = (t.roomIds || [])[0];
    if (!rid) return "￿";  // "Senza stanza" in fondo
    var r = findRoom(rid);
    return r ? (floorNameOf(r.floorId) + " " + r.name).toLowerCase() : "￿";
  }
  function byRoom(a, b) {
    var r = roomSortKey(a).localeCompare(roomSortKey(b), "it");
    return r || byPrio(a, b);
  }
  function costNum(s) {
    var m = String(s == null ? "" : s).replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
    var n = parseFloat(m);
    return isNaN(n) ? -1 : n;
  }
  function byCostDesc(a, b) {
    var r = costNum(b.cost) - costNum(a.cost);
    return r || byCreatedDesc(a, b);
  }
  function byIdeaStatus(a, b) {
    var r = IDEA_RANK[a.status] - IDEA_RANK[b.status];
    return r || byCreatedDesc(a, b);
  }

  function sortTasks(list, mode) {
    var cmp = mode === "manuale" ? byManual
      : mode === "scadenza" ? byDue
      : mode === "stanza" ? byRoom
      : mode === "recenti" ? byCreatedDesc
      : byPrio;
    return list.slice().sort(cmp);
  }
  function sortIdeas(list, mode) {
    var cmp = mode === "manuale" ? byManual
      : mode === "stato" ? byIdeaStatus
      : mode === "costo" ? byCostDesc
      : byCreatedDesc;
    return list.slice().sort(cmp);
  }

  // Riassegna il campo "order" agli elementi trascinati (visibili) riusando gli
  // slot di posizione che occupavano: non disturba gli elementi non mostrati
  // (es. nascosti da un filtro priorità) e mantiene gli order distinti.
  function commitManualOrder(list, ids) {
    var byId = {};
    list.forEach(function (x) { byId[x.id] = x; });
    var moved = [];
    ids.forEach(function (id) { if (byId[id]) moved.push(byId[id]); });
    if (!moved.length) return;
    var slots = moved.map(function (x) { return (typeof x.order === "number" ? x.order : 0); })
      .sort(function (a, b) { return a - b; });
    moved.forEach(function (x, i) { x.order = slots[i]; x.updatedAt = nowISO(); });
    persist();
  }

  // --- mutazioni con cascata ---
  function deleteFloor(id) {
    var rs = roomsOf(id);
    for (var i = 0; i < rs.length; i++) deleteRoom(rs[i].id);
    state.data.house.floors = state.data.house.floors.filter(function (f) { return f.id !== id; });
    persist();
  }
  function deleteRoom(id) {
    // Multi-stanza: togli la stanza dall'elenco; elimina il lavoro/idea solo
    // se era l'unica stanza (in tal caso scollega la sua spesa).
    function pruneList(list) {
      var kept = [];
      list.forEach(function (it) {
        var idx = (it.roomIds || []).indexOf(id);
        if (idx >= 0) {
          it.roomIds = it.roomIds.filter(function (x) { return x !== id; });
          if (it.roomIds.length === 0) {
            unlinkShopping(it.id.indexOf("task") === 0 ? "task" : "idea", it.id);
            return; // niente più stanze -> elimina
          }
        }
        kept.push(it);
      });
      return kept;
    }
    state.data.tasks = pruneList(state.data.tasks);
    state.data.ideas = pruneList(state.data.ideas);
    unlinkShopping("room", id);
    state.data.house.rooms = state.data.house.rooms.filter(function (r) { return r.id !== id; });
    persist();
  }

  // Scollega gli articoli di spesa legati a un certo elemento (li mantiene in lista).
  function unlinkShopping(type, id) {
    state.data.shopping.forEach(function (s) {
      if (s.linkType === type && s.linkId === id) { s.linkType = ""; s.linkId = null; }
    });
  }
  function shoppingLinkedTo(type, id) {
    return state.data.shopping.filter(function (s) { return s.linkType === type && s.linkId === id; });
  }

  /* ==========================================================
     ROUTER (hash routing semplice)
     ========================================================== */
  function parseHash() {
    var raw = (location.hash || "").replace(/^#/, "");
    if (!raw) return { name: "home" };
    var parts = raw.split("/");
    if (parts[0] === "stanza") return { name: "stanza", param: parts[1] || "" };
    if (parts[0] === "lavoro") return { name: "lavoro", param: parts[1] || "" };
    if (parts[0] === "idea") return { name: "idea", param: parts[1] || "" };
    if (parts[0] === "opzioni") return { name: "opzioni", param: parts[1] || "" };
    if (parts[0] === "lavori" || parts[0] === "idee" || parts[0] === "spesa" || parts[0] === "home") {
      return { name: parts[0] };
    }
    return { name: "home" };
  }

  function navigate(hash) {
    if (location.hash === hash) { render(); }
    else { location.hash = hash; }
  }

  function needsSetup() {
    return state.data.house.floors.length === 0 || state.data.house.rooms.length === 0;
  }

  /* ==========================================================
     RENDER
     ========================================================== */
  function applySettings() {
    var s = state.data.settings;
    document.documentElement.setAttribute("data-theme", s.theme === "light" ? "light" : "dark");
    var accent = isHex(s.accentColor) ? s.accentColor : CONFIG.DEFAULT_ACCENT;
    var root = document.documentElement.style;
    root.setProperty("--accent", accent);
    root.setProperty("--accent-weak", hexToRgba(accent, 0.14));
    root.setProperty("--accent-glow", hexToRgba(accent, 0.40));
    root.setProperty("--accent-dim", hexToRgba(accent, 0.10));
    root.setProperty("--accent-line", hexToRgba(accent, 0.32));
    document.body.classList.toggle("compact", !!s.compactMode);
  }

  function renderSetup() {
    applySettings();
    elHeader.hidden = true;
    elNav.hidden = true;
    elView.classList.add("is-fullscreen");
    elView.innerHTML = viewSetup();
    window.scrollTo(0, 0);
    animateIn();
  }

  function render() {
    applySettings();
    if (needsSetup()) { renderSetup(); return; }
    var route = parseHash();
    elHeader.hidden = false;
    elNav.hidden = false;
    elView.classList.remove("is-fullscreen");
    elHeader.innerHTML = headerHtml(route);
    applyHeaderRoom(route);
    if (!elNav.dataset.built) { elNav.innerHTML = navHtml(); elNav.dataset.built = "1"; }
    updateNav(route.name);

    var body = "";
    switch (route.name) {
      case "home": body = viewHome(); break;
      case "lavori": body = viewLavori(); break;
      case "idee": body = viewIdee(); break;
      case "spesa": body = viewSpesa(); break;
      case "opzioni": body = viewOpzioni(route.param); break;
      case "stanza": body = viewStanza(route.param); break;
      case "lavoro": body = viewTaskDetail(route.param); break;
      case "idea": body = viewIdeaDetail(route.param); break;
      default: navigate("#home"); return;
    }
    elView.innerHTML = body;
    // keepScroll: usato dai toggle delle sezioni comprimibili (Presi/Completati/
    // Realizzati) per espandere/chiudere SENZA saltare in cima né rifare la
    // dissolvenza d'entrata.
    if (keepScroll) {
      keepScroll = false;
    } else {
      window.scrollTo(0, 0);
      animateIn();
    }
    initSegBars();
  }
  var keepScroll = false;

  // Cascata d'entrata: ogni voce di lista (.stack) entra con un piccolo ritardo
  // progressivo; i contenitori che racchiudono liste vengono attraversati; gli
  // altri blocchi entrano singolarmente. Usata sia per l'intera vista sia per gli
  // aggiornamenti mirati (lista Lavori / Spesa).
  function cascade(parent, ctx) {
    if (prefersReducedMotion() || !parent) return;
    ctx = ctx || { i: 0 };
    var step = 45, cap = 10, kids = parent.children;
    for (var k = 0; k < kids.length; k++) {
      var child = kids[k];
      if (child.classList && child.classList.contains("stack")) {
        var items = child.children;
        for (var j = 0; j < items.length; j++) {
          items[j].style.animationDelay = Math.min(ctx.i, cap) * step + "ms";
          items[j].classList.add("anim-in");
          ctx.i++;
        }
      } else if (child.querySelector && child.querySelector(".stack")) {
        cascade(child, ctx); // contenitore con liste dentro (es. #lavori-list, #spesa-list)
      } else {
        child.style.animationDelay = Math.min(ctx.i, cap) * step + "ms";
        child.classList.add("anim-in");
        ctx.i++;
      }
    }
  }
  function animateIn() { cascade(elView); }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  // ----- Helper condivisi per l'indicatore scorrevole (thumb) delle barre filtro -----
  function segActiveBtn(bar) { return bar.querySelector(".seg-btn.is-active") || bar.querySelector(".seg-btn"); }
  function segPlaceThumb(bar, btn, withTrans) {
    var thumb = bar.querySelector(".seg-thumb");
    if (!thumb || !btn) return;
    if (!withTrans) thumb.style.transition = "none";
    thumb.style.width = btn.offsetWidth + "px";
    thumb.style.transform = "translateX(" + btn.offsetLeft + "px)";
    if (!withTrans) { void thumb.offsetWidth; thumb.style.transition = ""; }
  }
  // Porta in vista (scroll orizzontale della sola barra) la voce attiva.
  function segCenterActive(bar, smooth) {
    var ab = segActiveBtn(bar);
    if (!ab) return;
    var target = Math.max(0, ab.offsetLeft - (bar.clientWidth - ab.offsetWidth) / 2);
    if (bar.scrollTo) bar.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
    else bar.scrollLeft = target;
  }

  // Inizializza tutte le barre "segmented" trascinabili presenti nella vista:
  // il filtro priorità dei Lavori (#prio-bar) e il selettore di stato del
  // dettaglio (#status-bar). Condividono il thumb scorrevole; cambia solo cosa
  // succede al rilascio (filtro lista vs. cambio stato).
  function initSegBars() {
    var prio = document.getElementById("prio-bar");
    if (prio) setupSegBar(prio, function (target) {
      if (target.getAttribute("data-prio") === state.filterPrio) return; // già attivo
      state.filterPrio = target.getAttribute("data-prio");
      var bs = prio.querySelectorAll(".seg-btn");
      for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("is-active", bs[i] === target);
      refreshLavoriList();              // prima la lista (layout stabile, dissolvenza voce per voce)
      segPlaceThumb(prio, target, true); // poi il thumb scivola sulla voce scelta
    });

    // Selettore di stato del dettaglio: aggiornamento mirato in-place (niente
    // render() completo) così non c'è l'effetto refresh e il thumb scivola davvero.
    var status = document.getElementById("status-bar");
    if (status) setupSegBar(status, setStatusInPlace);
  }

  // Plumbing condiviso del thumb (posizionamento iniziale + drag con snap).
  // onSelect(targetBtn) viene chiamato al commit (tap o drag).
  function setupSegBar(bar, onSelect) {
    var thumb = bar.querySelector(".seg-thumb");
    if (!thumb) return;

    function activeBtn() { return segActiveBtn(bar); }
    function placeThumb(btn, withTrans) { segPlaceThumb(bar, btn, withTrans); }
    function nearestBtn(centerX) {
      var btns = bar.querySelectorAll(".seg-btn"), best = null, bd = Infinity;
      for (var i = 0; i < btns.length; i++) {
        var c = btns[i].offsetLeft + btns[i].offsetWidth / 2;
        var d = Math.abs(c - centerX);
        if (d < bd) { bd = d; best = btns[i]; }
      }
      return best;
    }
    function selectBtn(target) {
      if (!target) return;
      segSuppressUntil = Date.now() + 500; // assorbe l'eventuale click sintetico post-pointer
      onSelect(target);
    }

    // Posizione iniziale del thumb dopo che layout e testi sono stabili
    // (evita misure sbagliate durante l'entrata della vista).
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { placeThumb(activeBtn(), false); });
    });

    var dragging = false, moved = false, startX = 0, thumbStart = 0, thumbW = 0, pressedBtn = null;

    bar.addEventListener("pointerdown", function (e) {
      dragging = true; moved = false;
      startX = e.clientX;
      pressedBtn = e.target && e.target.closest ? e.target.closest(".seg-btn") : null;
      var ab = activeBtn();
      thumbStart = ab ? ab.offsetLeft : 0;
      thumbW = ab ? ab.offsetWidth : 0;
      thumb.style.transition = "none";
      try { bar.setPointerCapture(e.pointerId); } catch (err) {}
    });

    bar.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; bar.classList.add("is-dragging"); }
      if (!moved) return; // finché non si trascina in orizzontale, lascia lo scroll verticale
      var maxL = bar.clientWidth - thumbW - 4;
      var l = Math.max(4, Math.min(thumbStart + dx, maxL));
      thumb.style.transform = "translateX(" + l + "px)";
      e.preventDefault();
    });

    // commit=true su rilascio normale; false su annullo (es. parte lo scroll).
    function finish(e, commit) {
      if (!dragging) return;
      dragging = false;
      bar.classList.remove("is-dragging");
      thumb.style.transition = "";
      try { bar.releasePointerCapture(e.pointerId); } catch (err) {}
      if (!commit) { placeThumb(activeBtn(), true); return; } // annullato: rimetti il thumb sull'attivo
      if (moved) {
        // DRAG: scegli la voce più vicina al centro del thumb.
        var m = /translateX\(([-0-9.]+)px\)/.exec(thumb.style.transform);
        var curLeft = m ? parseFloat(m[1]) : thumbStart;
        selectBtn(nearestBtn(curLeft + thumbW / 2));
      } else {
        // TAP diretto sulla voce.
        selectBtn(pressedBtn);
      }
    }
    bar.addEventListener("pointerup", function (e) { finish(e, true); });
    bar.addEventListener("pointercancel", function (e) { finish(e, false); });
  }

  // Applica il cambio di stato (lavoro/idea) da un bottone della barra di stato
  // AGGIORNANDO SOLO L'INTERESSATO, senza render() completo: niente effetto
  // refresh, il thumb scivola sul nuovo segmento e ne assume il colore.
  function setStatusInPlace(btn) {
    var bar = document.getElementById("status-bar");
    if (!bar) return;
    var action = btn.getAttribute("data-action");
    var id = btn.getAttribute("data-id");
    var ns = btn.getAttribute("data-status");
    var isTask = action === "set-task-status";
    var changed = false;
    if (isTask) {
      var t = findTask(id);
      if (t && t.status !== ns) {
        var wasDone = t.status === "fatto";
        t.status = ns; t.updatedAt = nowISO();
        if (ns === "fatto" && !wasDone) t.completedAt = nowISO();
        if (ns !== "fatto") t.completedAt = null;
        changed = true;
        refreshTaskDetailStatusBits(t); // barratura titolo + badge priorità
      }
    } else {
      var i = findIdea(id);
      if (i && i.status !== ns) { i.status = ns; i.updatedAt = nowISO(); changed = true; }
    }
    if (!changed) return;
    persist();
    // Aggiorna la barra in-place: classi attive, colore del thumb e scorrimento.
    var bs = bar.querySelectorAll(".seg-btn");
    for (var k = 0; k < bs.length; k++) {
      var on = bs[k] === btn;
      bs[k].classList.toggle("is-active", on);
      bs[k].setAttribute("aria-pressed", on);
    }
    bar.style.setProperty("--seg-c", "var(" + bar.getAttribute("data-varprefix") + ns + ")");
    segPlaceThumb(bar, btn, true);
  }

  // Aggiorna i pezzi del dettaglio Lavoro che dipendono dallo stato, senza
  // ridisegnare l'intera pagina (titolo barrato e riga badge priorità/scadenza).
  function refreshTaskDetailStatusBits(t) {
    var done = t.status === "fatto";
    var title = document.querySelector(".detail-card .detail-title");
    if (title) title.classList.toggle("is-done", done);
    var badges = document.querySelector(".detail-card .task-badges");
    if (badges) badges.innerHTML = (done ? "" : prioBadge(t.priority)) + dueBadgeHtml(t);
  }

  // Intestazione colorata della stanza (fusa con la barra) + offset vista
  function applyHeaderRoom(route) {
    // L'header colorato è solo per la pagina stanza (un solo colore per stanza).
    var color = null;
    if (route.name === "stanza") {
      var r = findRoom(route.param);
      if (r) color = r.color;
    }
    if (color) {
      elHeader.classList.add("is-room");
      elHeader.classList.remove("is-collapsed");
      elHeader.style.setProperty("--room-color", color);
      elView.classList.add("view--room");
    } else {
      elHeader.classList.remove("is-room", "is-collapsed");
      elHeader.style.removeProperty("--room-color");
      elView.classList.remove("view--room");
    }
  }

  function onScroll() {
    if (!elHeader.classList.contains("is-room")) return;
    elHeader.classList.toggle("is-collapsed", (window.scrollY || window.pageYOffset || 0) > 24);
  }

  // Header colorato (col colore della stanza) condiviso da stanza/lavoro/idea
  function coloredHeaderHtml(backAction, iconKey, title, subtitleInner) {
    return '<button class="header-btn hdr-back" data-action="' + backAction + '" aria-label="Indietro">' + svg("back") + "</button>" +
      '<span class="hdr-room-ico">' + svg(iconKey) + "</span>" +
      '<div class="hdr-room-info">' +
        '<div class="hdr-room-name">' + h(title) + "</div>" +
        '<div class="hdr-room-floor">' + subtitleInner + "</div>" +
      "</div>";
  }
  function slimHeaderHtml(backAction, title) {
    return '<button class="header-btn" data-action="' + backAction + '" aria-label="Indietro">' + svg("back") + "</button>" +
      '<div class="grow"><div class="header-title">' + h(title) + "</div></div>";
  }
  // Header del dettaglio: solo freccia indietro. Il titolo, completo e senza
  // troncamenti, vive una volta sola dentro la card di dettaglio.
  function backOnlyHeaderHtml(backAction) {
    return '<button class="header-btn" data-action="' + backAction + '" aria-label="Indietro">' + svg("back") + "</button>" +
      '<div class="grow"></div>';
  }

  // Segnalino discreto (in alto a destra) dello stato Google Drive.
  // Tocco: se collegato → opzioni backup; se scollegato → login rapido.
  function gdIndicatorHtml() {
    if (!gdConfigured()) return "";
    var on = gdConnected();
    return '<button class="gd-dot ' + (on ? "is-on" : "is-off") + '" data-action="gd-indicator" ' +
      'aria-label="' + (on ? "Google Drive collegato" : "Google Drive scollegato — tocca per accedere") + '">' +
      svg("cloud") + "</button>";
  }

  function headerHtml(route) {
    var inner;
    if (route.name === "stanza") {
      var r = findRoom(route.param);
      inner = r
        ? coloredHeaderHtml("back-home", roomIcon(r.icon), r.name,
            svg("layers", "ico-sm") + '<span>' + h(floorNameOf(r.floorId)) + "</span>")
        : slimHeaderHtml("back-home", "Stanza");
    } else if (route.name === "lavoro") {
      inner = backOnlyHeaderHtml("back-task");
    } else if (route.name === "idea") {
      inner = backOnlyHeaderHtml("back-idea");
    } else if (route.name === "opzioni" && route.param) {
      // Sotto-sezione di Opzioni: header con freccia indietro al menu Opzioni.
      inner = slimHeaderHtml("opzioni-root", OPT_SECTIONS[route.param] || "Opzioni");
    } else {
      var titles = { home: "La mia casa", lavori: "Lavori", idee: "Progetti", spesa: "Lista spesa", opzioni: "Opzioni" };
      inner = '<div class="grow"><div class="header-title">' + titles[route.name] + "</div></div>";
    }
    return inner + gdIndicatorHtml();
  }

  var NAV_ITEMS = [
    { r: "home", l: "Home", i: "home" },
    { r: "lavori", l: "Lavori", i: "tasks" },
    { r: "idee", l: "Progetti", i: "bulb" },
    { r: "spesa", l: "Spesa", i: "cart" },
    { r: "opzioni", l: "Opzioni", i: "settings" }
  ];

  function navHtml() {
    var items = NAV_ITEMS.map(function (it) {
      return '<button class="nav-item" data-action="go" data-route="' + it.r + '" aria-label="' + it.l + '">' +
        svg(it.i) + "<span>" + it.l + "</span></button>";
    }).join("");
    return items + '<span class="nav-indicator" aria-hidden="true"></span>';
  }

  // Indice della voce di nav attiva: le pagine dettaglio illuminano la sezione padre
  function activeNavIndex(routeName) {
    var map = { lavoro: "lavori", idea: "idee", stanza: "home" };
    var r = map[routeName] || routeName;
    for (var i = 0; i < NAV_ITEMS.length; i++) if (NAV_ITEMS[i].r === r) return i;
    return -1;
  }

  function updateNav(routeName) {
    var idx = activeNavIndex(routeName);
    var items = elNav.querySelectorAll(".nav-item");
    for (var i = 0; i < items.length; i++) items[i].classList.toggle("is-active", i === idx);
    var ind = elNav.querySelector(".nav-indicator");
    if (ind) {
      if (idx < 0) { ind.classList.add("is-hidden"); }
      else { ind.classList.remove("is-hidden"); ind.style.setProperty("--i", idx); }
    }
  }

  /* ==========================================================
     VIEWS
     ========================================================== */

  // ---------- CONFIGURA CASA (onboarding) ----------
  function viewSetup() {
    var fl = floors();
    var rm = rooms();
    var canEnter = fl.length > 0 && rm.length > 0;

    var floorChips = fl.length
      ? '<div class="setup-chiplist">' + fl.map(function (f) {
          return '<span class="setup-chip"><span class="chip-swatch" style="background:var(--accent)"></span>' + h(f.name) +
            '<button class="chip-x" data-action="setup-del-floor" data-id="' + f.id + '" aria-label="Elimina piano">' + svg("x") + "</button></span>";
        }).join("") + "</div>"
      : '<div class="setup-empty-mini">Nessun piano/area ancora.</div>';

    var roomChips = rm.length
      ? '<div class="setup-chiplist">' + rm.map(function (r) {
          return '<span class="setup-chip"><span class="chip-swatch" style="background:' + h(r.color) + '"></span>' + h(r.name) +
            '<button class="chip-x" data-action="setup-del-room" data-id="' + r.id + '" aria-label="Elimina stanza">' + svg("x") + "</button></span>";
        }).join("") + "</div>"
      : '<div class="setup-empty-mini">Nessuna stanza ancora.</div>';

    var floorOptions = fl.map(function (f) { return '<option value="' + f.id + '">' + h(f.name) + "</option>"; }).join("");
    var roomFormDisabled = fl.length === 0;

    return '' +
      '<div class="setup">' +
        '<div class="setup-hero">' +
          '<div class="setup-logo">' + svg("home") + "</div>" +
          "<h1>Configura Casa</h1>" +
          "<p>Crea almeno un piano/area e una stanza per iniziare a usare l'app.</p>" +
        "</div>" +

        '<div class="setup-step' + (fl.length ? " is-done" : "") + '">' +
          '<div class="setup-step-head">' +
            '<span class="setup-step-num">' + (fl.length ? svgRaw("check", "ico-sm") : "1") + "</span>" +
            "<h2>Piani / Aree</h2>" +
            '<span class="step-count">' + fl.length + "</span>" +
          "</div>" +
          floorChips +
          '<form class="setup-inline-form" data-action="setup-add-floor">' +
            '<input class="input" type="text" name="floorName" placeholder="Es. Piano Terra" maxlength="40" autocomplete="off" />' +
            '<button class="setup-inline-add" type="submit" aria-label="Aggiungi piano">' + svg("plus") + "</button>" +
          "</form>" +
        "</div>" +

        '<div class="setup-step' + (rm.length ? " is-done" : "") + '">' +
          '<div class="setup-step-head">' +
            '<span class="setup-step-num">' + (rm.length ? svgRaw("check", "ico-sm") : "2") + "</span>" +
            "<h2>Stanze</h2>" +
            '<span class="step-count">' + rm.length + "</span>" +
          "</div>" +
          roomChips +
          (roomFormDisabled
            ? '<div class="field-hint">Aggiungi prima un piano/area qui sopra.</div>'
            : '<form class="setup-inline-form" data-action="setup-add-room">' +
                '<input class="input" type="text" name="roomName" placeholder="Es. Cucina" maxlength="40" autocomplete="off" />' +
                '<select class="select" name="floorId" aria-label="Piano della stanza">' + floorOptions + "</select>" +
                '<button class="setup-inline-add" type="submit" aria-label="Aggiungi stanza">' + svg("plus") + "</button>" +
              "</form>") +
        "</div>" +

        '<div class="setup-cta">' +
          '<button class="btn btn-primary btn-block" data-action="setup-enter"' + (canEnter ? "" : ' aria-disabled="true"') + ">" +
            "Entra nell'app" + svg("chevron") +
          "</button>" +
          '<button class="btn btn-ghost btn-block" style="margin-top:10px" data-action="import-json">' + svg("upload") + "Importa backup JSON</button>" +
          '<p class="setup-note">Hai un backup da un altro dispositivo? Importalo qui. Potrai gestire piani/aree e stanze in qualsiasi momento da Opzioni.</p>' +
        "</div>" +
      "</div>";
  }

  // ---------- HOME ----------
  function viewHome() {
    var fl = floors();
    var floorsHtml = fl.map(function (f) {
      var rs = roomsOf(f.id);
      var roomsHtml = rs.length
        ? '<div class="stack">' + rs.map(roomCard).join("") + "</div>"
        : '<div class="map-floor-empty">Nessuna stanza in questo piano.</div>';
      return '<div class="floor-group">' +
        '<div class="floor-head"><span class="floor-name">' + h(f.name) + "</span>" +
        '<span class="floor-line"></span><span class="floor-count">' + rs.length + " stanze</span></div>" +
        roomsHtml + "</div>";
    }).join("");

    return homeAlertHtml() + '<section class="section">' + floorsHtml + "</section>";
  }

  // Striscia "in evidenza" in cima alla Home: appare SOLO se c'è qualcosa che
  // richiede attenzione (lavori scaduti o ad alta priorità). Tocco → Lavori.
  function homeAlertHtml() {
    var open = state.data.tasks.filter(function (t) { return t.status !== "fatto"; });
    var overdue = open.filter(isOverdueOpen).length;
    var alta = open.filter(function (t) { return t.priority === "alta"; }).length;
    if (!overdue && !alta) return "";
    var parts = [];
    if (overdue) parts.push(overdue === 1 ? "1 lavoro scaduto" : overdue + " lavori scaduti");
    if (alta) parts.push((overdue ? alta : (alta === 1 ? "1 lavoro" : alta + " lavori")) + " ad alta priorità");
    // Se ci sono scaduti porto alla lista completa (i badge li evidenziano),
    // altrimenti filtro direttamente sull'alta priorità.
    var prio = overdue ? "tutti" : "alta";
    return '<button class="home-alert" data-action="go-attention" data-prio="' + prio + '">' +
      '<span class="home-alert-ico">' + svg("alert") + "</span>" +
      '<span class="home-alert-text">' + parts.join(" · ") + "</span>" +
      '<span class="home-alert-chev">' + svg("chevron") + "</span>" +
      "</button>";
  }

  function roomCard(r) {
    var openTasks = openTasksOf(r.id);
    var open = openTasks.length;
    var ideasN = ideasOf(r.id).length;
    var overdue = openTasks.filter(isOverdueOpen).length;
    var alta = openTasks.filter(function (t) { return t.priority === "alta"; }).length;

    var pills = "";
    // Segnale d'attenzione per primo: scaduti (più urgenti) o, in mancanza, alta priorità.
    if (overdue > 0) pills += '<span class="count-pill is-danger">' + svg("alert", "ico-sm") + overdue + (overdue === 1 ? " scaduto" : " scaduti") + "</span>";
    else if (alta > 0) pills += '<span class="count-pill is-danger">' + svg("alert", "ico-sm") + alta + (alta === 1 ? " urgente" : " urgenti") + "</span>";
    if (open > 0) pills += '<span class="count-pill">' + svg("tasks", "ico-sm") + open + " aperti</span>";
    if (ideasN > 0) pills += '<span class="count-pill">' + svg("bulb", "ico-sm") + ideasN + (ideasN === 1 ? " progetto" : " progetti") + "</span>";
    if (!pills) pills = '<span class="count-pill room-empty-hint">Tutto a posto</span>';

    return '<button class="card card-tap room-card" data-action="open-room" data-id="' + r.id + '">' +
      '<span class="room-ico" style="background:' + h(r.color) + '">' + svg(roomIcon(r.icon)) + "</span>" +
      '<span class="room-info">' +
        '<span class="room-name">' + h(r.name) + "</span>" +
        '<span class="room-counts">' + pills + "</span>" +
      "</span>" +
      '<span class="room-chevron">' + svg("chevron") + "</span>" +
      "</button>";
  }

  // ---------- LAVORI ----------
  function viewLavori() {
    var filt = state.filterPrio;
    var segs = [["tutti", "Tutti"], ["alta", "Alta"], ["media", "Media"], ["bassa", "Bassa"]];
    var seg = '<div class="segmented filter-bar seg-drag" id="prio-bar">' +
      '<span class="seg-thumb" aria-hidden="true"></span>' +
      segs.map(function (s) {
        return '<button class="seg-btn' + (filt === s[0] ? " is-active" : "") + '" data-action="filter-prio" data-prio="' + s[0] + '">' + s[1] + "</button>";
      }).join("") + "</div>";

    return listToolbar(seg, "task") + '<div id="lavori-list">' + lavoriListHtml() + "</div>" + fab("add-task", "Aggiungi lavoro");
  }

  // Barra di una lista: filtro (se presente) a sinistra + pulsante tondo "Ordina"
  // a destra (sola icona, apre il menu dal basso). Niente testo → niente spazio sprecato.
  function listToolbar(filterHtml, kind) {
    return '<div class="list-toolbar">' +
      (filterHtml || '<span class="list-toolbar-spacer"></span>') +
      '<button class="sort-icon-btn" data-action="open-sort" data-kind="' + kind + '" aria-label="Ordina">' +
        svg("sort") +
      "</button>" +
    "</div>";
  }

  // Solo il corpo della lista Lavori (filtrato/ordinato): usato sia al primo
  // render sia per l'aggiornamento mirato al cambio filtro (senza ridisegnare la barra).
  function lavoriListHtml() {
    var filt = state.filterPrio;
    var all = state.data.tasks.slice();
    if (filt !== "tutti") all = all.filter(function (t) { return t.priority === filt; });
    var mode = taskSort();
    var manual = mode === "manuale";
    var active = sortTasks(all.filter(function (t) { return t.status !== "fatto"; }), mode);
    var done = all.filter(function (t) { return t.status === "fatto"; })
      .sort(function (a, b) { return String(b.completedAt || b.updatedAt).localeCompare(String(a.completedAt || a.updatedAt)); });

    var body;
    if (active.length) {
      body = '<div class="stack reorder-list" data-reorder="task">' +
        active.map(function (t) { return taskCard(t, manual && active.length > 1); }).join("") + "</div>";
    } else if (done.length) {
      body = '<div class="all-done-note">' + svg("check", "ico-sm") + "Tutti i lavori sono completati 🎉</div>";
    } else {
      body = emptyState("tasks", "Nessun lavoro", filt === "tutti"
        ? "Aggiungi il primo lavoro con il pulsante +."
        : "Nessun lavoro con questa priorità.");
    }
    return body + collapsibleDone("done", state.doneOpen, "Completati", done, function (t) { return taskCard(t, false); });
  }

  // Sezione comprimibile in fondo (Completati / Realizzati).
  function collapsibleDone(toggleAction, open, label, items, cardFn) {
    if (!items.length) return "";
    return '<div class="done-section">' +
      '<button class="done-toggle' + (open ? " is-open" : "") + '" data-action="toggle-' + toggleAction + '">' +
        svg("chevron", "ico-sm") + '<span>' + label + " (" + items.length + ")</span>" +
      "</button>" +
      (open ? '<div class="stack done-stack">' + items.map(cardFn).join("") + "</div>" : "") +
      "</div>";
  }

  // Aggiorna solo la lista (la barra resta viva → il rimbalzo del thumb non viene
  // interrotto) e fa entrare le card con la dissolvenza voce per voce.
  function refreshLavoriList() {
    var cont = document.getElementById("lavori-list");
    if (!cont) { render(); return; }
    cont.innerHTML = lavoriListHtml();
    cascade(cont);
    window.scrollTo(0, 0);
  }

  // Maniglia di trascinamento per le card (visibile solo in ordinamento "Manuale").
  // Ha un proprio data-action no-op così il tocco non apre il dettaglio.
  function dragHandleHtml() {
    return '<button class="drag-handle card-drag" type="button" data-action="reorder-handle" aria-label="Trascina per riordinare">' + svg("grip") + "</button>";
  }

  // Pulsante "Elimina" rivelato dallo swipe (riga spesa o card lavoro/idea).
  function swipeDelBtn(action, id, label) {
    return '<button class="swipe-del" data-action="' + action + '" data-id="' + id + '" aria-label="' + label + '">' +
      svg("trash", "ico-sm") + "<span>Elimina</span></button>";
  }

  function taskCard(t, draggable) {
    var chk = t.checklist || [];
    var doneN = chk.filter(function (c) { return c.done; }).length;
    var chkPill = chk.length
      ? '<span class="count-pill">' + svg("listcheck", "ico-sm") + doneN + "/" + chk.length + "</span>"
      : "";
    var shop = shoppingLinkedTo("task", t.id);
    var shopPill = shop.length
      ? '<span class="count-pill">' + svg("cart", "ico-sm") + shop.filter(function (s) { return !s.done; }).length + "/" + shop.length + "</span>"
      : "";
    // .card resta il nodo riordinabile; .card-inner è la superficie che scorre.
    return '<div class="card card-tap task-card prio-' + t.priority + (draggable ? " is-reorderable" : "") + '" data-action="open-task" data-id="' + t.id + '">' +
      '<div class="card-inner swipe-surface">' +
        '<div class="task-top">' +
          (draggable ? dragHandleHtml() : "") +
          '<span class="task-title' + (t.status === "fatto" ? " is-done" : "") + '">' + h(t.title) + "</span>" +
        "</div>" +
        '<div class="task-badges">' + (t.status === "fatto" ? "" : prioBadge(t.priority)) + statusBadge(t.status) + dueBadgeHtml(t) + chkPill + shopPill + "</div>" +
        '<div class="task-loc">' + locCompactHtml(t.roomIds) + "</div>" +
      "</div>" +
      swipeDelBtn("del-task", t.id, "Elimina lavoro") +
      "</div>";
  }

  // ---------- IDEE ----------
  function viewIdee() {
    var all = state.data.ideas.slice();
    var mode = ideaSort();
    var manual = mode === "manuale";
    var active = sortIdeas(all.filter(function (i) { return i.status !== "realizzato"; }), mode);
    var arch = all.filter(function (i) { return i.status === "realizzato"; }).sort(byCreatedDesc);

    var body;
    if (active.length) {
      body = '<div class="stack reorder-list" data-reorder="idea">' +
        active.map(function (i) { return ideaCard(i, manual && active.length > 1); }).join("") + "</div>";
    } else if (arch.length) {
      body = '<div class="all-done-note">' + svg("check", "ico-sm") + "Tutti i progetti sono realizzati 🎉</div>";
    } else {
      body = emptyState("bulb", "Nessun progetto", "Annota il tuo primo progetto con il pulsante +.");
    }
    var archHtml = collapsibleDone("arch", state.archOpen, "Realizzati", arch, function (i) { return ideaCard(i, false); });
    return listToolbar("", "idea") + body + archHtml + fab("add-idea", "Aggiungi progetto");
  }

  function ideaCard(i, draggable) {
    var shop = shoppingLinkedTo("idea", i.id);
    var shopPill = shop.length
      ? '<span class="count-pill">' + svg("cart", "ico-sm") + shop.filter(function (s) { return !s.done; }).length + "/" + shop.length + "</span>"
      : "";
    var clist = i.checklist || [];
    var clistPill = clist.length
      ? '<span class="count-pill">' + svg("listcheck", "ico-sm") + clist.filter(function (c) { return c.done; }).length + "/" + clist.length + "</span>"
      : "";
    var costBadge = i.cost ? '<span class="badge badge-soft idea-cost">' + svg("coin", "ico-sm") + h(i.cost) + "</span>" : "";
    return '<div class="card card-tap idea-card' + (draggable ? " is-reorderable" : "") + '" data-action="open-idea" data-id="' + i.id + '">' +
      '<div class="card-inner swipe-surface">' +
        '<div class="idea-top">' +
          (draggable ? dragHandleHtml() : "") +
          '<span class="idea-title">' + h(i.title) + "</span>" +
        "</div>" +
        (i.description ? '<div class="idea-desc">' + h(i.description) + "</div>" : "") +
        '<div class="idea-foot">' + ideaBadge(i.status) + costBadge + clistPill + shopPill + "</div>" +
        '<div class="idea-loc">' + locCompactHtml(i.roomIds) + "</div>" +
      "</div>" +
      swipeDelBtn("del-idea", i.id, "Elimina progetto") +
      "</div>";
  }

  // ---------- PAGINA STANZA ----------
  function viewStanza(roomId) {
    var r = findRoom(roomId);
    if (!r) {
      return emptyState("alert", "Stanza non trovata", "Questa stanza non esiste più.") +
        '<button class="btn btn-block" data-action="back-home">Torna alla Home</button>';
    }
    var openN = openTasksOf(r.id).length;
    var ideasN = ideasOf(r.id).length;
    var tlist = tasksOf(r.id).slice().sort(function (a, b) {
      if (PRIO_RANK[a.priority] !== PRIO_RANK[b.priority]) return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    var ilist = ideasOf(r.id).slice().sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    var tasksBlock = tlist.length
      ? '<div class="stack">' + tlist.map(taskCard).join("") + "</div>"
      : emptyState("tasks", "Nessun lavoro", "Aggiungi un lavoro per questa stanza.");
    var ideasBlock = ilist.length
      ? '<div class="stack">' + ilist.map(ideaCard).join("") + "</div>"
      : emptyState("bulb", "Nessun progetto", "Aggiungi un progetto per questa stanza.");

    return '' +
      '<div class="room-stat-row">' +
        '<div class="room-stat"><span class="rs-ico">' + svg("tasks") + '</span><span><span class="rs-val mono">' + openN + '</span><span class="rs-lbl">Lavori aperti</span></span></div>' +
        '<div class="room-stat"><span class="rs-ico">' + svg("bulb") + '</span><span><span class="rs-val mono">' + ideasN + '</span><span class="rs-lbl">Progetti</span></span></div>' +
      "</div>" +

      '<div class="room-add-row">' +
        '<button class="btn btn-primary" data-action="add-task-room" data-room="' + r.id + '">' + svg("plus") + "Lavoro</button>" +
        '<button class="btn" data-action="add-idea-room" data-room="' + r.id + '">' + svg("plus") + "Progetto</button>" +
      "</div>" +

      '<section class="section"><div class="section-head"><h2>Lavori</h2></div>' + tasksBlock + "</section>" +
      '<section class="section"><div class="section-head"><h2>Progetti</h2></div>' + ideasBlock + "</section>";
  }

  // ---------- DETTAGLIO LAVORO + CHECKLIST ----------
  function viewTaskDetail(taskId) {
    state.currentTaskId = taskId;
    var t = findTask(taskId);
    if (!t) {
      return emptyState("alert", "Lavoro non trovato", "Questo lavoro non esiste più.") +
        '<button class="btn btn-block" data-action="back-task">Torna ai lavori</button>';
    }
    var done = t.status === "fatto";
    var detail =
      '<div class="card detail-card">' +
        '<h1 class="detail-title' + (done ? " is-done" : "") + '">' + h(t.title) + "</h1>" +
        locChipsHtml(t.roomIds) +
        '<div class="task-badges">' + (done ? "" : prioBadge(t.priority)) + dueBadgeHtml(t) + "</div>" +
        '<div class="detail-status">' +
          '<span class="detail-status-label">Stato</span>' +
          taskStatusSwitcher(t) +
        "</div>" +
        (t.description ? '<p class="detail-desc">' + h(t.description) + "</p>" : "") +
        '<button class="btn btn-block detail-edit" data-action="edit-task" data-id="' + t.id + '">' + svg("pencil") + "Modifica lavoro</button>" +
      "</div>";

    return detail +
      '<section class="section">' +
        checklistBlock(t.checklist || []) +
      "</section>" +
      '<section class="section">' +
        shoppingLinkedBlock("task", t.id) +
      "</section>" +
      '<button class="detail-delete" data-action="del-task" data-id="' + t.id + '">' + svg("trash", "ico-sm") + "Elimina lavoro</button>";
  }

  // Selettore di stato del lavoro, toccabile dalla pagina di dettaglio
  // (cambio rapido senza aprire il menu di modifica).
  function taskStatusSwitcher(t) {
    return statusSegBar("set-task-status", t.id, t.status,
      ["da_fare", "in_corso", "in_attesa", "fatto"], STATUS_LABEL, "Stato del lavoro", "--stato-");
  }

  // Barra di stato del dettaglio: stesso componente "segmented" con indicatore
  // scorrevole/trascinabile della barra filtri Lavori, ma a 4 segmenti di pari
  // larghezza che ci stanno sempre senza scroll orizzontale. Il thumb prende il
  // colore dello stato attivo (--seg-c → variabile di tema dello stato).
  function statusSegBar(action, id, current, opts, labels, aria, varPrefix) {
    return '<div class="segmented seg-status seg-drag" id="status-bar" role="group" aria-label="' + aria + '"' +
        ' data-varprefix="' + varPrefix + '" style="--seg-c: var(' + varPrefix + current + ')">' +
      '<span class="seg-thumb" aria-hidden="true"></span>' +
      opts.map(function (s) {
        var on = current === s;
        return '<button class="seg-btn' + (on ? " is-active" : "") + '" ' +
          'data-action="' + action + '" data-id="' + id + '" data-status="' + s + '" aria-pressed="' + on + '">' +
          labels[s] + "</button>";
      }).join("") + "</div>";
  }

  function checklistBlock(items, title, emptyText) {
    title = title || "Checklist";
    emptyText = emptyText || "Nessuna voce. Aggiungi i passi o le cose da comprare per questo lavoro.";
    var doneN = items.filter(function (c) { return c.done; }).length;
    var pct = items.length ? Math.round((doneN / items.length) * 100) : 0;
    var canReorder = items.length > 1;
    var rows = items.length
      ? '<div class="check-list">' + items.map(function (c) {
          return '<div class="check-row" data-id="' + c.id + '">' +
            '<button class="check-box' + (c.done ? " is-done" : "") + '" data-action="toggle-check" data-id="' + c.id + '" aria-label="' + (c.done ? "Annulla spunta" : "Spunta") + '">' + svg("check", "ico-sm") + "</button>" +
            '<span class="check-text' + (c.done ? " is-done" : "") + '">' + h(c.text) + "</span>" +
            (canReorder ? '<button class="drag-handle" type="button" aria-label="Trascina per riordinare">' + svg("grip") + "</button>" : "") +
            iconBtn("del-check", c.id, "trash", "Elimina voce", true) +
          "</div>";
        }).join("") + "</div>"
      : '<p class="check-empty">' + h(emptyText) + "</p>";

    return '<div class="section-head"><h2>' + h(title) + "</h2>" +
      (items.length ? '<span class="check-count mono">' + doneN + "/" + items.length + "</span>" : "") + "</div>" +
      (items.length ? '<div class="progress"><div class="progress-bar" style="width:' + pct + '%"></div></div>' : "") +
      rows +
      '<form class="check-add" data-action="add-check">' +
        '<input class="input" type="text" name="text" placeholder="Aggiungi voce..." maxlength="120" autocomplete="off" />' +
        '<button class="setup-inline-add" type="submit" aria-label="Aggiungi voce">' + svg("plus") + "</button>" +
      "</form>";
  }

  // ---------- DETTAGLIO IDEA ----------
  function viewIdeaDetail(ideaId) {
    state.currentIdeaId = ideaId;
    var i = findIdea(ideaId);
    if (!i) {
      return emptyState("alert", "Progetto non trovato", "Questo progetto non esiste più.") +
        '<button class="btn btn-block" data-action="back-idea">Torna ai progetti</button>';
    }
    var detail =
      '<div class="card detail-card">' +
        '<h1 class="detail-title">' + h(i.title) + "</h1>" +
        locChipsHtml(i.roomIds) +
        (i.cost ? '<div class="task-badges"><span class="badge badge-soft idea-cost">' + svg("coin", "ico-sm") + h(i.cost) + "</span></div>" : "") +
        '<div class="detail-status">' +
          '<span class="detail-status-label">Stato</span>' +
          ideaStatusSwitcher(i) +
        "</div>" +
        (i.link && isSafeUrl(i.link)
          ? '<a class="idea-link" href="' + h(i.link) + '" target="_blank" rel="noopener noreferrer">' + svg("extlink", "ico-sm") + '<span>' + h(i.link) + "</span></a>"
          : "") +
        (i.description ? '<p class="detail-desc">' + h(i.description) + "</p>" : "") +
        '<button class="btn btn-block detail-edit" data-action="edit-idea" data-id="' + i.id + '">' + svg("pencil") + "Modifica progetto</button>" +
      "</div>";

    return detail +
      '<section class="section">' +
        checklistBlock(i.checklist || [], "Punti da valutare", "Aggiungi le cose da decidere o verificare per questo progetto.") +
      "</section>" +
      '<section class="section">' +
        shoppingLinkedBlock("idea", i.id) +
      "</section>" +
      '<button class="detail-delete" data-action="del-idea" data-id="' + i.id + '">' + svg("trash", "ico-sm") + "Elimina progetto</button>";
  }

  // Selettore di stato del progetto: stessa barra segmentata del lavoro.
  function ideaStatusSwitcher(i) {
    return statusSegBar("set-idea-status", i.id, i.status,
      ["bozza", "wip", "realizzato"], IDEA_LABEL, "Stato del progetto", "--idea-");
  }

  // Riquadro "Spesa collegata" riutilizzabile (lavoro/idea)
  function shoppingLinkedBlock(type, id) {
    var items = shoppingLinkedTo(type, id);
    var list = items.length
      ? '<div class="stack">' + items.map(function (s) { return shopItemHtml(s, false); }).join("") + "</div>"
      : '<p class="check-empty">Nessun articolo collegato. Aggiungi qui ciò che serve: finirà anche nella Lista spesa.</p>';
    return '<div class="section-head"><h2>Spesa collegata</h2>' +
        (items.length ? '<span class="check-count mono">' + items.filter(function (s) { return !s.done; }).length + " da prendere</span>" : "") + "</div>" +
      list +
      '<form class="check-add shop-link-add" data-action="add-shop" style="margin-top:10px">' +
        '<input type="hidden" name="link" value="' + type + ":" + id + '" />' +
        '<input class="input" type="text" name="text" placeholder="Aggiungi articolo..." maxlength="80" autocomplete="off" />' +
        '<input class="input shop-qty" type="text" name="qty" placeholder="Q.tà" maxlength="20" autocomplete="off" />' +
        '<button class="setup-inline-add" type="submit" aria-label="Aggiungi articolo">' + svg("plus") + "</button>" +
      "</form>";
  }

  // ---------- LISTA SPESA ----------
  function shopCatOptions(current, placeholder) {
    return '<option value="">' + (placeholder || "Nessuna") + "</option>" +
      CONFIG.SHOP_CATEGORIES.map(function (c) {
        return '<option value="' + c.k + '"' + (c.k === current ? " selected" : "") + ">" + h(c.l) + "</option>";
      }).join("");
  }
  // Corpo della lista Spesa: gli articoli "da prendere" raggruppati per
  // categoria (= dove comprarli), poi la sezione comprimibile "Presi".
  function spesaListHtml() {
    var all = state.data.shopping.slice();
    var todo = all.filter(function (s) { return !s.done; })
      .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); });
    var bought = all.filter(function (s) { return s.done; })
      .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });

    var out = "";
    if (todo.length) {
      // Un gruppo per categoria, nell'ordine di CONFIG.SHOP_CATEGORIES,
      // più un gruppo finale "Senza categoria" per gli articoli sciolti.
      var groups = [];
      CONFIG.SHOP_CATEGORIES.forEach(function (c) {
        var its = todo.filter(function (s) { return s.category === c.k; });
        if (its.length) groups.push({ label: c.l, items: its });
      });
      var noCat = todo.filter(function (s) { return !s.category; });
      if (noCat.length) groups.push({ label: "Senza categoria", items: noCat });

      out += groups.map(function (g) {
        return '<div class="shop-group">' +
          '<div class="shop-group-head">' +
            '<span class="shop-group-name">' + h(g.label) + "</span>" +
            '<span class="shop-group-count mono">' + g.items.length + "</span>" +
          "</div>" +
          '<div class="stack">' + g.items.map(function (s) { return shopItemHtml(s, true); }).join("") + "</div>" +
        "</div>";
      }).join("");
    } else if (bought.length) {
      out += '<p class="check-empty">Tutto preso. Bel lavoro!</p>';
    }

    if (bought.length) {
      out += '<div class="done-section">' +
        '<button class="done-toggle' + (state.boughtOpen ? " is-open" : "") + '" data-action="toggle-bought">' +
          svg("chevron", "ico-sm") + "<span>Presi (" + bought.length + ")</span>" +
        "</button>" +
        (state.boughtOpen
          ? '<div class="stack done-stack">' + bought.map(function (s) { return shopItemHtml(s, false); }).join("") +
              '<button class="btn btn-sm btn-ghost btn-block" data-action="clear-bought" style="margin-top:4px">Svuota presi</button>' +
            "</div>"
          : "") +
      "</div>";
    }
    return out;
  }

  function viewSpesa() {
    var all = state.data.shopping.slice();

    var addForm =
      '<form class="shop-add" data-action="add-shop">' +
        '<input class="input" type="text" name="text" placeholder="Cosa serve?" maxlength="80" autocomplete="off" />' +
        '<div class="shop-add-row">' +
          '<input class="input shop-qty" type="text" name="qty" placeholder="Q.tà" maxlength="20" autocomplete="off" />' +
          '<select class="select" name="category" aria-label="Dove comprare">' + shopCatOptions("", "Dove? (categoria)") + "</select>" +
          '<button class="setup-inline-add" type="submit" aria-label="Aggiungi alla lista">' + svg("plus") + "</button>" +
        "</div>" +
      "</form>";

    var body;
    if (all.length === 0) {
      body = emptyState("cart", "Lista vuota", "Aggiungi gli articoli che ti servono con il campo qui sopra.");
    } else {
      body = '<div id="spesa-list">' + spesaListHtml() + "</div>";
    }

    return '<div class="shop-addwrap">' + addForm + "</div>" + body;
  }

  // Riga spesa avvolta nello "swipe-wrap": scorrendola a sinistra compare il
  // pulsante Elimina (niente cestino sempre in vista). hideCat nasconde il tag
  // categoria quando è già implicito (lista raggruppata per categoria).
  function shopItemHtml(s, hideCat) {
    // La riga viene PRIMA del pulsante: così, con z-index, lo copre del tutto a
    // riposo (niente rosso che spunta) e il selettore fratello lo rivela in swipe.
    return '<div class="swipe-wrap">' +
      shopRow(s, hideCat) +
      swipeDelBtn("del-shop", s.id, "Elimina articolo") +
    "</div>";
  }

  function shopRow(s, hideCat) {
    var cat = (s.category && !hideCat) ? '<span class="shop-cat">' + svg("bag", "ico-sm") + "<span>" + h(shopCatLabel(s.category)) + "</span></span>" : "";
    var link = shopLinkTag(s);
    var tags = (cat || link) ? '<span class="shop-tags">' + cat + link + "</span>" : "";
    var note = s.note ? '<span class="shop-note">' + h(s.note) + "</span>" : "";
    return '<div class="shop-row swipe-surface' + (s.done ? " is-done" : "") + '" data-action="open-shop" data-id="' + s.id + '">' +
      '<button class="check-box' + (s.done ? " is-done" : "") + '" data-action="toggle-shop" data-id="' + s.id + '" aria-label="' + (s.done ? "Annulla" : "Segna come preso") + '">' + svg("check", "ico-sm") + "</button>" +
      '<span class="shop-main">' +
        '<span class="shop-text' + (s.done ? " is-done" : "") + '">' + h(s.text) + "</span>" +
        tags + note +
      "</span>" +
      (s.qty ? '<span class="shop-qty-badge mono">' + h(s.qty) + "</span>" : "") +
    "</div>";
  }

  // Modale modifica articolo di spesa
  function openShopModal(item) {
    if (!item) return;
    var inner =
      modalHead("Modifica articolo") +
      '<form class="modal-body" data-action="save-shop" data-id="' + item.id + '">' +
        field("Articolo", '<input class="input" type="text" name="text" maxlength="80" autocomplete="off" value="' + h(item.text) + '" />') +
        '<div class="field-row">' +
          field("Quantità", '<input class="input" type="text" name="qty" maxlength="20" autocomplete="off" placeholder="Q.tà" value="' + h(item.qty) + '" />') +
          field("Dove comprare", '<select class="select" name="category">' + shopCatOptions(item.category, "Nessuna") + "</select>") +
        "</div>" +
        field("Nota", '<textarea class="textarea" name="note" maxlength="200" placeholder="Misura, colore, modello…">' + h(item.note) + "</textarea>") +
        field("Collega a", '<select class="select" name="link">' + linkOptionsHtml(item.linkType, item.linkId) + "</select>") +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" type="button" data-action="modal-close">Annulla</button>' +
          '<button class="btn btn-primary" type="submit">' + svg("check") + "Salva</button>" +
        "</div>" +
      "</form>";
    openModal(inner);
  }
  function saveShop(form) {
    var item = findShop(form.getAttribute("data-id"));
    if (!item) { closeModal(); return; }
    var text = val(form, "text");
    if (!text) { toast("Scrivi cosa serve", "error"); return; }
    item.text = text;
    item.qty = val(form, "qty");
    item.category = val(form, "category");
    item.note = val(form, "note");
    var linkRaw = val(form, "link"), lt = "", li = null;
    if (linkRaw) { var pp = linkRaw.split(":"); lt = pp[0]; li = pp.slice(1).join(":") || null; }
    item.linkType = lt; item.linkId = li;
    persist(); closeModal(); toast("Articolo salvato", "success"); render();
  }

  function shopLinkTag(s) {
    if (!s.linkType || !s.linkId) return "";
    var name = "", icon = "";
    if (s.linkType === "room") { var r = findRoom(s.linkId); if (!r) return ""; name = r.name; icon = "door"; }
    else if (s.linkType === "task") { var t = findTask(s.linkId); if (!t) return ""; name = t.title; icon = "listcheck"; }
    else if (s.linkType === "idea") { var i = findIdea(s.linkId); if (!i) return ""; name = i.title; icon = "bulb"; }
    else return "";
    return '<span class="shop-room">' + svg(icon, "ico-sm") + "<span>" + h(name) + "</span></span>";
  }

  function linkOptionsHtml(selType, selId) {
    function group(label, arr, type, nameFn) {
      if (!arr.length) return "";
      return '<optgroup label="' + label + '">' + arr.map(function (o) {
        var sel = (type === selType && o.id === selId) ? " selected" : "";
        return '<option value="' + type + ":" + o.id + '"' + sel + ">" + h(nameFn(o)) + "</option>";
      }).join("") + "</optgroup>";
    }
    return '<option value="">Senza collegamento</option>' +
      group("Stanze", rooms(), "room", function (r) { return r.name; }) +
      group("Lavori", state.data.tasks, "task", function (t) { return t.title; }) +
      group("Progetti", state.data.ideas, "idea", function (i) { return i.title; });
  }

  // ---------- OPZIONI ----------
  // Router della pagina Opzioni: menu principale + sotto-sezioni (menu ad albero).
  function viewOpzioni(section) {
    if (section === "aspetto") return optSectionAspetto();
    if (section === "backup") return optSectionBackup();
    if (section === "diagnostica") return optSectionDiagnostica();
    return optMenuRoot();
  }

  // Menu principale: solo le categorie, ognuna apre la propria pagina.
  function optMenuRoot() {
    var d = state.data;
    return '<div class="opt-group opt-menu">' +
        optSectionRow("aspetto", "palette", "Aspetto", "Tema e colore accento") +
        optRow("manage-floors", "layers", "Gestione casa", d.house.floors.length + " piani · " + d.house.rooms.length + " stanze") +
        optSectionRow("backup", "cloud", "Backup e dati", "Esporta/importa e Google Drive") +
        optSectionRow("diagnostica", "info", "Diagnostica", "Stato dei dati e reset") +
      "</div>" +
      '<p class="opt-version">Home App · versione ' + h(d.version) + "</p>";
  }

  // Riga che apre una sotto-sezione (#opzioni/<section>).
  function optSectionRow(section, icon, label, sub) {
    return '<button class="opt-row" data-action="go-opt" data-section="' + section + '">' +
      '<span class="opt-ico">' + svg(icon) + "</span>" +
      '<span class="opt-main"><span class="opt-label">' + label + "</span>" +
      '<span class="opt-sub">' + sub + "</span></span>" +
      '<span class="opt-trail">' + svg("chevron") + "</span></button>";
  }

  function optSectionAspetto() {
    var s = state.data.settings;
    var accentSwatches = CONFIG.ACCENTS.map(function (c) {
      return '<button class="color-opt' + (sameHex(c, s.accentColor) ? " is-active" : "") +
        '" data-action="set-accent" data-color="' + c + '" style="background:' + c + '" aria-label="Accento ' + c + '"></button>';
    }).join("");
    return '<div class="opt-group">' +
        '<button class="opt-row" data-action="toggle-theme">' +
          '<span class="opt-ico">' + svg(s.theme === "light" ? "sun" : "moon") + "</span>" +
          '<span class="opt-main"><span class="opt-label">Tema ' + (s.theme === "light" ? "chiaro" : "scuro") + "</span>" +
          '<span class="opt-sub">Tocca per cambiare</span></span>' +
          '<span class="switch ' + (s.theme === "light" ? "" : "is-on") + '"></span>' +
        "</button>" +
        '<div class="accent-row">' +
          '<div class="accent-label">Colore accento</div>' +
          '<div class="color-picker">' + accentSwatches + "</div>" +
        "</div>" +
      "</div>";
  }

  function optSectionBackup() {
    return '<div class="opt-group">' +
        '<div class="opt-group-title">File JSON</div>' +
        optRow("export-json", "download", "Esporta JSON", "Scarica un backup dei dati") +
        optRow("import-json", "upload", "Importa JSON", "Ripristina da un file di backup") +
      "</div>" +
      cloudOptGroup();
  }

  function optSectionDiagnostica() {
    var d = state.data;
    return '<div class="diag">' +
        diagRow("Versione app", d.version) +
        diagRow("Piani / aree", String(d.house.floors.length)) +
        diagRow("Stanze", String(d.house.rooms.length)) +
        diagRow("Lavori", String(d.tasks.length)) +
        diagRow("Progetti", String(d.ideas.length)) +
        diagRow("Voci spesa", String(d.shopping.length)) +
        diagRow("Chiave storage", CONFIG.STORAGE_KEY) +
        diagRow("Ultimo agg.", formatDateTime(d.updatedAt)) +
      "</div>" +
      '<div class="opt-group" style="margin-top:16px">' +
        '<div class="opt-group-title">Zona pericolosa</div>' +
        '<button class="opt-row is-danger" data-action="reset-data">' +
          '<span class="opt-ico is-danger">' + svg("trash") + "</span>" +
          '<span class="opt-main"><span class="opt-label">Reset dati</span>' +
          '<span class="opt-sub">Elimina tutto e torna alla configurazione</span></span>' +
        "</button>" +
      "</div>";
  }

  function optRow(action, icon, label, sub) {
    return '<button class="opt-row" data-action="' + action + '">' +
      '<span class="opt-ico">' + svg(icon) + "</span>" +
      '<span class="opt-main"><span class="opt-label">' + label + "</span>" +
      '<span class="opt-sub">' + sub + "</span></span>" +
      '<span class="opt-trail">' + svg("chevron") + "</span></button>";
  }
  function diagRow(k, v) {
    return '<div class="diag-row"><span class="dg-key">' + k + '</span><span class="dg-val">' + h(v) + "</span></div>";
  }

  // Sezione "Backup cloud · Google Drive" in Opzioni (3 stati: non configurato / non connesso / connesso).
  function cloudOptGroup() {
    var html = '<div class="opt-group"><div class="opt-group-title">Backup cloud · Google Drive</div>';

    if (!gdConfigured()) {
      html +=
        '<div class="diag"><div class="diag-row" style="display:block">' +
          '<span class="dg-key">Non configurato</span>' +
          '<div class="opt-sub" style="margin-top:6px;white-space:normal">Inserisci il tuo OAuth Client ID in <strong>CONFIG.GDRIVE.CLIENT_ID</strong> (app.js) per attivare il backup su Drive.</div>' +
        "</div></div></div>";
      return html;
    }

    if (!gdConnected()) {
      html += optRow("gdrive-connect", "cloud", "Collega Google Drive", "Accedi per abilitare il backup");
      html +=
        '<div class="diag"><div class="diag-row" style="display:block">' +
          '<span class="dg-key">Redirect URI da registrare</span>' +
          '<div class="dg-val" style="margin-top:4px;word-break:break-all">' + h(gdRedirectUri()) + "</div>" +
        "</div></div></div>";
      return html;
    }

    var last = localStorage.getItem(GD.LAST_KEY);
    html +=
      '<button class="opt-row" data-action="gdrive-toggle-auto">' +
        '<span class="opt-ico">' + svg("refresh") + "</span>" +
        '<span class="opt-main"><span class="opt-label">Backup automatico</span>' +
        '<span class="opt-sub">Salva su Drive a ogni modifica</span></span>' +
        '<span class="switch ' + (gdAutoEnabled() ? "is-on" : "") + '"></span>' +
      "</button>" +
      optRow("gdrive-backup-now", "cloudUp", "Esegui backup ora", "Carica i dati attuali su Drive") +
      optRow("gdrive-restore", "download", "Ripristina da Drive", "Sovrascrive i dati locali col backup cloud") +
      '<button class="opt-row is-danger" data-action="gdrive-disconnect">' +
        '<span class="opt-ico is-danger">' + svg("x") + "</span>" +
        '<span class="opt-main"><span class="opt-label">Scollega Drive</span>' +
        '<span class="opt-sub">Rimuove l\'accesso da questo dispositivo</span></span>' +
      "</button>" +
      '<div class="diag">' +
        diagRow("Stato", "Connesso") +
        diagRow("Ultimo backup cloud", last ? formatDateTime(last) : "mai") +
        '<div class="diag-row"><span class="dg-key">Sincronizzazione</span>' +
          '<span class="dg-val" style="color:' + (gdInSync() ? "var(--success)" : "var(--warning,#f5a623)") + '">' +
          (gdInSync() ? "✓ Allineato" : "In attesa di backup…") + "</span></div>" +
      "</div>";
    html += "</div>";
    return html;
  }

  /* ==========================================================
     MODALS
     ========================================================== */
  function openModal(inner) {
    elModal.innerHTML =
      '<div class="modal-overlay" data-action="modal-close"></div>' +
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-grabber"></div>' + inner + "</div>";
    elModal.classList.add("is-open");
  }
  function closeModal() {
    elModal.classList.remove("is-open");
    elModal.innerHTML = "";
    pendingConfirm = null;
    pendingCancel = null;
  }
  function modalHead(title, closeAction) {
    return '<div class="modal-head"><h2>' + title + "</h2>" +
      '<button class="icon-btn" data-action="' + (closeAction || "modal-close") + '" aria-label="Chiudi">' + svg("x") + "</button></div>";
  }

  // --- LAVORO ---
  function openTaskModal(task, presetRoomId) {
    var isEdit = !!task;
    var sel = task ? (task.roomIds || []) : (presetRoomId ? [presetRoomId] : []);
    var inner =
      modalHead(isEdit ? "Modifica lavoro" : "Nuovo lavoro") +
      '<form class="modal-body" data-action="save-task" data-id="' + (task ? task.id : "") + '">' +
        field("Titolo", '<input class="input" type="text" name="title" maxlength="80" autocomplete="off" placeholder="Es. Riparare rubinetto" value="' + h(task ? task.title : "") + '" />') +
        '<div class="field"><label>Stanze</label>' + roomChipsSelector(sel) +
          '<div class="field-hint">Tocca per assegnare a una o più stanze (facoltativo).</div></div>' +
        field("Priorità", select("priority", optionsFrom(PRIO_LABEL, task ? task.priority : "media"))) +
        (isEdit ? "" : '<div class="field-hint" style="margin-top:-4px">Il nuovo lavoro parte come <strong>Da fare</strong>. Lo stato si cambia poi dalla pagina del lavoro.</div>') +
        '<div class="field"><label>Scadenza (facoltativa)</label>' +
          '<div class="due-field">' +
            '<input class="input" type="date" name="dueDate" value="' + h(task ? task.dueDate : "") + '" />' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="clear-due">Rimuovi</button>' +
          "</div></div>" +
        field("Descrizione", '<textarea class="textarea" name="description" maxlength="600" placeholder="Dettagli (facoltativo)">' + h(task ? task.description : "") + "</textarea>") +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" type="button" data-action="modal-close">Annulla</button>' +
          '<button class="btn btn-primary" type="submit">' + svg("check") + "Salva</button>" +
        "</div>" +
      "</form>";
    openModal(inner);
  }

  // --- IDEA ---
  function openIdeaModal(idea, presetRoomId) {
    var isEdit = !!idea;
    var sel = idea ? (idea.roomIds || []) : (presetRoomId ? [presetRoomId] : []);
    var inner =
      modalHead(isEdit ? "Modifica progetto" : "Nuovo progetto") +
      '<form class="modal-body" data-action="save-idea" data-id="' + (idea ? idea.id : "") + '">' +
        field("Titolo", '<input class="input" type="text" name="title" maxlength="80" autocomplete="off" placeholder="Es. Parete attrezzata" value="' + h(idea ? idea.title : "") + '" />') +
        '<div class="field"><label>Stanze</label>' + roomChipsSelector(sel) +
          '<div class="field-hint">Tocca per assegnare a una o più stanze (facoltativo).</div></div>' +
        '<div class="field-row">' +
          field("Stato", select("status", optionsFrom(IDEA_LABEL, idea ? idea.status : "bozza"))) +
          field("Stima costo", '<input class="input" type="text" name="cost" inputmode="decimal" maxlength="20" autocomplete="off" placeholder="Es. 1200 €" value="' + h(idea ? idea.cost : "") + '" />') +
        "</div>" +
        field("Link di riferimento", '<input class="input" type="url" name="link" maxlength="300" autocomplete="off" inputmode="url" placeholder="https://… (facoltativo)" value="' + h(idea ? idea.link : "") + '" />') +
        field("Descrizione", '<textarea class="textarea" name="description" maxlength="600" placeholder="Descrivi il progetto (facoltativo)">' + h(idea ? idea.description : "") + "</textarea>") +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" type="button" data-action="modal-close">Annulla</button>' +
          '<button class="btn btn-primary" type="submit">' + svg("check") + "Salva</button>" +
        "</div>" +
      "</form>";
    openModal(inner);
  }

  // --- GESTIONE PIANI ---
  function openManageFloors() {
    state.manageFloorId = null;
    var fl = floors();
    var list = fl.length
      ? '<div class="stack">' + fl.map(function (f) {
          return '<div class="manage-item">' +
            '<button class="mi-tap" data-action="manage-floor-rooms" data-id="' + f.id + '" aria-label="Gestisci ' + h(f.name) + '">' +
              '<span class="mi-swatch" style="background:var(--accent)">' + svg("layers", "ico-sm") + "</span>" +
              '<span class="mi-main"><span class="mi-name">' + h(f.name) + "</span>" +
              '<span class="mi-sub">' + roomsOf(f.id).length + " stanze</span></span>" +
              '<span class="mi-chevron">' + svg("chevron") + "</span>" +
            "</button>" +
          "</div>";
        }).join("") + "</div>"
      : emptyState("layers", "Nessun piano/area", "Aggiungine uno qui sotto.");
    var inner =
      modalHead("Piani / Aree") +
      '<div class="modal-body">' + list +
        '<button class="btn btn-primary btn-block" style="margin-top:14px" data-action="add-floor-form">' + svg("plus") + "Aggiungi piano/area</button>" +
      "</div>";
    openModal(inner);
  }

  // Drill-down: stanze di un singolo piano + gestione del piano stesso
  function openManageRoomsOfFloor(floorId) {
    state.manageFloorId = floorId;
    var f = findFloor(floorId);
    if (!f) { openManageFloors(); return; }
    var rs = roomsOf(floorId);
    var list = rs.length
      ? '<div class="stack">' + rs.map(function (r) {
          return '<div class="manage-item">' +
            '<span class="mi-swatch" style="background:' + h(r.color) + '">' + svg(roomIcon(r.icon), "ico-sm") + "</span>" +
            '<span class="mi-main"><span class="mi-name">' + h(r.name) + "</span></span>" +
            '<span class="mi-actions">' +
              iconBtn("edit-room-form", r.id, "pencil", "Modifica stanza") +
              iconBtn("del-room", r.id, "trash", "Elimina stanza", true) +
            "</span></div>";
        }).join("") + "</div>"
      : emptyState("door", "Nessuna stanza", "Aggiungi la prima stanza di questo piano.");
    var inner =
      '<div class="modal-head">' +
        '<button class="icon-btn" data-action="manage-floors" aria-label="Torna ai piani">' + svg("back") + "</button>" +
        '<h2 class="grow" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + h(f.name) + "</h2>" +
      "</div>" +
      '<div class="modal-body">' +
        '<div class="row" style="gap:10px;margin-bottom:14px">' +
          '<button class="btn btn-sm btn-ghost grow" data-action="edit-floor-form" data-id="' + f.id + '">' + svg("pencil") + "Rinomina</button>" +
          '<button class="btn btn-sm btn-danger grow" data-action="del-floor" data-id="' + f.id + '">' + svg("trash") + "Elimina piano</button>" +
        "</div>" +
        '<div class="opt-group-title" style="padding:0 0 8px">Stanze</div>' +
        list +
        '<button class="btn btn-primary btn-block" style="margin-top:14px" data-action="add-room-to-floor" data-floor="' + f.id + '">' + svg("plus") + "Aggiungi stanza</button>" +
      "</div>";
    openModal(inner);
  }

  // Ritorno dopo il form piano: alla lista piani (nuovo) o al piano in gestione (rinomina)
  function backFromFloorForm() {
    if (state.manageFloorId) openManageRoomsOfFloor(state.manageFloorId);
    else openManageFloors();
  }

  function openFloorModal(floor) {
    var isEdit = !!floor;
    var inner =
      modalHead(isEdit ? "Modifica piano/area" : "Nuovo piano/area", "back-floor-form") +
      '<form class="modal-body" data-action="save-floor" data-id="' + (floor ? floor.id : "") + '">' +
        field("Nome", '<input class="input" type="text" name="name" maxlength="40" autocomplete="off" placeholder="Es. Primo Piano" value="' + h(floor ? floor.name : "") + '" />') +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" type="button" data-action="back-floor-form">Annulla</button>' +
          '<button class="btn btn-primary" type="submit">' + svg("check") + "Salva</button>" +
        "</div>" +
      "</form>";
    openModal(inner);
  }

  function openRoomModal(room, presetFloorId) {
    var isEdit = !!room;
    var fl = floors();
    var curFloor = room ? room.floorId : (presetFloorId || fl[0].id);
    var curIcon = room ? roomIcon(room.icon) : "living";
    var curColor = room ? room.color : CONFIG.ROOM_COLORS[0];

    var iconPicker = '<div class="icon-picker">' + ROOM_ICON_KEYS.map(function (k) {
      return '<button type="button" class="icon-opt' + (k === curIcon ? " is-active" : "") +
        '" data-action="pick-icon" data-icon="' + k + '" aria-label="Icona ' + k + '">' + svg(k) + "</button>";
    }).join("") + "</div>";

    var colorPicker = '<div class="color-picker">' + CONFIG.ROOM_COLORS.map(function (c) {
      return '<button type="button" class="color-opt' + (sameHex(c, curColor) ? " is-active" : "") +
        '" data-action="pick-color" data-color="' + c + '" style="background:' + c + '" aria-label="Colore ' + c + '"></button>';
    }).join("") + "</div>";

    var inner =
      modalHead(isEdit ? "Modifica stanza" : "Nuova stanza", "back-rooms") +
      '<form class="modal-body" data-action="save-room" data-id="' + (room ? room.id : "") + '">' +
        field("Nome", '<input class="input" type="text" name="name" maxlength="40" autocomplete="off" placeholder="Es. Cucina" value="' + h(room ? room.name : "") + '" />') +
        field("Piano / area", select("floorId", floorOptions(curFloor))) +
        '<input type="hidden" name="icon" value="' + curIcon + '" />' +
        field("Icona", iconPicker) +
        '<input type="hidden" name="color" value="' + curColor + '" />' +
        field("Colore", colorPicker) +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" type="button" data-action="back-rooms">Annulla</button>' +
          '<button class="btn btn-primary" type="submit">' + svg("check") + "Salva</button>" +
        "</div>" +
      "</form>";
    openModal(inner);
  }

  // --- CONFERMA ---
  function openConfirm(opts) {
    pendingConfirm = opts.onConfirm || null;
    pendingCancel = opts.onCancel || null;
    var inner =
      modalHead(opts.title || "Conferma", "confirm-no") +
      '<div class="modal-body">' +
        '<p class="confirm-text">' + opts.message + "</p>" +
        (opts.warn ? '<div class="confirm-warn">' + svgRaw("alert", "ico-sm") + " " + opts.warn + "</div>" : "") +
        '<div class="modal-actions">' +
          '<button class="btn btn-ghost" data-action="confirm-no">Annulla</button>' +
          '<button class="btn btn-danger" data-action="confirm-yes">' + (opts.confirmLabel || "Elimina") + "</button>" +
        "</div>" +
      "</div>";
    openModal(inner);
  }

  // Menu a comparsa dal basso per scegliere l'ordinamento (lavori o idee).
  function openSortSheet(kind) {
    var sorts = kind === "task" ? TASK_SORTS : IDEA_SORTS;
    var cur = kind === "task" ? taskSort() : ideaSort();
    var rows = sorts.map(function (s) {
      var on = s[0] === cur;
      var hint = s[0] === "manuale" ? '<span class="sort-opt-hint">trascina le card per ordinarle</span>' : "";
      return '<button class="sort-opt' + (on ? " is-active" : "") + '" data-action="set-sort" data-kind="' + kind + '" data-sort="' + s[0] + '">' +
        '<span class="sort-opt-main">' + h(s[1]) + hint + "</span>" +
        (on ? svg("check", "ico-sm") : "") +
        "</button>";
    }).join("");
    openModal(
      modalHead(kind === "task" ? "Ordina i lavori" : "Ordina i progetti") +
      '<div class="modal-body sort-list">' + rows + "</div>"
    );
  }

  /* ==========================================================
     ACTIONS (event delegation: un solo gestore)
     ========================================================== */
  function handleAction(action, node, event) {
    var id = node.getAttribute ? node.getAttribute("data-id") : null;

    switch (action) {
      /* --- navigazione --- */
      case "go": navigate("#" + node.getAttribute("data-route")); break;
      case "go-attention": state.filterPrio = node.getAttribute("data-prio") || "tutti"; navigate("#lavori"); break;
      case "gd-indicator": if (gdConnected()) navigate("#opzioni/backup"); else gdConnect(); break;
      case "go-opt": navigate("#opzioni/" + node.getAttribute("data-section")); break;
      case "opzioni-root": navigate("#opzioni"); break;
      case "open-room": navigate("#stanza/" + id); break;
      case "open-task": navigate("#lavoro/" + id); break;
      case "open-idea": navigate("#idea/" + id); break;
      case "back-home": navigate("#home"); break;
      case "back-task": if (window.history.length > 1) window.history.back(); else navigate("#lavori"); break;
      case "back-idea": if (window.history.length > 1) window.history.back(); else navigate("#idee"); break;

      /* --- setup (CONFIGURA CASA) --- */
      case "setup-add-floor": {
        var fn = val(node, "floorName");
        if (!fn) { toast("Inserisci un nome", "error"); return; }
        state.data.house.floors.push(createFloor(fn));
        persist(); toast("Piano creato", "success"); renderSetup();
        break;
      }
      case "setup-del-floor": deleteFloor(id); renderSetup(); break;
      case "setup-add-room": {
        var rn = val(node, "roomName");
        var fid = val(node, "floorId");
        if (!rn) { toast("Inserisci un nome", "error"); return; }
        if (!fid) { toast("Seleziona un piano", "error"); return; }
        state.data.house.rooms.push(createRoom(rn, fid));
        persist(); toast("Stanza creata", "success"); renderSetup();
        break;
      }
      case "setup-del-room": deleteRoom(id); renderSetup(); break;
      case "setup-enter":
        if (node.getAttribute("aria-disabled") === "true") return;
        if (needsSetup()) { toast("Crea almeno un piano e una stanza", "error"); return; }
        navigate("#home");
        break;

      /* --- lavori --- */
      case "filter-prio":
        if (Date.now() < segSuppressUntil) break; // arriva da un drag: già gestito
        state.filterPrio = node.getAttribute("data-prio"); render(); break;

      /* --- ordinamento liste + sezioni comprimibili --- */
      case "open-sort": openSortSheet(node.getAttribute("data-kind")); break;
      case "set-sort":
        setSort(node.getAttribute("data-kind"), node.getAttribute("data-sort"));
        closeModal(); render(); break;
      case "toggle-done": state.doneOpen = !state.doneOpen; keepScroll = true; render(); break;
      case "toggle-arch": state.archOpen = !state.archOpen; keepScroll = true; render(); break;
      case "toggle-bought": state.boughtOpen = !state.boughtOpen; keepScroll = true; render(); break;
      case "reorder-handle": break; // no-op: serve solo a non aprire il dettaglio
      case "add-task": openTaskModal(null, null); break;
      case "add-task-room": openTaskModal(null, node.getAttribute("data-room")); break;
      case "edit-task": openTaskModal(findTask(id), null); break;
      case "set-task-status":
      case "set-idea-status":
        if (Date.now() < segSuppressUntil) break; // arriva da un pointer: già gestito
        setStatusInPlace(node);
        break;
      case "del-task": {
        var t = findTask(id);
        openConfirm({
          title: "Elimina lavoro",
          message: "Vuoi eliminare il lavoro <strong>" + h(t.title) + "</strong>?",
          onConfirm: function () {
            unlinkShopping("task", id);
            state.data.tasks = state.data.tasks.filter(function (x) { return x.id !== id; });
            persist(); closeModal(); toast("Dati eliminati", "success");
            if (parseHash().name === "lavoro") navigate("#lavori"); else render();
          }
        });
        break;
      }
      case "save-task": saveTask(node); break;

      /* --- checklist del lavoro (pagina dettaglio) --- */
      case "add-check": {
        var ctext = val(node, "text");
        if (!ctext) return;
        var cowner = currentChecklistOwner();
        if (!cowner) return;
        if (!Array.isArray(cowner.checklist)) cowner.checklist = [];
        cowner.checklist.push(createCheckItem(ctext));
        cowner.updatedAt = nowISO();
        persist(); render();
        break;
      }
      case "toggle-check": {
        var towner = currentChecklistOwner();
        if (!towner) break;
        var citem = (towner.checklist || []).filter(function (c) { return c.id === id; })[0];
        if (citem) { citem.done = !citem.done; towner.updatedAt = nowISO(); persist(); render(); }
        break;
      }
      case "del-check": {
        var downer = currentChecklistOwner();
        if (!downer) break;
        downer.checklist = (downer.checklist || []).filter(function (c) { return c.id !== id; });
        downer.updatedAt = nowISO();
        persist(); render();
        break;
      }

      /* --- lista spesa --- */
      case "add-shop": {
        var stext = val(node, "text");
        if (!stext) { toast("Scrivi cosa serve", "error"); return; }
        var linkRaw = val(node, "link");
        var linkType = "", linkId = null;
        if (linkRaw) { var pp = linkRaw.split(":"); linkType = pp[0]; linkId = pp.slice(1).join(":") || null; }
        state.data.shopping.push(createShopItem({ text: stext, qty: val(node, "qty"), category: val(node, "category"), linkType: linkType, linkId: linkId }));
        persist(); render();
        break;
      }
      case "open-shop": openShopModal(findShop(id)); break;
      case "save-shop": saveShop(node); break;
      case "toggle-shop": { var sh = findShop(id); if (sh) { sh.done = !sh.done; persist(); render(); } break; }
      case "del-shop": {
        state.data.shopping = state.data.shopping.filter(function (x) { return x.id !== id; });
        persist(); toast("Articolo eliminato", "success"); render();
        break;
      }
      case "clear-bought": {
        state.data.shopping = state.data.shopping.filter(function (x) { return !x.done; });
        persist(); toast("Presi rimossi", "success"); render();
        break;
      }

      /* --- idee --- */
      case "add-idea": openIdeaModal(null, null); break;
      case "add-idea-room": openIdeaModal(null, node.getAttribute("data-room")); break;
      case "edit-idea": openIdeaModal(findIdea(id), null); break;
      case "del-idea": {
        var ii = findIdea(id);
        openConfirm({
          title: "Elimina progetto",
          message: "Vuoi eliminare il progetto <strong>" + h(ii.title) + "</strong>?",
          onConfirm: function () {
            unlinkShopping("idea", id);
            state.data.ideas = state.data.ideas.filter(function (x) { return x.id !== id; });
            persist(); closeModal(); toast("Dati eliminati", "success");
            if (parseHash().name === "idea") navigate("#idee"); else render();
          }
        });
        break;
      }
      case "save-idea": saveIdea(node); break;

      /* --- opzioni: aspetto --- */
      case "toggle-theme":
        state.data.settings.theme = state.data.settings.theme === "light" ? "dark" : "light";
        persist(); render();
        break;
      case "set-accent":
        state.data.settings.accentColor = node.getAttribute("data-color");
        persist(); render();
        break;

      /* --- opzioni: dati --- */
      case "export-json": exportJSON(); break;
      case "import-json": importJSON(); break;

      /* --- opzioni: backup cloud (Google Drive) --- */
      case "gdrive-connect": gdConnect(); break;
      case "gdrive-backup-now": gdBackupNow(false); break;
      case "gdrive-toggle-auto":
        gdSetAuto(!gdAutoEnabled());
        if (gdAutoEnabled()) { toast("Backup automatico attivo", "success"); gdBackupNow(true); }
        render();
        break;
      case "gdrive-restore":
        openConfirm({
          title: "Ripristina da Drive",
          message: "I dati locali verranno <strong>sovrascritti</strong> con il backup salvato su Google Drive.",
          warn: "Operazione non annullabile.",
          confirmLabel: "Ripristina",
          onConfirm: function () { closeModal(); gdRestore(); }
        });
        break;
      case "gdrive-disconnect":
        openConfirm({
          title: "Scollega Drive",
          message: "Vuoi rimuovere l'accesso a Google Drive da questo dispositivo?",
          confirmLabel: "Scollega",
          onConfirm: function () { closeModal(); gdDisconnect(); }
        });
        break;
      case "reset-data":
        openConfirm({
          title: "Reset dati",
          message: "Verranno eliminati <strong>tutti</strong> i dati: piani, stanze, lavori e progetti.",
          warn: "L'app tornerà alla schermata di configurazione. Operazione non annullabile.",
          confirmLabel: "Elimina tutto",
          onConfirm: function () {
            state.data = createDefaultData();
            persist(); closeModal(); toast("Dati eliminati", "success");
            location.hash = ""; render();
          }
        });
        break;

      /* --- gestione piani e stanze (drill-down) --- */
      case "manage-floors": openManageFloors(); break;
      case "manage-floor-rooms": openManageRoomsOfFloor(id); break;
      case "add-floor-form": openFloorModal(null); break;
      case "edit-floor-form": openFloorModal(findFloor(id)); break;
      case "save-floor": saveFloor(node); break;
      case "back-floor-form": backFromFloorForm(); break;
      case "del-floor": {
        var f = findFloor(id);
        var nR = roomsOf(id).length;
        openConfirm({
          title: "Elimina piano/area",
          message: "Vuoi eliminare <strong>" + h(f.name) + "</strong>?",
          warn: nR > 0 ? ("Verranno eliminate anche " + nR + " stanze e tutti i lavori/progetti collegati.") : "",
          onConfirm: function () { deleteFloor(id); toast("Dati eliminati", "success"); state.manageFloorId = null; render(); openManageFloors(); },
          onCancel: function () { openManageRoomsOfFloor(state.manageFloorId); }
        });
        break;
      }
      case "add-room-to-floor": openRoomModal(null, node.getAttribute("data-floor")); break;
      case "edit-room-form": openRoomModal(findRoom(id)); break;
      case "save-room": saveRoom(node); break;
      case "back-rooms": openManageRoomsOfFloor(state.manageFloorId); break;
      case "del-room": {
        var r = findRoom(id);
        var inT = tasksOf(id), inI = ideasOf(id);
        var delN = inT.filter(function (t) { return t.roomIds.length === 1; }).length +
                   inI.filter(function (i) { return i.roomIds.length === 1; }).length;
        var moveN = (inT.length + inI.length) - delN;
        var w = "";
        if (delN > 0) w += "Verranno eliminati " + delN + " elementi presenti solo in questa stanza.";
        if (moveN > 0) w += (w ? " " : "") + "Altri " + moveN + " resteranno (scollegati da questa stanza).";
        openConfirm({
          title: "Elimina stanza",
          message: "Vuoi eliminare <strong>" + h(r.name) + "</strong>?",
          warn: w,
          onConfirm: function () { deleteRoom(id); toast("Dati eliminati", "success"); render(); openManageRoomsOfFloor(state.manageFloorId); },
          onCancel: function () { openManageRoomsOfFloor(state.manageFloorId); }
        });
        break;
      }

      /* --- pickers dentro modale stanza --- */
      case "pick-icon": pickInGroup(node, "icon-opt", "icon"); break;
      case "pick-color": pickInGroup(node, "color-opt", "color"); break;
      case "toggle-room-chip": node.classList.toggle("is-active"); updateFloorCount(node); break;
      case "toggle-floor-group": { var g = node.closest(".chip-floor-group"); if (g) g.classList.toggle("is-open"); break; }
      case "clear-due": { var di = elModal.querySelector('input[name="dueDate"]'); if (di) di.value = ""; break; }

      /* --- modale/conferma generici --- */
      case "modal-close": closeModal(); break;
      case "app-update": applyUpdate(); break;

      case "confirm-yes": { var fn2 = pendingConfirm; pendingConfirm = null; if (fn2) fn2(); break; }
      case "confirm-no": { var fc = pendingCancel; pendingCancel = null; pendingConfirm = null; if (fc) fc(); else closeModal(); break; }
    }
  }

  // --- salvataggi form ---
  function saveTask(form) {
    var title = val(form, "title");
    if (!title) { toast("Inserisci un titolo", "error"); return; }
    var roomIds = readSelectedRooms();
    var priority = val(form, "priority") || "media";
    var description = val(form, "description");
    var dueDate = val(form, "dueDate");
    var id = form.getAttribute("data-id");
    if (id) {
      var t = findTask(id);
      // Lo stato NON si modifica da qui: si cambia dalla pagina del lavoro.
      t.title = title; t.roomIds = roomIds; t.priority = priority;
      t.description = description; t.dueDate = dueDate; t.updatedAt = nowISO();
    } else {
      // Ogni nuovo lavoro parte come "da fare" (default di createTask).
      state.data.tasks.push(createTask({ title: title, roomIds: roomIds, priority: priority, description: description, dueDate: dueDate }));
    }
    persist(); closeModal(); toast("Lavoro salvato", "success"); render();
  }

  function saveIdea(form) {
    var title = val(form, "title");
    if (!title) { toast("Inserisci un titolo", "error"); return; }
    var roomIds = readSelectedRooms();
    var status = val(form, "status") || "bozza";
    var description = val(form, "description");
    var cost = val(form, "cost");
    var link = normalizeUrl(val(form, "link"));
    var id = form.getAttribute("data-id");
    if (id) {
      var i = findIdea(id);
      i.title = title; i.roomIds = roomIds; i.status = status; i.description = description;
      i.cost = cost; i.link = link; i.updatedAt = nowISO();
    } else {
      state.data.ideas.push(createIdea({ title: title, roomIds: roomIds, status: status, description: description, cost: cost, link: link }));
    }
    persist(); closeModal(); toast("Progetto salvato", "success"); render();
  }

  function saveFloor(form) {
    var name = val(form, "name");
    if (!name) { toast("Inserisci un nome", "error"); return; }
    var id = form.getAttribute("data-id");
    if (id) { var f = findFloor(id); f.name = name; toast("Piano salvato", "success"); }
    else { state.data.house.floors.push(createFloor(name)); toast("Piano creato", "success"); }
    persist(); render(); backFromFloorForm();
  }

  function saveRoom(form) {
    var name = val(form, "name");
    if (!name) { toast("Inserisci un nome", "error"); return; }
    var floorId = val(form, "floorId");
    var icon = val(form, "icon") || "door";
    var color = val(form, "color") || CONFIG.DEFAULT_ACCENT;
    var id = form.getAttribute("data-id");
    if (id) {
      var r = findRoom(id);
      // Le note non sono più modificabili dal form: si conservano invariate.
      r.name = name; r.floorId = floorId; r.icon = icon; r.color = color;
      toast("Stanza salvata", "success");
    } else {
      state.data.house.rooms.push(createRoom(name, floorId, { icon: icon, color: color }));
      toast("Stanza creata", "success");
    }
    persist(); render(); openManageRoomsOfFloor(state.manageFloorId);
  }

  // Aggiorna selezione icona/colore dentro la modale stanza
  function pickInGroup(node, optClass, hiddenName) {
    var group = node.parentNode;
    var opts = group.querySelectorAll("." + optClass);
    for (var i = 0; i < opts.length; i++) opts[i].classList.remove("is-active");
    node.classList.add("is-active");
    var value = node.getAttribute(hiddenName === "icon" ? "data-icon" : "data-color");
    var hidden = elModal.querySelector('input[name="' + hiddenName + '"]');
    if (hidden) hidden.value = value;
  }

  /* ==========================================================
     SERVICES
     ========================================================== */
  function exportJSON() {
    try {
      var json = JSON.stringify(state.data, null, 2);
      var blob = new Blob([json], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "casa-app-backup-" + dateStamp() + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
      toast("Dati esportati", "success");
    } catch (e) {
      toast("Errore durante l'esportazione", "error");
    }
  }

  function importJSON() {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    function cleanup() { if (input.parentNode) input.parentNode.removeChild(input); }
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) { cleanup(); return; }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(String(reader.result));
          if (!validateImport(obj)) { toast("Errore JSON non valido", "error"); cleanup(); return; }
          state.data = normalizeData(obj);
          persist();
          toast("JSON importato", "success");
          location.hash = needsSetup() ? "" : "#home";
          render();
        } catch (e) {
          toast("Errore JSON non valido", "error");
        }
        cleanup();
      };
      reader.onerror = function () { toast("Errore JSON non valido", "error"); cleanup(); };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
  }

  function validateImport(obj) {
    if (!obj || typeof obj !== "object") return false;
    if (!obj.house || typeof obj.house !== "object") return false;
    if (!Array.isArray(obj.house.floors) || !Array.isArray(obj.house.rooms)) return false;
    if (!Array.isArray(obj.tasks) || !Array.isArray(obj.ideas)) return false;
    return true;
  }

  /* ==========================================================
     GOOGLE DRIVE SYNC
     OAuth 2.0 implicit flow con redirect a pagina intera
     (adatto alla PWA installata su iPhone/iPad), nessuna libreria,
     nessun backend, nessun client secret. Il token (~1h) sta in
     localStorage; il backup è un file JSON ("casa-app-backup.json")
     creato dall'app sul Drive dell'utente. Con lo scope drive.file
     l'app vede solo i file che ha creato lei.
     ========================================================== */
  var GD = {
    TOKEN_KEY: "casa-app-gdrive-token",
    EXPIRY_KEY: "casa-app-gdrive-expiry",
    AUTO_KEY: "casa-app-gdrive-auto",
    LAST_KEY: "casa-app-gdrive-last",
    RETURN_KEY: "casa-app-gdrive-return",
    autoTimer: null,
    popup: null,        // riferimento alla finestra popup di login
    lastConnectAt: 0,   // anti doppio "collegato" (message + storage)
    closing: false      // true se QUESTA pagina è il popup che deve chiudersi
  };

  function gdConfigured() { return !!(CONFIG.GDRIVE && CONFIG.GDRIVE.CLIENT_ID); }

  // L'URL della pagina (senza hash) deve combaciare ESATTAMENTE con un
  // "URI di reindirizzamento autorizzato" registrato sulla Google Console.
  function gdRedirectUri() { return location.origin + location.pathname; }

  function gdToken() {
    var t = localStorage.getItem(GD.TOKEN_KEY);
    var exp = parseInt(localStorage.getItem(GD.EXPIRY_KEY) || "0", 10);
    if (!t || !exp || Date.now() > exp) return null;
    return t;
  }
  function gdConnected() { return !!gdToken(); }
  function gdAutoEnabled() { return localStorage.getItem(GD.AUTO_KEY) === "1"; }
  function gdSetAuto(on) {
    if (on) localStorage.setItem(GD.AUTO_KEY, "1");
    else localStorage.removeItem(GD.AUTO_KEY);
  }
  function gdClearToken() {
    localStorage.removeItem(GD.TOKEN_KEY);
    localStorage.removeItem(GD.EXPIRY_KEY);
  }

  // Costruisce l'URL di autorizzazione Google. mode = "popup" | "redir"
  // (lo ritroviamo in map.state per capire come gestire il ritorno).
  function gdAuthUrl(mode, nonce) {
    return "https://accounts.google.com/o/oauth2/v2/auth?" +
      "client_id=" + encodeURIComponent(CONFIG.GDRIVE.CLIENT_ID) +
      "&redirect_uri=" + encodeURIComponent(gdRedirectUri()) +
      "&response_type=token" +
      "&scope=" + encodeURIComponent(CONFIG.GDRIVE.SCOPE) +
      "&include_granted_scopes=true" +
      "&state=" + encodeURIComponent(mode + ":" + nonce);
  }

  // Avvia il login. Prova prima il POPUP: l'app principale resta aperta e il
  // ricollegamento è immediato. Se il popup è bloccato/non disponibile (es.
  // alcune PWA installate su iOS), ripiega automaticamente sul redirect a
  // pagina intera. In entrambi i casi si usa lo stesso Redirect URI.
  function gdConnect() {
    if (!gdConfigured()) { toast("Client ID Google non configurato", "error"); return; }
    var nonce = Math.random().toString(36).slice(2);
    var w = null;
    try {
      w = window.open(gdAuthUrl("popup", nonce), "gdlogin",
        "width=480,height=640,menubar=no,toolbar=no,location=yes");
    } catch (e) { w = null; }
    if (w && !w.closed) {
      GD.popup = w;
      toast("Completa l'accesso nella finestra Google", "info");
      return;
    }
    // Fallback: redirect a pagina intera.
    gdConnectRedirect(nonce);
  }

  function gdConnectRedirect(nonce) {
    try { localStorage.setItem(GD.RETURN_KEY, location.hash || "#opzioni"); } catch (e) {}
    location.href = gdAuthUrl("redir", nonce || Math.random().toString(36).slice(2));
  }

  // Chiamata quando arriva un token via popup (message o storage event).
  function gdOnConnected() {
    if (Date.now() - (GD.lastConnectAt || 0) < 1500) return; // evita doppio avviso
    GD.lastConnectAt = Date.now();
    if (GD.popup) { try { GD.popup.close(); } catch (e) {} GD.popup = null; }
    toast("Google Drive collegato", "success");
    render();
    // Confronta col backup cloud PRIMA di caricare: evita di sovrascrivere un
    // backup valido con dati locali vuoti (es. primo collegamento su un nuovo
    // dispositivo). gdAutoSyncCheck propone il ripristino o riallinea il cloud.
    gdAutoSyncCheck();
  }

  // Da chiamare al boot: se torniamo da Google, salva il token e ripulisce l'URL.
  function gdHandleRedirect() {
    var hash = location.hash || "";
    if (hash.indexOf("access_token=") === -1) return false;
    var frag = hash.charAt(0) === "#" ? hash.slice(1) : hash;
    var parts = frag.split("&");
    var map = {};
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split("=");
      map[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || "");
    }
    if (!map.access_token) return false;
    var expiresIn = parseInt(map.expires_in || "3600", 10);
    try {
      localStorage.setItem(GD.TOKEN_KEY, map.access_token);
      // Margine di 60s per evitare di usare un token già scaduto.
      // (localStorage è condiviso per origine: l'app principale lo vede subito.)
      localStorage.setItem(GD.EXPIRY_KEY, String(Date.now() + (expiresIn - 60) * 1000));
    } catch (e) {}

    // Caso POPUP: avvisa la finestra principale e chiudi questa.
    var isPopup = (map.state || "").indexOf("popup:") === 0;
    if (isPopup && window.opener && window.opener !== window) {
      try { window.opener.postMessage({ type: "gd-auth", ok: true }, location.origin); } catch (e) {}
      GD.closing = true;
      try { window.close(); } catch (e) {}
      return true;
    }

    // Caso REDIRECT a pagina intera: ripristina la rotta e pulisci l'URL.
    var back = localStorage.getItem(GD.RETURN_KEY) || "#opzioni";
    localStorage.removeItem(GD.RETURN_KEY);
    if (window.history && history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search + back);
    } else {
      location.hash = back;
    }
    return true;
  }

  function gdReq(url, opts) {
    return fetch(url, opts).then(function (res) {
      if (res.status === 401) { gdClearToken(); }
      if (!res.ok) { throw new Error("HTTP " + res.status); }
      return res;
    });
  }

  function gdFindFileId(token) {
    // Con drive.file la lista contiene SOLO i file creati da quest'app,
    // quindi cerchiamo il nostro backup per nome.
    var q = encodeURIComponent("name='" + CONFIG.GDRIVE.FILE_NAME + "' and trashed=false");
    var url = "https://www.googleapis.com/drive/v3/files?q=" + q +
      "&fields=files(id,name,modifiedTime)";
    return gdReq(url, { headers: { Authorization: "Bearer " + token } })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var files = data.files || [];
        return files.length ? files[0].id : null;
      });
  }

  function gdUpload(token) {
    var json = JSON.stringify(state.data);
    return gdFindFileId(token).then(function (fileId) {
      if (fileId) {
        return gdReq("https://www.googleapis.com/upload/drive/v3/files/" + fileId + "?uploadType=media", {
          method: "PATCH",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: json
        });
      }
      // Primo backup: crea il file (richiesta multipart metadati + contenuto).
      var boundary = "casaapp" + Date.now().toString(36);
      var metadata = { name: CONFIG.GDRIVE.FILE_NAME };
      var body =
        "--" + boundary + "\r\n" +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) + "\r\n" +
        "--" + boundary + "\r\n" +
        "Content-Type: application/json\r\n\r\n" +
        json + "\r\n" +
        "--" + boundary + "--";
      return gdReq("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "multipart/related; boundary=" + boundary },
        body: body
      });
    });
  }

  // silent=true => nessun toast/render (uso dal backup automatico).
  function gdBackupNow(silent) {
    var token = gdToken();
    if (!token) { if (!silent) toast("Sessione Drive scaduta, ricollega", "error"); return; }
    gdUpload(token).then(function () {
      try { localStorage.setItem(GD.LAST_KEY, nowISO()); } catch (e) {}
      if (!silent) { toast("Backup salvato su Drive", "success"); if (parseHash().name === "opzioni") render(); }
    }).catch(function () {
      if (!silent) { toast("Errore backup Drive", "error"); render(); }
    });
  }

  // Scarica e restituisce il contenuto del backup su Drive (o null se assente).
  function gdDownloadBackup(token) {
    return gdFindFileId(token).then(function (fileId) {
      if (!fileId) return null;
      return gdReq("https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media", {
        headers: { Authorization: "Bearer " + token }
      }).then(function (res) { return res.json(); });
    });
  }

  // Applica un backup (oggetto dati) come stato corrente.
  function gdApplyBackup(obj) {
    state.data = normalizeData(obj);
    persist();
    try { localStorage.setItem(GD.LAST_KEY, nowISO()); } catch (e) {}
    location.hash = needsSetup() ? "" : "#home";
    render();
  }

  function gdRestore() {
    var token = gdToken();
    if (!token) { toast("Sessione Drive scaduta, ricollega", "error"); return; }
    gdDownloadBackup(token).then(function (obj) {
      if (obj === null) { toast("Nessun backup su Drive", "error"); return; }
      if (!validateImport(obj)) { toast("Backup Drive non valido", "error"); return; }
      gdApplyBackup(obj);
      toast("Ripristinato da Drive", "success");
    }).catch(function () { toast("Errore ripristino Drive", "error"); });
  }

  // Vero se il backup cloud è almeno aggiornato quanto l'ultima modifica locale.
  function gdInSync() {
    var last = localStorage.getItem(GD.LAST_KEY);
    if (!last) return false;
    var localT = (state.data && state.data.updatedAt) ? Date.parse(state.data.updatedAt) : 0;
    return Date.parse(last) + 2000 >= localT;
  }

  // All'avvio (e dopo il collegamento): confronta il backup cloud con i dati
  // locali. Se il cloud è PIÙ RECENTE, propone di caricarlo (niente sovrascrittura
  // automatica). Se il locale è più recente e l'auto-backup è attivo, riallinea
  // il cloud. Evita la perdita di dati del "vince l'ultimo che salva".
  function gdAutoSyncCheck() {
    if (!gdConnected()) return;
    var token = gdToken();
    gdDownloadBackup(token).then(function (obj) {
      if (!obj || !validateImport(obj)) return;
      var remoteT = obj.updatedAt ? Date.parse(obj.updatedAt) : 0;
      var localT = (state.data && state.data.updatedAt) ? Date.parse(state.data.updatedAt) : 0;
      if (remoteT && remoteT > localT + 2000) {
        gdPromptRestore(obj, remoteT);                 // cloud più recente: chiedi
      } else if (gdAutoEnabled() && localT > remoteT + 2000) {
        gdBackupNow(true);                             // locale più recente: riallinea
      }
    }).catch(function () { /* offline o token scaduto: si ignora */ });
  }

  function gdPromptRestore(obj, remoteT) {
    openConfirm({
      title: "Backup cloud più recente",
      message: "Su Google Drive c'è un backup più recente (<strong>" +
        h(formatDateTime(new Date(remoteT).toISOString())) +
        "</strong>), probabilmente da un altro dispositivo. Vuoi caricarlo qui?",
      warn: "I dati attuali su questo dispositivo verranno sostituiti.",
      confirmLabel: "Carica dal cloud",
      onConfirm: function () {
        closeModal();
        gdApplyBackup(obj);
        toast("Aggiornato dal cloud", "success");
      }
    });
  }

  function gdDisconnect() {
    gdClearToken();
    gdSetAuto(false);
    toast("Drive scollegato", "success");
    render();
  }

  // Debounce: dopo l'ultima modifica, attende e carica una sola volta.
  function gdScheduleAuto() {
    if (!gdAutoEnabled() || !gdToken()) return;
    if (GD.autoTimer) clearTimeout(GD.autoTimer);
    GD.autoTimer = setTimeout(function () { gdBackupNow(true); }, CONFIG.GDRIVE.AUTO_DEBOUNCE_MS);
  }

  var toastTimer = null;
  function toast(msg, type) {
    var el = document.createElement("div");
    el.className = "toast" + (type === "success" ? " is-success" : type === "error" ? " is-error" : "");
    var icon = type === "success" ? "check" : type === "error" ? "alert" : "info";
    el.innerHTML = svg(icon, "ico-sm") + "<span>" + h(msg) + "</span>";
    elToast.innerHTML = "";
    elToast.appendChild(el);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, 2200);
  }

  /* ==========================================================
     SERVICE WORKER (offline + aggiornamento controllato)
     ========================================================== */
  var swWaitingReg = null;     // registrazione con una nuova versione "in attesa"
  var swReloading = false;     // evita ricariche multiple al controllerchange

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    // Il SW funziona solo via http/https: aprendo il file in locale (file://)
    // non si registra, ma l'app continua a funzionare normalmente.
    if (location.protocol !== "https:" && location.protocol !== "http:") return;

    navigator.serviceWorker.register("./sw.js").then(function (reg) {
      // Nuova versione già pronta al caricamento.
      if (reg.waiting && navigator.serviceWorker.controller) swUpdateReady(reg);
      // Nuova versione che arriva mentre l'app è aperta.
      reg.addEventListener("updatefound", function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", function () {
          if (nw.state === "installed" && navigator.serviceWorker.controller) swUpdateReady(reg);
        });
      });
    }).catch(function () { /* registrazione fallita: l'app resta utilizzabile online */ });

    // Quando la nuova versione prende il controllo, ricarica una sola volta.
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (swReloading) return;
      swReloading = true;
      location.reload();
    });
  }

  function swUpdateReady(reg) {
    swWaitingReg = reg;
    var el = document.createElement("div");
    el.className = "toast is-action";
    el.innerHTML = svg("refresh", "ico-sm") +
      "<span>Nuova versione disponibile</span>" +
      '<button class="toast-btn" data-action="app-update">Aggiorna</button>';
    elToast.innerHTML = "";
    elToast.appendChild(el); // niente auto-dismiss: resta finché si aggiorna
  }

  function applyUpdate() {
    if (swWaitingReg && swWaitingReg.waiting) {
      swWaitingReg.waiting.postMessage("SKIP_WAITING"); // controllerchange ricaricherà
    } else {
      location.reload();
    }
  }

  /* ==========================================================
     UTILS
     ========================================================== */
  function uid(prefix) { return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function nowISO() { return new Date().toISOString(); }

  function h(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function svg(name, cls) {
    return '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.door) + "</svg>";
  }
  function svgRaw(name, cls) { return svg(name, cls); }

  function roomIcon(key) { return ICONS[key] ? key : "door"; }

  function field(label, control) {
    return '<div class="field"><label>' + label + "</label>" + control + "</div>";
  }
  function select(name, optionsHtml) {
    return '<select class="select" name="' + name + '">' + optionsHtml + "</select>";
  }
  function optionsFrom(map, current) {
    var out = "";
    for (var k in map) {
      if (map.hasOwnProperty(k)) {
        out += '<option value="' + k + '"' + (k === current ? " selected" : "") + ">" + map[k] + "</option>";
      }
    }
    return out;
  }
  function roomOptions(current) {
    return rooms().map(function (r) {
      return '<option value="' + r.id + '"' + (r.id === current ? " selected" : "") + ">" + h(r.name) + " — " + h(floorNameOf(r.floorId)) + "</option>";
    }).join("");
  }
  function floorOptions(current) {
    return floors().map(function (f) {
      return '<option value="' + f.id + '"' + (f.id === current ? " selected" : "") + ">" + h(f.name) + "</option>";
    }).join("");
  }

  function val(scope, name) {
    var el = scope.querySelector ? scope.querySelector('[name="' + name + '"]') : null;
    return el ? String(el.value).trim() : "";
  }

  // ---- Multi-stanza: visualizzazione e selezione ----
  // Posizione compatta per le card delle liste: "Stanza • Piano" oppure "Stanza +N"
  function locCompactHtml(roomIds) {
    roomIds = roomIds || [];
    if (roomIds.length === 0) return svg("pin", "ico-sm") + "Senza stanza";
    var first = findRoom(roomIds[0]);
    var name = first ? first.name : "Stanza";
    if (roomIds.length === 1) {
      return svg("pin", "ico-sm") + h(name) + '<span class="sep">•</span>' + h(roomFloorName(roomIds[0]));
    }
    return svg("pin", "ico-sm") + h(name) + '<span class="loc-more">+' + (roomIds.length - 1) + "</span>";
  }
  // Chip delle stanze per il dettaglio (ognuno apre la stanza)
  function locChipsHtml(roomIds) {
    roomIds = roomIds || [];
    if (roomIds.length === 0) {
      return '<div class="loc-chips"><span class="loc-chip is-none">' + svg("pin", "ico-sm") + "Senza stanza</span></div>";
    }
    return '<div class="loc-chips">' + roomIds.map(function (rid) {
      var r = findRoom(rid);
      if (!r) return "";
      return '<button class="loc-chip" data-action="open-room" data-id="' + rid + '">' + svg("pin", "ico-sm") +
        h(r.name) + '<span class="loc-chip-floor">' + h(floorNameOf(r.floorId)) + "</span></button>";
    }).join("") + "</div>";
  }
  // Selettore a chip (multi) raggruppato per piano, gruppi comprimibili.
  function roomChipsSelector(selectedIds) {
    selectedIds = selectedIds || [];
    var any = false;
    var html = floors().map(function (f) {
      var rs = roomsOf(f.id);
      if (!rs.length) return "";
      any = true;
      var selCount = rs.filter(function (r) { return selectedIds.indexOf(r.id) >= 0; }).length;
      var chips = rs.map(function (r) {
        var on = selectedIds.indexOf(r.id) >= 0;
        return '<button type="button" class="room-chip' + (on ? " is-active" : "") + '" data-action="toggle-room-chip" data-id="' + r.id + '">' +
          '<span class="room-chip-dot" style="background:' + h(r.color) + '"></span>' + h(r.name) + "</button>";
      }).join("");
      return '<div class="chip-floor-group">' +
          '<button type="button" class="chip-floor-head" data-action="toggle-floor-group">' +
            '<span class="chip-floor-caret">' + svg("chevron") + "</span>" +
            '<span class="chip-floor-label">' + h(f.name) + "</span>" +
            '<span class="chip-floor-count' + (selCount ? "" : " is-empty") + '">' + selCount + "</span>" +
          "</button>" +
          '<div class="chip-floor-body">' + chips + "</div>" +
        "</div>";
    }).join("");
    return any ? html : '<div class="field-hint">Nessuna stanza disponibile.</div>';
  }
  // Aggiorna il contatore "selezionate" del piano dopo un tocco su una chip
  function updateFloorCount(chip) {
    var group = chip.closest ? chip.closest(".chip-floor-group") : null;
    if (!group) return;
    var n = group.querySelectorAll(".room-chip.is-active").length;
    var badge = group.querySelector(".chip-floor-count");
    if (badge) { badge.textContent = n; badge.classList.toggle("is-empty", n === 0); }
  }
  function readSelectedRooms() {
    return Array.prototype.slice.call(elModal.querySelectorAll(".room-chip.is-active"))
      .map(function (c) { return c.getAttribute("data-id"); });
  }

  function iconBtn(action, id, icon, label, danger) {
    return '<button class="icon-btn' + (danger ? " is-danger" : "") + '" data-action="' + action + '" data-id="' + id + '" aria-label="' + label + '">' + svg(icon) + "</button>";
  }
  function fab(action, label) {
    return '<button class="fab" data-action="' + action + '" aria-label="' + label + '">' + svg("plus") + "</button>";
  }
  function emptyState(icon, title, text) {
    return '<div class="empty"><div class="empty-ico">' + svg(icon) + "</div><h3>" + h(title) + "</h3><p>" + h(text) + "</p></div>";
  }
  function prioBadge(p) { return '<span class="badge badge-prio-' + p + '"><span class="dot"></span>' + PRIO_LABEL[p] + "</span>"; }
  function statusBadge(s) { return '<span class="badge badge-stato-' + s + '"><span class="dot"></span>' + STATUS_LABEL[s] + "</span>"; }
  function ideaBadge(s) { return '<span class="badge badge-idea-' + s + '"><span class="dot"></span>' + IDEA_LABEL[s] + "</span>"; }
  function roomName(id) { var r = findRoom(id); return r ? r.name : "Stanza eliminata"; }

  function normalizeUrl(u) {
    u = (u || "").trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  }
  function isSafeUrl(u) { return /^https?:\/\//i.test(u || ""); }

  function isHex(s) { return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s); }
  function sameHex(a, b) { return isHex(a) && isHex(b) && a.toLowerCase() === b.toLowerCase(); }
  function hexToRgba(hex, a) {
    if (!isHex(hex)) hex = CONFIG.DEFAULT_ACCENT;
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dateStamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  }
  function formatDateTime(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  // ---- Scadenze (data "YYYY-MM-DD") ----
  function daysUntil(dateKey) {
    var p = String(dateKey).split("-");
    if (p.length !== 3) return NaN;
    var due = new Date(+p[0], +p[1] - 1, +p[2]);
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((due - t) / 86400000);
  }
  function formatDateShort(dateKey) {
    var p = String(dateKey).split("-");
    if (p.length !== 3) return dateKey;
    return p[2] + "/" + p[1] + "/" + p[0].slice(2);
  }
  // Stato scadenza di un lavoro: kind + classe + etichetta
  function dueInfo(task) {
    var dd = task.dueDate;
    if (!dd) return null;
    var n = daysUntil(dd);
    if (isNaN(n)) return null;
    if (task.status === "fatto") return { cls: "due-done", label: formatDateShort(dd) };
    if (n < 0) return { cls: "due-overdue", label: "Scaduto" };
    if (n === 0) return { cls: "due-today", label: "Oggi" };
    if (n === 1) return { cls: "due-soon", label: "Domani" };
    if (n <= 3) return { cls: "due-soon", label: "Tra " + n + " gg" };
    return { cls: "due-future", label: formatDateShort(dd) };
  }
  function dueBadgeHtml(task) {
    var info = dueInfo(task);
    if (!info) return "";
    return '<span class="badge due-badge ' + info.cls + '">' + svg("calendar", "ico-sm") + info.label + "</span>";
  }
  function isOverdueOpen(task) {
    return task.status !== "fatto" && task.dueDate && daysUntil(task.dueDate) < 0;
  }

  /* ==========================================================
     BOOT — listener centralizzati + avvio
     ========================================================== */
  function onClick(e) {
    if (swipeSuppressClick) { swipeSuppressClick = false; return; }
    // Tocco su una riga/card già aperta dallo swipe: la richiude (non naviga).
    if (e.target.closest) {
      var openSurf = e.target.closest(".swipe-surface.is-swiped");
      if (openSurf) { openSurf.classList.remove("is-swiped"); e.preventDefault(); return; }
    }
    var node = e.target.closest ? e.target.closest("[data-action]") : null;
    if (!node) return;
    // Il data-action di un <form> serve SOLO all'evento submit: un click che
    // risale fino al form (es. aprendo una <select> o toccando un campo) non
    // deve scatenare l'azione, altrimenti chiuderebbe/salverebbe il popup.
    if (node.tagName === "FORM") return;
    // Ignora anche il bottone submit dentro un form (lo gestisce il submit).
    if (node.tagName === "BUTTON" && node.type === "submit" && node.form) return;
    e.preventDefault();
    handleAction(node.getAttribute("data-action"), node, e);
  }
  function onSubmit(e) {
    var form = e.target.closest ? e.target.closest("form[data-action]") : null;
    if (!form) return;
    e.preventDefault();
    handleAction(form.getAttribute("data-action"), form, e);
  }

  /* ---- Drag & drop per riordinare (Pointer Events: mouse + touch) ----
     Usato sia per la checklist (.check-list / .check-row) sia per le liste
     di lavori e idee in ordinamento "Manuale" (.reorder-list / .card). ---- */
  var dragState = null;

  /* ---- Swipe-to-delete sulle righe della Lista spesa ----
     Scorrendo una riga verso sinistra compare il pulsante "Elimina"; un tocco
     altrove (o sulla riga aperta) la richiude. Niente cestino sempre in vista. */
  var SWIPE_REVEAL = 96;        // larghezza del pulsante Elimina rivelato
  var swipeState = null;
  var swipeSuppressClick = false; // evita che il click post-swipe apra il modale

  function closeSwipedExcept(keep) {
    var open = document.querySelectorAll(".swipe-surface.is-swiped");
    for (var i = 0; i < open.length; i++) if (open[i] !== keep) open[i].classList.remove("is-swiped");
  }

  // Selettore dei figli trascinabili in base al tipo di lista.
  function dragItemSel(list) {
    return list.classList.contains("reorder-list") ? ".card" : ".check-row";
  }
  function rowIdsOf(list, sel) {
    return Array.prototype.slice.call(list.querySelectorAll(sel || dragItemSel(list)))
      .map(function (r) { return r.getAttribute("data-id"); });
  }

  function onPointerDown(e) {
    if (!e.target.closest) return;
    var handle = e.target.closest(".drag-handle");
    if (handle) {
      var row = handle.closest(".check-row, .card");
      var list = row ? row.closest(".check-list, .reorder-list") : null;
      if (!row || !list) return;
      e.preventDefault();
      var sel = dragItemSel(list);
      dragState = {
        row: row, list: list, sel: sel,
        kind: list.getAttribute("data-reorder") || "check",
        startOrder: rowIdsOf(list, sel).join("|")
      };
      row.classList.add("dragging");
      document.body.classList.add("is-dragging");
      try { row.setPointerCapture(e.pointerId); } catch (err) {}
      return;
    }
    // Tocco sul pulsante Elimina rivelato: NON chiudere la riga qui, altrimenti
    // scorrerebbe via sotto il dito e il click finirebbe sulla riga invece che
    // sul pulsante (era il motivo per cui "Elimina" non funzionava al tocco).
    if (e.target.closest(".swipe-del")) return;
    // Swipe-to-delete: chiudi eventuali righe aperte altrove, poi arma lo swipe.
    var srow = e.target.closest(".swipe-surface");
    closeSwipedExcept(srow);
    if (!srow) return;
    swipeState = {
      row: srow,
      startX: e.clientX, startY: e.clientY,
      base: srow.classList.contains("is-swiped") ? -SWIPE_REVEAL : 0,
      lock: null, moved: false
    };
  }

  function onPointerMove(e) {
    if (dragState) {
      e.preventDefault();
      var y = e.clientY;
      var rows = Array.prototype.slice.call(dragState.list.querySelectorAll(dragState.sel));
      var ref = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i] === dragState.row) continue;
        var rect = rows[i].getBoundingClientRect();
        if (y < rect.top + rect.height / 2) { ref = rows[i]; break; }
      }
      if (ref) { if (dragState.row.nextSibling !== ref) dragState.list.insertBefore(dragState.row, ref); }
      else if (dragState.list.lastElementChild !== dragState.row) { dragState.list.appendChild(dragState.row); }
      return;
    }
    if (!swipeState) return;
    var dx = e.clientX - swipeState.startX;
    var dy = e.clientY - swipeState.startY;
    if (swipeState.lock === null) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        swipeState.lock = "h";
        swipeState.row.classList.add("swiping"); // niente transition durante il trascinamento
      } else if (Math.abs(dy) > 8) {
        swipeState = null; // movimento verticale → è uno scroll, lascia perdere
        return;
      } else { return; }
    }
    if (swipeState.lock !== "h") return;
    e.preventDefault();
    swipeState.moved = true;
    var tx = swipeState.base + dx;
    if (tx > 0) tx = 0;
    if (tx < -SWIPE_REVEAL) tx = -SWIPE_REVEAL;
    swipeState.row.style.transform = "translateX(" + tx + "px)";
  }

  function onPointerUp(e) {
    if (dragState) {
      var st = dragState;
      dragState = null;
      st.row.classList.remove("dragging");
      document.body.classList.remove("is-dragging");
      try { st.row.releasePointerCapture(e.pointerId); } catch (err) {}
      var ids = rowIdsOf(st.list, st.sel);
      if (ids.join("|") === st.startOrder) return; // nessuno spostamento
      if (st.kind === "task") commitManualOrder(state.data.tasks, ids);
      else if (st.kind === "idea") commitManualOrder(state.data.ideas, ids);
      else commitChecklistOrder(ids);
      return;
    }
    if (!swipeState) return;
    var sw = swipeState;
    swipeState = null;
    sw.row.classList.remove("swiping");
    sw.row.style.transform = "";
    if (sw.lock === "h" && sw.moved) {
      var open = (sw.base + (e.clientX - sw.startX)) <= -SWIPE_REVEAL / 2;
      sw.row.classList.toggle("is-swiped", open);
      swipeSuppressClick = true; // il click che segue lo swipe non deve aprire il modale
      setTimeout(function () { swipeSuppressClick = false; }, 80);
    }
  }

  function commitChecklistOrder(ids) {
    var owner = currentChecklistOwner();
    if (!owner || !Array.isArray(owner.checklist)) return;
    var byId = {};
    owner.checklist.forEach(function (c) { byId[c.id] = c; });
    var arr = [];
    ids.forEach(function (id) { if (byId[id]) { arr.push(byId[id]); delete byId[id]; } });
    owner.checklist.forEach(function (c) { if (byId[c.id]) arr.push(c); }); // eventuali residui
    owner.checklist = arr;
    owner.updatedAt = nowISO();
    persist();
    // Niente render(): il DOM è già nell'ordine corretto (evita il flash).
  }

  function boot() {
    elHeader = document.getElementById("app-header");
    elView = document.getElementById("view");
    elNav = document.getElementById("bottom-nav");
    elToast = document.getElementById("toast-host");
    elModal = document.getElementById("modal-host");

    // Se torniamo dal login Google, intercetta il token PRIMA del routing.
    gdHandleRedirect();
    // Se questa pagina è il popup di login, si è già chiusa/avvisata: stop qui.
    if (GD.closing) { document.title = "Accesso completato"; return; }

    // Token in arrivo dal popup: via postMessage o via evento storage (backup).
    window.addEventListener("message", function (ev) {
      if (ev.origin !== location.origin) return;
      if (ev.data && ev.data.type === "gd-auth" && ev.data.ok) gdOnConnected();
    }, false);
    window.addEventListener("storage", function (ev) {
      if (ev.key === GD.TOKEN_KEY && ev.newValue) gdOnConnected();
    }, false);

    var loaded = loadData();
    if (loaded) { state.data = loaded; }
    else { state.data = createDefaultData(); persist(); }

    document.addEventListener("click", onClick, false);
    document.addEventListener("submit", onSubmit, false);
    document.addEventListener("pointerdown", onPointerDown, false);
    document.addEventListener("pointermove", onPointerMove, false);
    document.addEventListener("pointerup", onPointerUp, false);
    document.addEventListener("pointercancel", onPointerUp, false);
    window.addEventListener("hashchange", render, false);
    window.addEventListener("scroll", onScroll, { passive: true });

    render();
    registerSW();      // offline + aggiornamento controllato
    gdAutoSyncCheck(); // se collegato, confronta locale vs backup su Drive
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
