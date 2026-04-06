import { appointmentsSeed } from '../data/appointments.seed.js';
import { generateId }       from '../../utils/idGenerator.js';

/**
 * In-memory appointment repository.
 * Initialised with seed data. Interface is swappable for a real DB.
 *
 * @type {object[]}
 */
const store = appointmentsSeed.map((a) => ({ ...a }));

export const appointmentRepo = {
  /**
   * Return all appointments.
   * @returns {object[]}
   */
  findAll() {
    return [...store];
  },

  /**
   * Find a single appointment by ID.
   * @param {string} id
   * @returns {object|undefined}
   */
  findById(id) {
    return store.find((a) => a.id === id);
  },

  /**
   * Create and persist a new appointment.
   * @param {object} data
   * @returns {object} The created appointment record
   */
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
    return record;
  },
};

// Named export for direct use in dialogueManager
export const { findAll, findById, create } = appointmentRepo;
