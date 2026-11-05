import { normalizeApiKey, sanitizeApiKey } from './apiKey'
import type { PaintingRecord } from './types'

const API_KEY_STORAGE = 'bytego-paint.apiKey'
const DB_NAME = 'bytego-paint'
const STORE = 'paintings'
const DB_VERSION = 1

export function getApiKey(): string {
  return sanitizeApiKey(localStorage.getItem(API_KEY_STORAGE) ?? '')
}

export function setApiKey(value: string) {
  const normalized = normalizeApiKey(value)
  localStorage.setItem(API_KEY_STORAGE, normalized)
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE)
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const store = tx.objectStore(STORE)
        const request = run(store)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
      })
  )
}

export async function listPaintings(): Promise<PaintingRecord[]> {
  const rows = await withStore<PaintingRecord[]>('readonly', (store) => store.getAll())
  return rows.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function putPainting(record: PaintingRecord): Promise<void> {
  await withStore('readwrite', (store) => store.put(record))
}

export async function deletePainting(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}

export function createDraftPainting(
  partial?: Partial<Pick<PaintingRecord, 'prompt' | 'model' | 'size' | 'referenceImages'>>
): PaintingRecord {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    prompt: partial?.prompt ?? '',
    model: partial?.model ?? 'gpt-image-2',
    size: partial?.size ?? '1024x1024',
    referenceImages: partial?.referenceImages ?? [],
    createdAt: now,
    updatedAt: now
  }
}
