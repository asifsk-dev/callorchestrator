import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { appointmentsSeed } from '../data/appointments.seed.js';
import { generateId }       from '../../utils/idGenerator.js';

/**
 * JSON-backed appointment repository with automatic reset every 3 days.
 *
 * Data is persisted to /tmp/appointments.json (writable on Railway/Render).
 * On startup, if the file is missing OR older than RESET_DAYS, it is
 * re-seeded from appointmentsSeed — mimicking a periodic data reset for demo
 * purposes without needing a real database.
 */

const RESET_DAYS  = 3;
const DATA_FILE   = path.join('/tmp', 'appointments.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedData() {
  return appointmentsSeed.map((a) => ({ ...a }));
}

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw  = fs.readFileSync(DATA_FILE, 'utf8');
    const json = JSON.parse(raw);
    // Auto-reset if older than RESET_DAYS
    const ageMs  = Date.now() - new Date(json.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays >= RESET_DAYS) return null;
    return json.records;
  } catch {
    return null;
  }
}

function save(records) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ createdAt: new Date().toISOString(), records }, null, 2));
  } catch (err) {
    // /tmp not writable in some environments — fall back to in-memory silently
    console.warn('[appointmentRepo] Could not write to', DATA_FILE, err.message);
  }
}

// ── Initialise store ──────────────────────────────────────────────────────────

let store = load();
if (!store) {
  store = seedData();
  save(store);
}

// ── Repository ────────────────────────────────────────────────────────────────

export const appointmentRepo = {
  findAll() {
    return [...store];
  },

  findById(id) {
    return store.find((a) => a.id === id);
  },

  findByName(name) {
    if (!name) return [];
    const lower = name.toLowerCase();
    return store.filter((a) => a.callerName?.toLowerCase().includes(lower));
  },

  create(data) {
    const record = {
      id:              generateId(),
      callerName:      data.callerName      || '',
      appointmentType: data.appointmentType || '',
      preferredDate:   data.preferredDate   || '',
      preferredTime:   data.preferredTime   || '',
      bookingRef:      data.bookingRef      || `APT-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt:       new Date().toISOString(),
    };
    store.push(record);
    save(store);
    return record;
  },
};

export const { findAll, findById, findByName, create } = appointmentRepo;
