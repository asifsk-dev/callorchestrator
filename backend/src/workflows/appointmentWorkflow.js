export const WORKFLOW_ID = 'appointment';

// Words that are clearly not real answers — trigger a retry
const FILLER_PATTERN = /^(uh+|um+|er+|ah+|oh+|huh|what|hm+|hmm+|dub|cold|hot|yes|no|ok|okay|sure|yeah|nope|nah|\.+|,+|\?+|!+|\s*)$/i;

function hasRealContent(transcript) {
  if (!transcript || transcript.trim().length < 3) return false;
  if (FILLER_PATTERN.test(transcript.trim())) return false;
  // Must contain at least one actual word character sequence of 2+ letters
  return /[a-zA-Z]{2,}/.test(transcript);
}

export const steps = [
  {
    step: 0,
    field: null,
    instruction: `Greet the caller warmly: "Hello, this is Aria from CallOrchestrator, how can I help you today?" Then listen and naturally ask for their name once you know why they're calling.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 1,
    field: 'callerName',
    instruction: `Ask what type of appointment they need.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 2,
    field: 'appointmentType',
    instruction: `Ask what date works for them.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 3,
    field: 'preferredDate',
    instruction: `Ask what time of day they prefer.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 4,
    field: 'preferredTime',
    instruction: `Read back the booking details in one sentence and ask them to confirm.`,
    validate: (_data, transcript) => hasRealContent(transcript),
  },
  {
    step: 5,
    field: null,
    instruction: `Tell the caller their appointment is booked, give them the reference number, and say goodbye.`,
    validate: () => true,
  },
];

export const totalSteps = steps.length;

export function extractField(stepIndex, transcript) {
  const step = steps[stepIndex];
  if (!step || !step.field) return null;
  return transcript.trim();
}
