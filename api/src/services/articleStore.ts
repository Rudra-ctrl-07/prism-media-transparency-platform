/**
 * articleStore.ts — article persistence with a zero-config fallback.
 *
 * When Firebase Admin (Firestore) is configured, articles are persisted to
 * Firestore as before. When no service account is available, articles live in
 * an in-memory store so the backend still serves REAL ingested articles from
 * live RSS feeds — no demo data, no credentials required.
 */

import { getFirestore, FieldValue, DocumentData } from 'firebase-admin/firestore';

/**
 * Real persistence requires a Firebase service account. Without one the app
 * runs in zero-config mode and articles live in memory. (Note: a default
 * Firebase app is always initialized even without credentials, so the check
 * must key off the env var, not getFirestore() throwing.)
 */
function getDb(): FirebaseFirestore.Firestore | null {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) return null;
  try {
    return getFirestore();
  } catch {
    return null;
  }
}

/** True when Firestore is reachable; false → in-memory mode. */
export function isPersistent(): boolean {
  return getDb() !== null;
}

const memory: any[] = [];

export interface ListOptions {
  limit?: number;
  offset?: number;
  source?: string;
  startDate?: string;
  endDate?: string;
  minCredibility?: number;
}

export async function listArticles(opts: ListOptions = {}): Promise<any[]> {
  const db = getDb();
  if (!db) {
    let list = [...memory];
    if (opts.source) list = list.filter((a) => a.source === opts.source);
    if (opts.minCredibility != null) {
      list = list.filter((a) => (a.sourceCredibility ?? 0.5) >= opts.minCredibility!);
    }
    if (opts.startDate) {
      const start = new Date(opts.startDate).getTime();
      list = list.filter((a) => new Date(a.publishedAt).getTime() >= start);
    }
    if (opts.endDate) {
      const end = new Date(opts.endDate).getTime();
      list = list.filter((a) => new Date(a.publishedAt).getTime() <= end);
    }
    list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    const offset = opts.offset || 0;
    return list.slice(offset, offset + (opts.limit || 20));
  }

  let query = db.collection('articles').orderBy('publishedAt', 'desc');
  if (opts.source) query = query.where('source', '==', opts.source);
  if (opts.startDate) {
    const startDate = new Date(opts.startDate);
    if (!isNaN(startDate.getTime())) query = query.where('publishedAt', '>=', startDate);
  }
  if (opts.endDate) {
    const endDate = new Date(opts.endDate);
    if (!isNaN(endDate.getTime())) query = query.where('publishedAt', '<=', endDate);
  }
  if (opts.minCredibility != null) {
    const min = parseFloat(String(opts.minCredibility));
    if (!isNaN(min)) query = query.where('sourceCredibility', '>=', min);
  }
  query = query.offset(opts.offset || 0).limit(opts.limit || 20);
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getArticle(id: string): Promise<any | null> {
  const db = getDb();
  if (!db) {
    return memory.find((a) => a.id === id) || null;
  }
  const doc = await db.collection('articles').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/** Find an existing article by its original link (for deduplication). */
export async function findByLink(link: string): Promise<any | null> {
  const db = getDb();
  if (!db) {
    return memory.find((a) => a.link === link) || null;
  }
  const snapshot = await db.collection('articles').where('link', '==', link).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/** Persist a new article; returns its id. */
export async function saveArticle(article: any): Promise<string> {
  const db = getDb();
  if (!db) {
    const id = `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    memory.push({ id, ...article });
    return id;
  }
  const docRef = await db.collection('articles').add({
    ...article,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing article; returns the updated article or null. */
export async function updateArticle(id: string, patch: any): Promise<any | null> {
  const db = getDb();
  if (!db) {
    const idx = memory.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    memory[idx] = { ...memory[idx], ...patch, updatedAt: new Date().toISOString() };
    return memory[idx];
  }
  const ref = db.collection('articles').doc(id);
  const doc = await ref.get();
  if (!doc.exists) return null;
  await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
  return { id, ...doc.data(), ...patch };
}

/** Delete an article; returns true if something was deleted. */
export async function deleteArticle(id: string): Promise<boolean> {
  const db = getDb();
  if (!db) {
    const idx = memory.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    memory.splice(idx, 1);
    return true;
  }
  const ref = db.collection('articles').doc(id);
  const doc = await ref.get();
  if (!doc.exists) return false;
  await ref.delete();
  return true;
}

export async function countArticles(): Promise<number> {
  const db = getDb();
  if (!db) return memory.length;
  const snapshot = await db.collection('articles').count().get();
  return snapshot.data().count;
}

/** Clear the in-memory store (used when switching modes / tests). */
export function resetMemoryStore(): void {
  memory.length = 0;
}
