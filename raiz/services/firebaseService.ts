
/**
 * Banco de Dados Gratuito (Simulador Firestore via LocalStorage)
 * Otimizado para evitar travamentos de I/O bloqueante.
 */

const STORAGE_KEY = 'bingo_master_db';

const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {
    users: {},
    cartelas: {},
    series: {},
    estado_bingo: {},
    premios: {}
  };
};

const saveDb = (db: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const db = {
  set: async (collection: string, id: string, data: any) => {
    const database = getDb();
    if (!database[collection]) database[collection] = {};
    database[collection][id] = { ...data, updated_at: Date.now() };
    saveDb(database);
    
    window.dispatchEvent(new CustomEvent(`db_update_${collection}_${id}`, { detail: database[collection][id] }));
    window.dispatchEvent(new CustomEvent(`db_update_${collection}`, { detail: Object.values(database[collection]) }));
  },

  get: async (collection: string, id: string) => {
    const database = getDb();
    return database[collection]?.[id] || null;
  },

  getAll: async (collection: string) => {
    const database = getDb();
    return Object.values(database[collection] || {});
  },

  clearCollection: async (collection: string) => {
    const database = getDb();
    database[collection] = {};
    saveDb(database);
    window.dispatchEvent(new CustomEvent(`db_update_${collection}`, { detail: [] }));
  },

  onSnapshot: (collection: string, id: string, callback: (data: any) => void) => {
    const handler = (e: any) => callback(e.detail);
    window.addEventListener(`db_update_${collection}_${id}`, handler);
    db.get(collection, id).then(data => { if (data) callback(data); });
    return () => window.removeEventListener(`db_update_${collection}_${id}`, handler);
  },

  onSnapshotCollection: (collection: string, callback: (data: any[]) => void) => {
    const handler = (e: any) => callback(e.detail);
    window.addEventListener(`db_update_${collection}`, handler);
    db.getAll(collection).then(data => callback(data));
    return () => window.removeEventListener(`db_update_${collection}`, handler);
  },

  // RESTAURAÇÃO: Batch que acumula mudanças e salva apenas uma vez
  batch: () => {
    const database = getDb();
    const changes = new Set<string>();

    return {
      set: (collection: string, id: string, data: any) => {
        if (!database[collection]) database[collection] = {};
        database[collection][id] = { ...data, updated_at: Date.now() };
        changes.add(collection);
      },
      update: (collection: string, id: string, data: any) => {
        if (!database[collection] || !database[collection][id]) return;
        database[collection][id] = { ...database[collection][id], ...data, updated_at: Date.now() };
        changes.add(collection);
      },
      commit: async () => {
        saveDb(database);
        changes.forEach(collection => {
          window.dispatchEvent(new CustomEvent(`db_update_${collection}`, { detail: Object.values(database[collection]) }));
          // Notifica IDs específicos se necessário
          Object.keys(database[collection]).forEach(id => {
            window.dispatchEvent(new CustomEvent(`db_update_${collection}_${id}`, { detail: database[collection][id] }));
          });
        });
      }
    };
  }
};
