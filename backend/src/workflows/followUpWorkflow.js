/**
 * Follow-Up Workflow — Stub
 *
 * Placeholder for a future follow-up call workflow.
 * Implement steps array following the same schema as appointmentWorkflow.js.
 */

export const WORKFLOW_ID = 'followup';

export const steps = [
  {
    step: 0,
    field: null,
    instruction: `Greet the caller and explain this is a follow-up call. Ask how they have been since their last interaction.`,
    validate: (_data, transcript) => transcript && transcript.trim().length > 0,
  },
];

export const totalSteps = steps.length;

export function extractField(_stepIndex, transcript) {
  return transcript.trim();
}
