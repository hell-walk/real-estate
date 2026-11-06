// A small JSON store on disk: data/db.json holds bookings and enquiries. Writes are serialised and atomic
// (write to a temp file, then rename), which is enough for a sales lounge, not for a bank.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './render.mjs';

const DIR = join(ROOT, 'data');
const FILE = join(DIR, 'db.json');
const EMPTY = { bookings: [], enquiries: [], seq: { booking: 0, enquiry: 0 } };

let db = null;
let chain = Promise.resolve();

export async function load() {
  if (db) return db;
  await mkdir(DIR, { recursive: true });
  try { db = { ...EMPTY, ...JSON.parse(await readFile(FILE, 'utf8')) }; }
  catch (err) { if (err.code !== 'ENOENT') throw err; db = structuredClone(EMPTY); }
  return db;
}

async function persist() {
  const tmp = FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, FILE);
}

// run a mutation on the store, one at a time, and save
export function mutate(fn) {
  chain = chain.then(async () => { await load(); const out = fn(db); await persist(); return out; });
  return chain;
}

export const SLOTS = ['10:30', '12:00', '15:00', '17:00'];
export const PROJECTS = ['Block A', 'Block B', 'Block C', 'Any block']; // which block the visitor wants to see
export const CAPACITY = 3; // visits per slot per day

export function nextRef(kind) {
  const n = ++db.seq[kind];
  return `${kind === 'booking' ? 'AR' : 'Q'}-${String(n).padStart(4, '0')}`;
}

export function slotsLeft(date) {
  const taken = {};
  for (const b of db.bookings) if (b.date === date && b.status !== 'cancelled') taken[b.slot] = (taken[b.slot] || 0) + 1;
  return Object.fromEntries(SLOTS.map((s) => [s, Math.max(0, CAPACITY - (taken[s] || 0))]));
}
