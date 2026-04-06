/**
 * Appointment Booking Workflow
 *
 * 6-step workflow that collects all information needed to book an appointment.
 * Each step defines:
 *   - field:       The collectedData key populated at this step (null if none)
 *   - instruction: LLM instruction injected into the prompt for this step
 *   - validate:    Function that returns true if the step data is acceptable
 */

export const WORKFLOW_ID = 'appointment';

export const steps = [
  {
    step: 0,
    field: null,
    instruction: `Greet the caller warmly and professionally. Introduce yourself as an AI scheduling assistant for CallOrchestrator. Ask for the caller's full name to get started.`,
    validate: (_data, transcript) => transcript && transcript.trim().length > 0,
  },
  {
    step: 1,
    field: 'callerName',
    instruction: `The caller has just provided their name. Acknowledge it warmly. Ask what type of appointment they would like to schedule (e.g. consultation, check-up, follow-up, service).`,
    validate: (_data, transcript) => transcript && transcript.trim().length > 1,
  },
  {
    step: 2,
    field: 'appointmentType',
    instruction: `The caller has told you the type of appointment. Confirm it briefly. Ask for their preferred date for the appointment. Be flexible — accept natural language like "next Tuesday" or "sometime this week".`,
    validate: (_data, transcript) => transcript && transcript.trim().length > 1,
  },
  {
    step: 3,
    field: 'preferredDate',
    instruction: `The caller has given a preferred date. Acknowledge it. Now ask what time of day works best for them. Offer morning, afternoon, or evening as options if they seem unsure.`,
    validate: (_data, transcript) => transcript && transcript.trim().length > 1,
  },
  {
    step: 4,
    field: 'preferredTime',
    instruction: `You have now collected all the appointment details. Read back a clear summary of everything:
- Caller name
- Appointment type
- Preferred date
- Preferred time

Ask the caller to confirm these details are correct before you finalize the booking.`,
    validate: (_data, transcript) => transcript && transcript.trim().length > 0,
  },
  {
    step: 5,
    field: null,
    instruction: `The caller has confirmed the booking details. Generate a short booking reference number (format: APT-XXXX where X is a digit). Inform the caller their appointment has been successfully booked, provide the reference number, and thank them warmly. Let them know they will receive a confirmation. End the call gracefully.`,
    validate: () => true,
  },
];

export const totalSteps = steps.length;

/**
 * Extract a structured field value from a transcript at a given step.
 * Returns the raw transcript trimmed — the LLM has already validated intent.
 *
 * @param {number} stepIndex
 * @param {string} transcript
 * @returns {string|null}
 */
export function extractField(stepIndex, transcript) {
  const step = steps[stepIndex];
  if (!step || !step.field) return null;
  return transcript.trim();
}
