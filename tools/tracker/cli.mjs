#!/usr/bin/env node

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const STATUSES = new Set(['pending', 'in_progress', 'blocked', 'done']);
const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(TOOL_DIR, '../..');
export const DEFAULT_TRACKER = resolve(REPO_ROOT, 'docs/modernization/TRACKER.yml');

export function loadTracker(path = DEFAULT_TRACKER) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot parse ${path} as JSON-compatible YAML: ${error.message}`);
  }
}

export function validateTracker(tracker, repoRoot = REPO_ROOT) {
  const errors = [];
  if (tracker?.version !== 1) errors.push('version must be 1');
  if (!Array.isArray(tracker?.tickets) || tracker.tickets.length === 0) {
    return [...errors, 'tickets must be a non-empty array'];
  }

  const ids = new Set();
  for (const ticket of tracker.tickets) {
    if (!/^FH-\d{3}$/.test(ticket.id ?? '')) errors.push(`invalid ticket id: ${ticket.id}`);
    if (ids.has(ticket.id)) errors.push(`duplicate ticket id: ${ticket.id}`);
    ids.add(ticket.id);
    if (!ticket.title) errors.push(`${ticket.id}: title is required`);
    if (!STATUSES.has(ticket.status)) errors.push(`${ticket.id}: invalid status ${ticket.status}`);
    if (!Array.isArray(ticket.depends_on)) errors.push(`${ticket.id}: depends_on must be an array`);
    if (!Array.isArray(ticket.evidence)) errors.push(`${ticket.id}: evidence must be an array`);
    if (!Array.isArray(ticket.implementation_commits)) errors.push(`${ticket.id}: implementation_commits must be an array`);
    if (!ticket.path || !existsSync(resolve(repoRoot, ticket.path))) errors.push(`${ticket.id}: missing ticket file ${ticket.path}`);
    if (ticket.status === 'done' && (!ticket.evidence?.length || !ticket.implementation_commits?.length)) {
      errors.push(`${ticket.id}: done tickets require evidence and an implementation commit`);
    }
    if (ticket.status === 'blocked' && (!ticket.blocked_reason || !ticket.unblock_condition)) {
      errors.push(`${ticket.id}: blocked tickets require a reason and unblock condition`);
    }
  }

  for (const ticket of tracker.tickets) {
    for (const dependency of ticket.depends_on ?? []) {
      if (!ids.has(dependency)) errors.push(`${ticket.id}: unknown dependency ${dependency}`);
      if (dependency === ticket.id) errors.push(`${ticket.id}: cannot depend on itself`);
    }
  }

  const active = tracker.tickets.filter((ticket) => ticket.status === 'in_progress');
  if (active.length > 1) errors.push('only one ticket may be in_progress');
  if (active.length === 0 && tracker.active_ticket !== null) errors.push('active_ticket must be null when no ticket is in_progress');
  if (active.length === 1 && tracker.active_ticket !== active[0].id) errors.push('active_ticket must identify the in_progress ticket');
  if (tracker.active_ticket !== null && !ids.has(tracker.active_ticket)) errors.push(`active_ticket is unknown: ${tracker.active_ticket}`);
  return errors;
}

export function nextTicket(tracker) {
  const done = new Set(tracker.tickets.filter((ticket) => ticket.status === 'done').map((ticket) => ticket.id));
  return tracker.tickets.find((ticket) => ticket.status === 'pending' && ticket.depends_on.every((id) => done.has(id))) ?? null;
}

function atomicSave(path, tracker) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(tracker, null, 2)}\n`);
  renameSync(temporary, path);
}

function findTicket(tracker, id) {
  const ticket = tracker.tickets.find((candidate) => candidate.id === id);
  if (!ticket) throw new Error(`Unknown ticket: ${id}`);
  return ticket;
}

function currentCommit(repoRoot = REPO_ROOT) {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

export function mutateTracker(tracker, command, id, options = {}) {
  const now = options.now ?? new Date().toISOString();
  const ticket = findTicket(tracker, id);
  if (command === 'claim') {
    if (tracker.active_ticket) throw new Error(`${tracker.active_ticket} is already active`);
    if (ticket.status !== 'pending') throw new Error(`${id} must be pending to claim`);
    const incomplete = ticket.depends_on.filter((dependency) => findTicket(tracker, dependency).status !== 'done');
    if (incomplete.length) throw new Error(`${id} has incomplete dependencies: ${incomplete.join(', ')}`);
    ticket.status = 'in_progress';
    ticket.claimed_at = now;
    ticket.updated_at = now;
    tracker.active_ticket = id;
  } else if (command === 'complete') {
    if (ticket.status !== 'in_progress' || tracker.active_ticket !== id) throw new Error(`${id} must be active to complete`);
    if (!options.evidence) throw new Error('complete requires --evidence');
    ticket.evidence.push(options.evidence);
    const commit = options.commit ?? currentCommit(options.repoRoot);
    if (!ticket.implementation_commits.includes(commit)) ticket.implementation_commits.push(commit);
    ticket.status = 'done';
    ticket.updated_at = now;
    tracker.active_ticket = null;
  } else if (command === 'block') {
    if (ticket.status !== 'in_progress' || tracker.active_ticket !== id) throw new Error(`${id} must be active to block`);
    if (!options.reason || !options.unblock) throw new Error('block requires --reason and --unblock');
    ticket.status = 'blocked';
    ticket.blocked_reason = options.reason;
    ticket.unblock_condition = options.unblock;
    ticket.updated_at = now;
    tracker.active_ticket = null;
  } else if (command === 'release') {
    if (!['in_progress', 'blocked'].includes(ticket.status)) throw new Error(`${id} must be active or blocked to release`);
    if (ticket.status === 'in_progress' && tracker.active_ticket !== id) throw new Error(`${id} is not the active ticket`);
    ticket.status = 'pending';
    ticket.claimed_at = null;
    ticket.blocked_reason = null;
    ticket.unblock_condition = null;
    ticket.updated_at = now;
    if (tracker.active_ticket === id) tracker.active_ticket = null;
  } else {
    throw new Error(`Unsupported mutation: ${command}`);
  }
  return tracker;
}

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
}

function printStatus(tracker) {
  const counts = Object.fromEntries([...STATUSES].map((status) => [status, 0]));
  for (const ticket of tracker.tickets) counts[ticket.status] += 1;
  console.log(`active: ${tracker.active_ticket ?? 'none'}`);
  console.log([...STATUSES].map((status) => `${status}: ${counts[status]}`).join(' | '));
  for (const ticket of tracker.tickets.filter((item) => item.status === 'blocked')) {
    console.log(`blocked ${ticket.id}: ${ticket.blocked_reason} (unblock: ${ticket.unblock_condition})`);
  }
  const next = nextTicket(tracker);
  console.log(`next: ${next ? `${next.id} ${next.title}` : 'none'}`);
}

export function main(argv = process.argv.slice(2)) {
  const trackerIndex = argv.indexOf('--tracker');
  const trackerPath = resolve(trackerIndex === -1 ? DEFAULT_TRACKER : argv[trackerIndex + 1]);
  const args = trackerIndex === -1 ? argv : argv.filter((_, index) => index !== trackerIndex && index !== trackerIndex + 1);
  const [command, id] = args;
  const tracker = loadTracker(trackerPath);
  const initialErrors = validateTracker(tracker, REPO_ROOT);
  if (initialErrors.length) throw new Error(`Tracker is invalid:\n- ${initialErrors.join('\n- ')}`);

  if (command === 'validate') return console.log(`valid: ${tracker.tickets.length} tickets`);
  if (command === 'status') return printStatus(tracker);
  if (command === 'next') {
    const next = nextTicket(tracker);
    return console.log(next ? `${next.id}\t${next.title}\t${next.path}` : 'none');
  }
  if (!['claim', 'complete', 'block', 'release'].includes(command) || !id) {
    throw new Error('Usage: ralph <validate|status|next|claim ID|complete ID --evidence TEXT|block ID --reason TEXT --unblock TEXT|release ID>');
  }
  mutateTracker(tracker, command, id, {
    evidence: option(args, '--evidence'), reason: option(args, '--reason'),
    unblock: option(args, '--unblock'), repoRoot: REPO_ROOT
  });
  const errors = validateTracker(tracker, REPO_ROOT);
  if (errors.length) throw new Error(`Mutation produced an invalid tracker:\n- ${errors.join('\n- ')}`);
  atomicSave(trackerPath, tracker);
  console.log(`${command}: ${id}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
