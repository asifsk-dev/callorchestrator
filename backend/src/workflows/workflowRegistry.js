import * as appointmentWorkflow from './appointmentWorkflow.js';
import * as followUpWorkflow    from './followUpWorkflow.js';
import * as supportWorkflow     from './supportWorkflow.js';

/**
 * Registry that maps a workflow intent string to its module.
 *
 * To add a new workflow:
 *   1. Create /workflows/myWorkflow.js following the same schema.
 *   2. Import it here and add an entry to the registry map.
 *
 * @type {Map<string, object>}
 */
const registry = new Map([
  [appointmentWorkflow.WORKFLOW_ID, appointmentWorkflow],
  [followUpWorkflow.WORKFLOW_ID,    followUpWorkflow],
  [supportWorkflow.WORKFLOW_ID,     supportWorkflow],
]);

/**
 * Look up a workflow module by intent string.
 * Falls back to the appointment workflow if the intent is unrecognised.
 *
 * @param {string} intent
 * @returns {object} Workflow module
 */
export function getWorkflow(intent) {
  return registry.get(intent) ?? appointmentWorkflow;
}

/**
 * Return all registered workflow IDs.
 * @returns {string[]}
 */
export function listWorkflows() {
  return Array.from(registry.keys());
}
