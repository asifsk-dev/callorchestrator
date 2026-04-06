import { contactsSeed } from '../data/contacts.seed.js';
import { generateId }   from '../../utils/idGenerator.js';

/**
 * In-memory contact repository.
 * Initialised with seed data. Interface is swappable for a real DB.
 *
 * @type {object[]}
 */
const store = contactsSeed.map((c) => ({ ...c }));

export const contactRepo = {
  /**
   * Return all contacts.
   * @returns {object[]}
   */
  findAll() {
    return [...store];
  },

  /**
   * Find a single contact by ID.
   * @param {string} id
   * @returns {object|undefined}
   */
  findById(id) {
    return store.find((c) => c.id === id);
  },

  /**
   * Find a contact by name (case-insensitive).
   * @param {string} name
   * @returns {object|undefined}
   */
  findByName(name) {
    const lower = name.toLowerCase();
    return store.find((c) => c.name.toLowerCase() === lower);
  },

  /**
   * Create and persist a new contact.
   * @param {object} data
   * @returns {object} The created contact record
   */
  create(data) {
    const record = {
      id:             generateId(),
      name:           data.name           || '',
      callbackNumber: data.callbackNumber || '',
      createdAt:      new Date().toISOString(),
    };
    store.push(record);
    return record;
  },
};

export const { findAll, findById, findByName, create } = contactRepo;
