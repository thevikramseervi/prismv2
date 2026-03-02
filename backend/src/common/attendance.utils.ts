import { AttendanceStatus } from '@prisma/client';

/**
 * Maps total work duration (minutes) to attendance status for a working day.
 * Rules: >= 8h = PRESENT, >= 4h = HALF_DAY, < 4h = ABSENT.
 */
export function getStatusFromWorkDurationMinutes(totalMinutes: number): AttendanceStatus {
  const hours = totalMinutes / 60;
  if (hours >= 8) return AttendanceStatus.PRESENT;
  if (hours >= 4) return AttendanceStatus.HALF_DAY;
  return AttendanceStatus.ABSENT;
}
