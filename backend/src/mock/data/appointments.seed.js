/**
 * Seed data for the appointments mock repository.
 * 3 pre-existing appointment records.
 */

export const appointmentsSeed = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    callerName: 'Alice Johnson',
    appointmentType: 'General Consultation',
    preferredDate: '2026-04-10',
    preferredTime: '10:00',
    bookingRef: 'APT-1001',
    createdAt: '2026-04-01T09:00:00.000Z',
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    callerName: 'Bob Martinez',
    appointmentType: 'Annual Check-up',
    preferredDate: '2026-04-12',
    preferredTime: '14:30',
    bookingRef: 'APT-1002',
    createdAt: '2026-04-02T11:15:00.000Z',
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    callerName: 'Carol Smith',
    appointmentType: 'Follow-up Review',
    preferredDate: '2026-04-15',
    preferredTime: '09:00',
    bookingRef: 'APT-1003',
    createdAt: '2026-04-03T08:30:00.000Z',
  },
];
