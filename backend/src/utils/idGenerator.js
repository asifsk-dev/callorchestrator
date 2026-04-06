import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a UUID v4 string.
 * @returns {string}
 */
export function generateId() {
  return uuidv4();
}
