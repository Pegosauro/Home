/* ============================================================
   HOME APP — cloud-sync.js
   Modulo esterno opzionale per sincronizzazione Supabase.
   Non sostituisce il salvataggio locale: usa localStorage come fonte primaria
   e aggiunge backup/ripristino cloud tramite Supabase Auth + REST API.
   ============================================================ */
(function () {
  "use strict";

  var DATA_KEY = "casa-app-v2-data";
  var PREFIX = "home-app-supabase-";
  var K = {
    url: PREFIX + "url",
    anon: PREFIX + "anon-key",
    table: PREFIX + "table",
    auto: PREFIX + "auto",
    access: PREFIX + "access-token",
    refresh: PREFIX + "refresh-token",
    expires: PREFIX + "expires-at",
    userId: PREFIX + "user-id",
    userEmail: PREFIX + "user-email",
    last: PREFIX + "last-sync"
  };

  var autoTimer = null;
  var busy = false;
  var lastStatus = "";
  var lastStatusType = "info";
  var nativeSetItem = localStorage.setItem.bind(localStorage);

  function h(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function trimSlash(s) { return String(s || "").trim().replace(/\/+$/, ""); }
  function tableName(s) {
    s = String(s || "home_backups").trim() || "home_backups";
    return /^[a-zA-Z0-9_]+$/.test(s) ? s : "home_backups";
  }
  function getCfg() {
    return {
      url: trimSlash(localStorage.getItem(K.url)),
      anon: String(localStorage.getItem(K.anon) || "").trim(),
      table: tableName(localStorage.getItem(K.table)),
      auto: localStorage.getItem(K.auto) === "1"
    };
  }
  function configured() {
    var c = getCfg();
    return !!(c.url && c.anon && c.table);
  }
  function session() {
    return {
      access: localStorage.getItem(K.access) || "",
      refresh: localStorage.getItem(K.refresh) || "",
      expires: parseInt(localStorage.getItem(K.expires) || "0", 10),
      userId: localStorage.getItem(K.userId) || "",
      userEmail: localStorage.getItem(K.userEmail) || ""
    };
  }
  function signedIn() {
    var s = session();
    return !!(s.access && s.userId);
  }
  function setStatus(msg, type) {
    lastStatus = msg || "";
    lastStatusType = type || "info";
    var box = document.getElementById("hss-status");
    if (box) {
      box.className = "hss-status is-" + lastStatusType;
      box.textContent = lastStatus;
    }
  }
  function setBusy(on) {
    busy = !!on;
    var panel = document.getElementById("home-supabase-sync");
    if (panel) panel.classList.toggle("is-busy", busy);
  }
  function lastSyncLabel() {
    var iso = localStorage.getItem(K.last);
    if (!iso) return "Mai";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "Mai";
    function pad(n) { return n < 10 ? "0" + n : "" + n; }
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function saveCfgFromPanel() {
    var p = document.getElementById("home-supabase-sync");
    if (!p) return;
    var url = p.querySelector('[name="hss-url"]');
    var anon = p.querySelector('[name="hss-anon"]');
    var table = p.querySelector('[name="hss-table"]');
    nativeSetItem(K.url, trimSlash(url && url.value));
    nativeSetItem(K.anon, String(anon && anon.value || "").trim());
    nativeSetItem(K.table, tableName(table && table.value));
    setStatus("Configurazione Supabase salvata", "success");
    renderPanel();
  }

  function authHeaders(extra) {
    var c = getCfg();
    var headers = {
      "apikey": c.anon,
      "Content-Type": "application/json"
    };
    for (var k in extra || {}) headers[k] = extra[k];
    return headers;
  }

  function storeAuth(data) {
    if (!data || !data.access_token || !data.user || !data.user.id) throw new Error("Risposta login non valida");
    nativeSetItem(K.access, data.access_token);
    if (data.refresh_token) nativeSetItem(K.refresh, data.refresh_token);
    nativeSetItem(K.expires, String(Date.now() + ((data.expires_in || 3600) - 60) * 1000));
    nativeSetItem(K.userId, data.user.id);
    nativeSetItem(K.userEmail, data.user.email || "");
  }

  function clearAuth() {
    [K.access, K.refresh, K.expires, K.userId, K.userEmail].forEach(function (key) { localStorage.removeItem(key); });
  }

  function signIn() {
    if (busy) return;
    if (!configured()) { setStatus("Configura prima URL e anon key Supabase", "error"); return; }
    var p = document.getElementById("home-supabase-sync");
    var email = p.querySelector('[name="hss-email"]');
    var password = p.querySelector('[name="hss-password"]');
    email = String(email && email.value || "").trim();
    password = String(password && password.value || "");
    if (!email || !password) { setStatus("Inserisci email e password Supabase", "error"); return; }

    var c = getCfg();
    setBusy(true);
    fetch(c.url + "/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ email: email, password: password })
    }).then(function (res) {
      if (!res.ok) throw new Error("Login non riuscito (HTTP " + res.status + ")");
      return res.json();
    }).then(function (data) {
      storeAuth(data);
      var pass = document.querySelector('[name="hss-password"]');
      if (pass) pass.value = "";
      setStatus("Accesso Supabase completato", "success");
      renderPanel();
    }).catch(function (err) {
      setStatus(err.message || "Errore login Supabase", "error");
    }).finally(function () { setBusy(false); });
  }

  function ensureToken() {
    var c = getCfg();
    var s = session();
    if (!configured()) return Promise.reject(new Error("Supabase non configurato"));
    if (!s.access || !s.userId) return Promise.reject(new Error("Accesso Supabase non effettuato"));
    if (s.expires && Date.now() < s.expires) return Promise.resolve(s.access);
    if (!s.refresh) return Promise.reject(new Error("Sessione scaduta: effettua di nuovo l'accesso"));

    return fetch(c.url + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ refresh_token: s.refresh })
    }).then(function (res) {
      if (!res.ok) throw new Error("Sessione scaduta: effettua di nuovo l'accesso");
      return res.json();
    }).then(function (data) {
      storeAuth(data);
      return data.access_token;
    });
  }

  function restFetch(path, opts) {
    opts = opts || {};
    var c = getCfg();
    return ensureToken().then(function (token) {
      opts.headers = opts.headers || {};
      opts.headers["apikey"] = c.anon;
      opts.headers["Authorization"] = "Bearer " + token;
      opts.headers["Content-Type"] = "application/json";
      return fetch(c.url + "/rest/v1/" + c.table + path, opts);
    }).then(function (res) {
      if (!res.ok) throw new Error("Errore Supabase HTTP " + res.status);
      return res;
    });
  }

  function readLocalData() {
    var raw = localStorage.getItem(DATA_KEY);
    if (!raw) throw new Error("Nessun dato locale da salvare");
    var obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || !obj.house) throw new Error("Dati locali non validi");
    return obj;
  }

  function backupNow(silent) {
    if (busy) return;
    setBusy(true);
    var s = session();
    var row;
    try {
      row = {
        user_id: s.userId,
        data_json: readLocalData(),
        updated_at: new Date().toISOString()
      };
    } catch (err) {
      setBusy(false);
      if (!silent) setStatus(err.message, "error");
      return;
    }

    restFetch("?on_conflict=user_id", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([row])
    }).then(function () {
      nativeSetItem(K.last, new Date().toISOString());
      if (!silent) setStatus("Backup salvato su Supabase", "success");
      renderPanel();
    }).catch(function (err) {
      if (!silent) setStatus(err.message || "Errore backup Supabase", "error");
    }).finally(function () { setBusy(false); });
  }

  function downloadBackup() {
    var s = session();
    return restFetch("?user_id=eq." + encodeURIComponent(s.userId) + "&select=user_id,data_json,updated_at&limit=1", {
      method: "GET"
    }).then(function (res) { return res.json(); })
      .then(function (rows) { return rows && rows.length ? rows[0] : null; });
  }

  function restoreNow() {
    if (busy) return;
    if (!window.confirm("Ripristinare i dati da Supabase? I dati locali attuali verranno sostituiti.")) return;
    setBusy(true);
    downloadBackup().then(function (row) {
      if (!row || !row.data_json) throw new Error("Nessun backup Supabase trovato");
      if (!row.data_json.house) throw new Error("Backup Supabase non valido");
      nativeSetItem(DATA_KEY, JSON.stringify(row.data_json));
      nativeSetItem(K.last, new Date().toISOString());
      setStatus("Backup ripristinato da Supabase", "success");
      setTimeout(function () { location.reload(); }, 500);
    }).catch(function (err) {
      setStatus(err.message || "Errore ripristino Supabase", "error");
    }).finally(function () { setBusy(false); });
  }

  function toggleAuto() {
    if (localStorage.getItem(K.auto) === "1") {
      localStorage.removeItem(K.auto);
      setStatus("Backup automatico Supabase disattivato", "info");
    } else {
      nativeSetItem(K.auto, "1");
      setStatus("Backup automatico Supabase attivato", "success");
      scheduleAuto();
    }
    renderPanel();
  }

  function scheduleAuto() {
    if (autoTimer) clearTimeout(autoTimer);
    if (!getCfg().auto || !signedIn()) return;
    autoTimer = setTimeout(function () { backupNow(true); }, 8000);
  }

  function disconnect() {
    clearAuth();
    setStatus("Account Supabase scollegato", "info");
    renderPanel();
  }

  function injectStyle() {
    if (document.getElementById("hss-style")) return;
    var st = document.createElement("style");
    st.id = "hss-style";
    st.textContent = "\n" +
      ".hss-panel{margin:16px 0 80px;padding:16px;border:1px solid var(--border,#253044);border-radius:18px;background:var(--card,#111827);box-shadow:var(--shadow,0 16px 40px rgba(0,0,0,.22));color:var(--text,#e5e7eb)}" +
      ".hss-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.hss-title{font-weight:800;font-size:16px}.hss-sub{font-size:12px;color:var(--text-mut,#94a3b8);margin-top:3px;line-height:1.35}.hss-grid{display:grid;grid-template-columns:1fr;gap:10px}.hss-field label{display:block;font-size:12px;font-weight:700;color:var(--text-soft,#cbd5e1);margin-bottom:5px}.hss-input{width:100%;box-sizing:border-box;border:1px solid var(--border,#334155);border-radius:12px;background:var(--input,#0b1220);color:var(--text,#e5e7eb);padding:10px 11px;font:inherit}.hss-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.hss-btn{border:1px solid var(--border,#334155);border-radius:999px;background:var(--chip,#1f2937);color:var(--text,#e5e7eb);padding:9px 12px;font-weight:700;font-size:13px}.hss-btn.is-primary{background:var(--accent,#218bff);border-color:transparent;color:#fff}.hss-btn.is-danger{color:var(--danger,#ef4444)}.hss-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.hss-pill{font-size:12px;border:1px solid var(--border,#334155);border-radius:999px;padding:6px 9px;color:var(--text-mut,#94a3b8)}.hss-status{margin-top:10px;font-size:12px;line-height:1.35;color:var(--text-mut,#94a3b8)}.hss-status.is-success{color:var(--success,#22c55e)}.hss-status.is-error{color:var(--danger,#ef4444)}.hss-panel.is-busy{opacity:.72;pointer-events:none}@media(min-width:720px){.hss-grid{grid-template-columns:1fr 1fr}.hss-field.is-wide{grid-column:1/-1}}";
    document.head.appendChild(st);
  }

  function renderPanel() {
    var view = document.getElementById("view");
    if (!view) return;
    var onOptions = (location.hash || "").indexOf("#opzioni") === 0;
    var old = document.getElementById("home-supabase-sync");
    if (!onOptions) { if (old) old.remove(); return; }
    var c = getCfg();
    var s = session();
    var hasSession = signedIn();
    var panel = old || document.createElement("section");
    panel.id = "home-supabase-sync";
    panel.className = "hss-panel";
    panel.innerHTML =
      '<div class="hss-head">' +
        '<div><div class="hss-title">Backup Supabase</div>' +
        '<div class="hss-sub">Modulo opzionale: l’app resta locale, Supabase aggiunge backup/ripristino cloud.</div></div>' +
      '</div>' +
      '<div class="hss-grid">' +
        '<div class="hss-field is-wide"><label>Project URL Supabase</label><input class="hss-input" name="hss-url" placeholder="https://xxxxx.supabase.co" value="' + h(c.url) + '"></div>' +
        '<div class="hss-field is-wide"><label>Anon public key</label><input class="hss-input" name="hss-anon" type="password" placeholder="eyJ..." value="' + h(c.anon) + '"></div>' +
        '<div class="hss-field"><label>Tabella</label><input class="hss-input" name="hss-table" value="' + h(c.table) + '"></div>' +
        '<div class="hss-field"><label>Email Supabase Auth</label><input class="hss-input" name="hss-email" type="email" placeholder="nome@email.it" value="' + h(s.userEmail) + '"></div>' +
        '<div class="hss-field"><label>Password</label><input class="hss-input" name="hss-password" type="password" placeholder="Password utente Supabase"></div>' +
      '</div>' +
      '<div class="hss-actions">' +
        '<button class="hss-btn" data-hss-action="save-cfg">Salva configurazione</button>' +
        (hasSession ? '<button class="hss-btn is-danger" data-hss-action="disconnect">Scollega</button>' : '<button class="hss-btn is-primary" data-hss-action="signin">Accedi</button>') +
        '<button class="hss-btn" data-hss-action="backup">Backup ora</button>' +
        '<button class="hss-btn" data-hss-action="restore">Ripristina</button>' +
        '<button class="hss-btn" data-hss-action="auto">' + (c.auto ? 'Auto backup: ON' : 'Auto backup: OFF') + '</button>' +
      '</div>' +
      '<div class="hss-meta">' +
        '<span class="hss-pill">Stato: ' + (hasSession ? 'collegato' : 'non collegato') + '</span>' +
        '<span class="hss-pill">Utente: ' + h(s.userEmail || '—') + '</span>' +
        '<span class="hss-pill">Ultima sync: ' + h(lastSyncLabel()) + '</span>' +
      '</div>' +
      '<div id="hss-status" class="hss-status is-' + h(lastStatusType) + '">' + h(lastStatus || (configured() ? "Config pronta. Accedi con un utente Supabase Auth." : "Inserisci URL e anon key Supabase.")) + '</div>';
    if (!old) view.appendChild(panel);
  }

  function onClick(e) {
    var btn = e.target.closest ? e.target.closest("[data-hss-action]") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var a = btn.getAttribute("data-hss-action");
    if (a === "save-cfg") saveCfgFromPanel();
    else if (a === "signin") signIn();
    else if (a === "disconnect") disconnect();
    else if (a === "backup") backupNow(false);
    else if (a === "restore") restoreNow();
    else if (a === "auto") toggleAuto();
  }

  function patchLocalStorage() {
    try {
      localStorage.setItem = function (key, value) {
        nativeSetItem(key, value);
        if (key === DATA_KEY) scheduleAuto();
      };
    } catch (e) {}
  }

  function init() {
    injectStyle();
    patchLocalStorage();
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", function () { setTimeout(renderPanel, 120); });
    var view = document.getElementById("view");
    if (view && "MutationObserver" in window) {
      new MutationObserver(function () { setTimeout(renderPanel, 60); }).observe(view, { childList: true });
    }
    setTimeout(renderPanel, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
