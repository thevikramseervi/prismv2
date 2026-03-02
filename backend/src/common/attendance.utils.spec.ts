import { AttendanceStatus } from '@prisma/client';
import { getStatusFromWorkDurationMinutes } from './attendance.utils';

describe('getStatusFromWorkDurationMinutes', () => {
  it('returns PRESENT for >= 8 hours', () => {
    expect(getStatusFromWorkDurationMinutes(8 * 60)).toBe(AttendanceStatus.PRESENT);
    expect(getStatusFromWorkDurationMinutes(10 * 60)).toBe(AttendanceStatus.PRESENT);
  });

  it('returns HALF_DAY for >= 4 and < 8 hours', () => {
    expect(getStatusFromWorkDurationMinutes(4 * 60)).toBe(AttendanceStatus.HALF_DAY);
    expect(getStatusFromWorkDurationMinutes(7 * 60 + 59)).toBe(AttendanceStatus.HALF_DAY);
  });

  it('returns ABSENT for < 4 hours', () => {
    expect(getStatusFromWorkDurationMinutes(0)).toBe(AttendanceStatus.ABSENT);
    expect(getStatusFromWorkDurationMinutes(3 * 60 + 59)).toBe(AttendanceStatus.ABSENT);
  });
});
