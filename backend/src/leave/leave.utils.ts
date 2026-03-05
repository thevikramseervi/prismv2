/**
 * Full-year casual leave entitlement (days per year).
 */
export const FULL_YEAR_CASUAL_LEAVE = 12;

/**
 * Pro-rata casual leave for a given year based on date of joining.
 * - Joined before the year: full 12 days.
 * - Joined during the year: 12 × (remaining months in year) / 12, rounded.
 *   e.g. joining April → 9 months (Apr–Dec) → 9 days.
 * - Joining in a future year: 0.
 */
export function getProRataCasualLeaveForYear(
  dateOfJoining: Date,
  year: number,
): number {
  const joiningYear = dateOfJoining.getFullYear();
  if (joiningYear > year) return 0;
  if (joiningYear < year) return FULL_YEAR_CASUAL_LEAVE;

  // Same year: months from joining month (inclusive) to end of year
  const joiningMonth = dateOfJoining.getMonth(); // 0-based: Jan=0, Dec=11
  const monthsEligible = 12 - joiningMonth;
  return Math.min(FULL_YEAR_CASUAL_LEAVE, monthsEligible);
}
