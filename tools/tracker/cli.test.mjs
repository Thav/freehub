import test from 'node:test';
import assert from 'node:assert/strict';
import { mutateTracker, nextTicket, validateTracker } from './cli.mjs';

const ticket = (id, status = 'pending', dependsOn = []) => ({
  id, title: id, status, path: 'docs/modernization/tickets/FH-001-sbx-bootstrap.md',
  depends_on: dependsOn, claimed_at: null, updated_at: null, blocked_reason: null,
  unblock_condition: null, evidence: [], implementation_commits: []
});

test('selects the first dependency-ready ticket', () => {
  const tracker = { version: 1, active_ticket: null, tickets: [ticket('FH-001', 'done'), ticket('FH-002', 'pending', ['FH-001'])] };
  tracker.tickets[0].evidence = ['verified'];
  tracker.tickets[0].implementation_commits = ['abcdef0'];
  assert.equal(nextTicket(tracker).id, 'FH-002');
});

test('claim, block, and release maintain the active invariant', () => {
  const tracker = { version: 1, active_ticket: null, tickets: [ticket('FH-001')] };
  mutateTracker(tracker, 'claim', 'FH-001', { now: '2026-01-01T00:00:00.000Z' });
  assert.equal(tracker.active_ticket, 'FH-001');
  mutateTracker(tracker, 'block', 'FH-001', { reason: 'outside environment', unblock: 'run on host' });
  assert.equal(tracker.active_ticket, null);
  mutateTracker(tracker, 'release', 'FH-001');
  assert.equal(tracker.tickets[0].status, 'pending');
});

test('completion requires evidence and can be committed with the implementation', () => {
  const tracker = { version: 1, active_ticket: 'FH-001', tickets: [ticket('FH-001', 'in_progress')] };
  assert.throws(() => mutateTracker(tracker, 'complete', 'FH-001'), /--evidence/);
  mutateTracker(tracker, 'complete', 'FH-001', { evidence: 'tests pass' });
  assert.equal(tracker.tickets[0].status, 'done');
  assert.deepEqual(tracker.tickets[0].implementation_commits, []);
});

test('validation rejects multiple active tickets', () => {
  const tracker = { version: 1, active_ticket: 'FH-001', tickets: [ticket('FH-001', 'in_progress'), ticket('FH-002', 'in_progress')] };
  assert.ok(validateTracker(tracker).includes('only one ticket may be in_progress'));
});
