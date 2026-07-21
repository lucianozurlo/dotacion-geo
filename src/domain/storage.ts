import { openDB, type IDBPDatabase } from 'idb';
import type { Employee, Snapshot, SnapshotData } from './types';

const DB_NAME = 'dotacion-geo';
const DB_VERSION = 1;
const STORE_META = 'snapshots';
const STORE_ROWS = 'rows';

let dbp: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE_META)) d.createObjectStore(STORE_META, { keyPath: 'id' });
        if (!d.objectStoreNames.contains(STORE_ROWS)) d.createObjectStore(STORE_ROWS);
      },
    });
  }
  return dbp;
}

export async function saveSnapshot(data: SnapshotData): Promise<void> {
  const d = await db();
  const tx = d.transaction([STORE_META, STORE_ROWS], 'readwrite');
  await tx.objectStore(STORE_META).put(data.snapshot);
  await tx.objectStore(STORE_ROWS).put(data.rows, data.snapshot.id);
  await tx.done;
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const d = await db();
  return (await d.getAll(STORE_META)) as Snapshot[];
}

export async function loadRows(id: string): Promise<Employee[]> {
  const d = await db();
  return ((await d.get(STORE_ROWS, id)) as Employee[]) ?? [];
}

export async function loadAllImported(): Promise<SnapshotData[]> {
  const metas = await listSnapshots();
  const out: SnapshotData[] = [];
  for (const snapshot of metas) {
    out.push({ snapshot, rows: await loadRows(snapshot.id) });
  }
  return out;
}

export async function deleteSnapshot(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction([STORE_META, STORE_ROWS], 'readwrite');
  await tx.objectStore(STORE_META).delete(id);
  await tx.objectStore(STORE_ROWS).delete(id);
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const d = await db();
  const tx = d.transaction([STORE_META, STORE_ROWS], 'readwrite');
  await tx.objectStore(STORE_META).clear();
  await tx.objectStore(STORE_ROWS).clear();
  await tx.done;
}

export function exportSnapshotJson(data: SnapshotData): Blob {
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
