// Histórico de edições: versões da página persistidas no IndexedDB do navegador

const DB_NAME = 'omni-history';
const STORE = 'versions';
const MAX_PER_FILE = 30;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('fileKey', 'fileKey');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function reqAsync(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return h;
}

// Grava uma versão; ignora se for idêntica à mais recente do mesmo arquivo
export async function addVersion({ fileKey, fileName, label, html }) {
  if (!html) return null;
  try {
    const db = await openDB();
    const h = hash(html);
    const latest = (await listVersions(fileKey, db))[0];
    if (latest && latest.hash === h) return null;
    const rec = { fileKey, fileName, label, html, hash: h, ts: Date.now(), size: html.length };
    rec.id = await reqAsync(tx(db, 'readwrite').add(rec));
    await prune(fileKey, db);
    return rec;
  } catch {
    return null; // histórico é conveniência: nunca deve travar o fluxo de salvar
  }
}

export async function listVersions(fileKey, db = null) {
  try {
    db = db || await openDB();
    const all = await reqAsync(tx(db, 'readonly').index('fileKey').getAll(fileKey));
    return all.sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

export async function getVersion(id) {
  const db = await openDB();
  return reqAsync(tx(db, 'readonly').get(id));
}

export async function deleteVersion(id) {
  const db = await openDB();
  return reqAsync(tx(db, 'readwrite').delete(id));
}

async function prune(fileKey, db) {
  const all = await listVersions(fileKey, db);
  for (const v of all.slice(MAX_PER_FILE)) {
    await reqAsync(tx(db, 'readwrite').delete(v.id));
  }
}
