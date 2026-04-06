import { ticketsSeed } from '../data/tickets.seed.js';
import { generateId }  from '../../utils/idGenerator.js';

/**
 * In-memory ticket repository.
 * Initialised with seed data. Interface is swappable for a real DB.
 *
 * @type {object[]}
 */
const store = ticketsSeed.map((t) => ({ ...t }));

export const ticketRepo = {
  /**
   * Return all tickets.
   * @returns {object[]}
   */
  findAll() {
    return [...store];
  },

  /**
   * Find a single ticket by ID.
   * @param {string} id
   * @returns {object|undefined}
   */
  findById(id) {
    return store.find((t) => t.id === id);
  },

  /**
   * Find a ticket by its reference number.
   * @param {string} ticketRef
   * @returns {object|undefined}
   */
  findByRef(ticketRef) {
    return store.find((t) => t.ticketRef === ticketRef);
  },

  /**
   * Create and persist a new support ticket.
   * @param {object} data
   * @returns {object} The created ticket record
   */
  create(data) {
    const record = {
      id:          generateId(),
      callerName:  data.callerName  || '',
      description: data.description || '',
      ticketRef:   data.ticketRef   || `TKT-${Math.floor(2000 + Math.random() * 8000)}`,
      createdAt:   new Date().toISOString(),
    };
    store.push(record);
    return record;
  },
};

export const { findAll, findById, findByRef, create } = ticketRepo;
