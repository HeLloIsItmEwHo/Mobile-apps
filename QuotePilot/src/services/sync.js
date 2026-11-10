// Offline-first sync. The device is always the working copy; this module
// tracks what has changed locally ("dirty") and merges what changed elsewhere.
//
// Everything here is pure (no storage, no network) so it can be unit-tested:
// see tests/sync.test.mjs. App.js owns the wiring.
//
// meta = { rev, dirty }
//   rev   – the newest server revision this device has applied
//   dirty – { 'quote:<id>' | 'profile:main': { updatedAt, deleted } } still to upload

export const EMPTY_META = { rev: 0, dirty: {} };
export const PROFILE_ID = 'main';
const BATCH = 200;

const keyOf = (kind, id) => `${kind}:${id}`;

export function markDirty(meta, kind, id, updatedAt, deleted = false) {
  return { ...meta, dirty: { ...meta.dirty, [keyOf(kind, id)]: { updatedAt, deleted } } };
}

export function hasPending(meta) {
  return Object.keys(meta.dirty).length > 0;
}

// Marks every local document as needing upload (used when data that was
// created before signing in is adopted by a new account).
export function markAllDirty(meta, { profile, quotes }) {
  let next = meta;
  const now = new Date().toISOString();
  if (profile) next = markDirty(next, 'profile', PROFILE_ID, profile.updatedAt || now);
  quotes.forEach((quote) => {
    next = markDirty(next, 'quote', quote.id, quote.updatedAt || now);
  });
  return next;
}

// The next batch of local changes to send to the server.
export function buildChanges(meta, { profile, quotes }) {
  const changes = [];
  for (const [key, entry] of Object.entries(meta.dirty)) {
    if (changes.length >= BATCH) break;
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    const id = key.slice(separator + 1);
    if (entry.deleted) {
      changes.push({ kind, id, updatedAt: entry.updatedAt, deleted: true });
    } else {
      const data = kind === 'profile' ? profile : quotes.find((quote) => quote.id === id);
      if (data) changes.push({ kind, id, updatedAt: entry.updatedAt, data });
    }
  }
  return changes;
}

// Folds a server response into the current local state.
//   sent  – the changes that were uploaded in this request
//   state – local state *now* (it may have changed while the request was in flight)
export function applyResponse(meta, sent, response, state) {
  const dirty = { ...meta.dirty };

  // Uploaded changes are no longer pending — unless the document was edited
  // again while the request was in flight, in which case the newer edit stays queued.
  sent.forEach((change) => {
    const key = keyOf(change.kind, change.id);
    if (dirty[key] && dirty[key].updatedAt === change.updatedAt) delete dirty[key];
  });
  // Dirty entries whose document no longer exists locally can never upload.
  Object.keys(dirty).forEach((key) => {
    if (dirty[key].deleted) return;
    const exists = key.startsWith('profile:') ? Boolean(state.profile) : state.quotes.some((quote) => keyOf('quote', quote.id) === key);
    if (!exists) delete dirty[key];
  });

  let { profile } = state;
  let quotes = state.quotes;
  (response.changes || []).forEach((change) => {
    const key = keyOf(change.kind, change.id);
    // A local edit that is newer than the incoming one wins and stays queued.
    if (dirty[key] && dirty[key].updatedAt > change.updatedAt) return;
    delete dirty[key];

    if (change.kind === 'profile') {
      if (!change.deleted) profile = change.data;
    } else if (change.kind === 'quote') {
      quotes = quotes.filter((quote) => quote.id !== change.id);
      if (!change.deleted) quotes = [...quotes, change.data];
    }
  });

  return { meta: { rev: Math.max(meta.rev, Number(response.rev) || 0), dirty }, profile, quotes };
}
