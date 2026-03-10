export const QUERY_KEYS = {
  users: ['users'] as const,
  usersForActivity: ['users-for-activity'] as const,

  authMe: ['auth-me'] as const,

  myAttendance: ['my-attendance'] as const,
  attendanceDashboard: ['dashboard-stats'] as const,
  attendanceReport: (userId?: string, start?: string, end?: string) =>
    ['attendance-report', userId ?? '', start ?? '', end ?? ''] as const,

  myLeaveApplications: ['my-leave-applications'] as const,
  leaveBalance: ['leave-balance'] as const,
  leaveReport: ['leave-report'] as const,
  pendingLeave: ['leave-pending'] as const,

  mySalarySlips: ['my-salary-slips'] as const,
  payrollReport: (year: number, month: number, userId?: string) =>
    ['payroll-report', year, month, userId ?? ''] as const,
  payroll: ['payroll'] as const,

  announcements: ['announcements'] as const,

  activities: (scope: 'admin' | 'me', userId: string, date: string) =>
    ['activities', scope, userId, date] as const,
};

