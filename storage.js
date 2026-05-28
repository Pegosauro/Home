window.CasaApp = window.CasaApp || {};

CasaApp.storage = {
  load() {
    try {
      const raw = localStorage.getItem(CasaApp.CONFIG.STORAGE_KEY);
      return raw ? CasaApp.model.normalizeData(JSON.parse(raw)) : CasaApp.model.createEmptyData();
    } catch (error) {
      console.error('Errore lettura dati locali:', error);
      return CasaApp.model.createEmptyData();
    }
  },
  save(data) {
    const payload = { ...data, updatedAt: CasaApp.utils.todayIso() };
    localStorage.setItem(CasaApp.CONFIG.STORAGE_KEY, JSON.stringify(payload));
  },
  exportData(data) {
    const date = new Date().toISOString().slice(0, 10);
    CasaApp.utils.downloadText(`casa-app-backup-${date}.json`, JSON.stringify(data, null, 2));
  },
  importFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          resolve(CasaApp.model.normalizeData(parsed));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },
  reset() {
    localStorage.removeItem(CasaApp.CONFIG.STORAGE_KEY);
  }
};
