/**
 * Support Workflow — Stub
 *
 * Placeholder for a future customer support workflow.
 * Implement steps array following the same schema as appointmentWorkflow.js.
 */

export const WORKFLOW_ID = 'support';

export const steps = [
  {
    step: 0,
    field: null,
    instruction: `Greet the caller and let them know you are here to help with their support issue. Ask them to describe the problem they are experiencing.`,
    validate: (_data, transcript) => transcript && transcript.trim().length > 0,
  },
];

export const totalSteps = steps.length;

export function extractField(_stepIndex, transcript) {
  return transcript.trim();
}
