import { findByName } from '../mock/repositories/appointmentRepo.js';

export const WORKFLOW_ID = 'appointment';

/**
 * Available appointment types — read aloud by Aria when asking the caller
 * what kind of appointment they need.
 */
export const APPOINTMENT_TYPES = [
  'General Consultation',
  'Annual Check-up',
  'Follow-up Review',
  'Specialist Referral',
  'Vaccination',
  'Lab Test',
];

// Words that are clearly not real answers — trigger a retry
const FILLER_PATTERN = /^(uh+|um+|er+|ah+|oh+|huh|what|hm+|hmm+|dub|cold|hot|yes|no|ok|okay|sure|yeah|nope|nah|\.+|,+|\?+|!+|\s*)$/i;

function hasRealContent(transcript) {
  if (!transcript || transcript.trim().length < 3) return false;
  if (FILLER_PATTERN.test(transcript.trim())) return false;
  return /[a-zA-Z]{2,}/.test(transcript);
}

const typesList = APPOINTMENT_TYPES.map((t, i) => `${i + 1}. ${t}`).join(', ');

export const steps = [
  {
    step: 0,
    field: null,
    instruction: `Greet the caller: "Hello, this is Aria from CallOrchestrator. I can help you book, reschedule or cancel an appointment. How can I help you today?" Keep it short and natural.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 1,
    field: 'callerName',
    instruction: `Ask for the caller's name.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 2,
    field: 'appointmentType',
    instruction: `Check if this is a returning caller by looking up their name in the system (the system will do this automatically). Then ask what type of appointment they need. Read out the available options: ${typesList}. If they already have a past appointment, mention it naturally — e.g. "I can see you've visited us before for a [type] — would you like something similar or a different type?"`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 3,
    field: 'preferredDate',
    instruction: `Ask what date works for them.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 4,
    field: 'preferredTime',
    instruction: `Ask what time of day they prefer.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 5,
    field: null,
    instruction: `Read back the booking details in one sentence and ask them to confirm.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 6,
    field: null,
    instruction: `Tell the caller their appointment is booked, give them the reference number, and say goodbye warmly.`,
    validate: () => true,
  },
];

export const totalSteps = steps.length;

/**
 * Extract the field value for a given step from the transcript.
 * For appointmentType, try to match against known types first.
 */
export function extractField(stepIndex, transcript) {
  const step = steps[stepIndex];
  if (!step || !step.field) return null;

  if (step.field === 'appointmentType') {
    const lower = transcript.toLowerCase();
    const match = APPOINTMENT_TYPES.find((t) => lower.includes(t.toLowerCase()));
    return match || transcript.trim();
  }

  return transcript.trim();
}

/**
 * Look up past appointments for a caller by name.
 * Returns the most recent appointment or null.
 */
export function lookupCaller(name) {
  if (!name) return null;
  const past = findByName(name);
  if (!past.length) return null;
  return past.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}
