// Persiste no IndexedDB o último arquivo/pasta aberto (FileSystemHandle não
// serializa em localStorage). Usado para reabrir a última página ao recarregar.
// Não guarda edições — apenas o ponteiro para o arquivo.

const DB_NAME = 'omni-session';
const STORE = 'kv';
const KEY = 'last';

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function reqAsync(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSession(data) {
  try {
    const db = await openDB();
    await reqAsync(db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, KEY));
  } catch { /* sessão é conveniência: nunca deve travar o fluxo */ }
}

export async function loadSession() {
  try {
    const db = await openDB();
    return await reqAsync(db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY));
  } catch { return null; }
}

export async function clearSession() {
  try {
    const db = await openDB();
    await reqAsync(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY));
  } catch { /* ignora */ }
}
