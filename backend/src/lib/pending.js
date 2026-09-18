import crypto from 'node:crypto';

/**
 * Parsed-but-not-published uploads, held between the preview and the confirm.
 *
 * An upload is diffed and shown first; nothing reaches the database until the
 * user says publish. Entries are held in memory only — a restart drops them,
 * which is the right outcome: an unconfirmed upload should never be published
 * by surprise. They expire so a forgotten preview cannot pin rows in memory.
 */

const TTL_MS = 20 * 60 * 1000;
const MAX_PENDING = 3;

const pending = new Map();

function sweep() {
  const now = Date.now();
  for (const [id, entry] of pending) {
    if (now - entry.createdAt > TTL_MS) pending.delete(id);
  }
}

export function putPending(payload) {
  sweep();
  // Oldest first, so an abandoned preview is dropped before a fresh one.
  while (pending.size >= MAX_PENDING) {
    pending.delete(pending.keys().next().value);
  }
  const id = crypto.randomUUID();
  pending.set(id, { ...payload, createdAt: Date.now() });
  return id;
}

export function takePending(id) {
  sweep();
  const entry = pending.get(id);
  if (!entry) return null;
  pending.delete(id);           // single use: confirming twice cannot double-publish
  return entry;
}

export function dropPending(id) {
  return pending.delete(id);
}
