/**
 * Seed data for the tickets mock repository.
 * 3 pre-existing support ticket records.
 */

export const ticketsSeed = [
  {
    id: 't1u2v3w4-0001-4000-8000-000000000001',
    callerName: 'Alice Johnson',
    description: 'Unable to access online patient portal after password reset.',
    ticketRef: 'TKT-2001',
    createdAt: '2026-04-01T10:00:00.000Z',
  },
  {
    id: 't1u2v3w4-0002-4000-8000-000000000002',
    callerName: 'Bob Martinez',
    description: 'Billing discrepancy on invoice from March visit.',
    ticketRef: 'TKT-2002',
    createdAt: '2026-04-02T13:45:00.000Z',
  },
  {
    id: 't1u2v3w4-0003-4000-8000-000000000003',
    callerName: 'Carol Smith',
    description: 'Request for medical records from previous appointments.',
    ticketRef: 'TKT-2003',
    createdAt: '2026-04-03T09:20:00.000Z',
  },
];
