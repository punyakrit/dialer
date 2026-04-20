"use client";

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "dialer";
const STORE = "drafts";

type DraftsSchema = {
  drafts: {
    key: string;
    value: { key: string; value: string; updatedAt: number };
  };
};

let _db: Promise<IDBPDatabase<DraftsSchema>> | null = null;

function db(): Promise<IDBPDatabase<DraftsSchema>> {
  if (!_db) {
    _db = openDB<DraftsSchema>(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "key" });
        }
      },
    });
  }
  return _db;
}

export async function saveDraft(key: string, value: string): Promise<void> {
  const d = await db();
  await d.put(STORE, { key, value, updatedAt: Date.now() });
}

export async function loadDraft(key: string): Promise<string | null> {
  const d = await db();
  const row = await d.get(STORE, key);
  return row?.value ?? null;
}

export async function clearDraft(key: string): Promise<void> {
  const d = await db();
  await d.delete(STORE, key);
}

export async function listDrafts(): Promise<
  Array<{ key: string; value: string; updatedAt: number }>
> {
  const d = await db();
  return d.getAll(STORE);
}
