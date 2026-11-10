// Run with: npm test   (from the QuotePilot folder)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EMPTY_META, applyResponse, buildChanges, hasPending, markAllDirty, markDirty } from '../src/services/sync.js';

const T1 = '2026-11-10T10:00:00.000Z';
const T2 = '2026-11-10T11:00:00.000Z';
const T3 = '2026-11-10T12:00:00.000Z';
const quote = (id, updatedAt, extra = {}) => ({ id, updatedAt, title: id, ...extra });

test('local edits are queued, uploaded, then cleared', () => {
  const state = { profile: { businessName: 'Rivera', updatedAt: T1 }, quotes: [quote('q1', T1)] };
  let meta = markDirty(EMPTY_META, 'profile', 'main', T1);
  meta = markDirty(meta, 'quote', 'q1', T1);
  assert.ok(hasPending(meta));

  const sent = buildChanges(meta, state);
  assert.deepEqual(sent.map((c) => [c.kind, c.id]), [['profile', 'main'], ['quote', 'q1']]);
  assert.equal(sent[1].data.title, 'q1');

  const result = applyResponse(meta, sent, { rev: 7, changes: [] }, state);
  assert.equal(result.meta.rev, 7);
  assert.ok(!hasPending(result.meta));
  assert.deepEqual(result.quotes, state.quotes);
});

test('changes from another device are merged in', () => {
  const state = { profile: null, quotes: [quote('q1', T1), quote('q2', T1)] };
  const response = {
    rev: 12,
    changes: [
      { kind: 'profile', id: 'main', updatedAt: T2, data: { businessName: 'Rivera' } },
      { kind: 'quote', id: 'q1', updatedAt: T2, data: quote('q1', T2, { title: 'edited elsewhere' }) },
      { kind: 'quote', id: 'q2', updatedAt: T2, deleted: true, data: {} },
      { kind: 'quote', id: 'q3', updatedAt: T2, data: quote('q3', T2) },
    ],
  };
  const result = applyResponse(EMPTY_META, [], response, state);
  assert.equal(result.profile.businessName, 'Rivera');
  assert.deepEqual(result.quotes.map((q) => q.id).sort(), ['q1', 'q3']);
  assert.equal(result.quotes.find((q) => q.id === 'q1').title, 'edited elsewhere');
});

test('an edit made while a sync is in flight is kept and re-queued', () => {
  const before = { profile: null, quotes: [quote('q1', T1)] };
  const meta = markDirty(EMPTY_META, 'quote', 'q1', T1);
  const sent = buildChanges(meta, before);

  // ...the owner edits the quote again before the server answers.
  const now = { profile: null, quotes: [quote('q1', T3, { title: 'latest' })] };
  const metaNow = markDirty(meta, 'quote', 'q1', T3);

  const result = applyResponse(metaNow, sent, { rev: 3, changes: [] }, now);
  assert.equal(result.meta.dirty['quote:q1'].updatedAt, T3);
  assert.equal(result.quotes[0].title, 'latest');
});

test('a newer local edit beats an older remote one; an older local edit yields', () => {
  const state = { profile: null, quotes: [quote('q1', T3, { title: 'mine' })] };
  const meta = markDirty(EMPTY_META, 'quote', 'q1', T3);
  const older = applyResponse(meta, [], { rev: 4, changes: [{ kind: 'quote', id: 'q1', updatedAt: T2, data: quote('q1', T2, { title: 'theirs' }) }] }, state);
  assert.equal(older.quotes[0].title, 'mine');
  assert.ok(hasPending(older.meta));

  // We uploaded an edit from T1 but the server already had T2: it sends the winner back.
  const stale = { profile: null, quotes: [quote('q1', T1, { title: 'stale' })] };
  const staleMeta = markDirty(EMPTY_META, 'quote', 'q1', T1);
  const sent = buildChanges(staleMeta, stale);
  const lost = applyResponse(staleMeta, sent, { rev: 5, changes: [{ kind: 'quote', id: 'q1', updatedAt: T2, data: quote('q1', T2, { title: 'winner' }) }] }, stale);
  assert.equal(lost.quotes[0].title, 'winner');
  assert.ok(!hasPending(lost.meta));
});

test('deleting a quote uploads a tombstone', () => {
  const meta = markDirty(EMPTY_META, 'quote', 'q1', T2, true);
  const sent = buildChanges(meta, { profile: null, quotes: [] });
  assert.deepEqual(sent, [{ kind: 'quote', id: 'q1', updatedAt: T2, deleted: true }]);
  assert.ok(!hasPending(applyResponse(meta, sent, { rev: 2, changes: [] }, { profile: null, quotes: [] }).meta));
});

test('large backlogs go up in batches; adopting local data queues everything', () => {
  const quotes = Array.from({ length: 450 }, (_, i) => quote(`q${i}`, T1));
  let meta = markAllDirty(EMPTY_META, { profile: { updatedAt: T1 }, quotes });
  assert.equal(Object.keys(meta.dirty).length, 451);
  let rounds = 0;
  while (hasPending(meta)) {
    const sent = buildChanges(meta, { profile: { updatedAt: T1 }, quotes });
    assert.ok(sent.length <= 200);
    meta = applyResponse(meta, sent, { rev: rounds + 1, changes: [] }, { profile: { updatedAt: T1 }, quotes }).meta;
    rounds += 1;
  }
  assert.equal(rounds, 3);
});
