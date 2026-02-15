import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';

interface SalaryCalculation {
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  casualLeaveDays: number;
  halfDays: number;
  lossOfPayDays: number;
  totalPayDays: number;
  grossEarnings: number;
  deductions: number;
  reimbursements: number;
  netSalary: number;
}

@Injectable()
export class PayrollCalculatorService {
  constructor(private prisma: PrismaService) {}

  private isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  }

  /** Format as YYYY-MM-DD for timezone-safe date-only comparison. */
  private toDateOnlyKey(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Working days = calendar days in month minus weekends (Sat/Sun) minus company holidays.
   * Company operates in India only. Month is 1-12 (January = 1).
   * Holiday comparison uses date-only keys so the count is correct regardless of server timezone.
   */
  private async calculateWorkingDays(year: number, month: number): Promise<number> {
    // Last day of month: new Date(year, month, 0) since day 0 = last day of previous month (month is 1-12 here, so month=12 => Jan next year, day 0 = Dec 31)
    const daysInMonth = new Date(year, month, 0).getDate();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const holidayDates = new Set(holidays.map((h) => this.toDateOnlyKey(h.date)));

    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (!this.isWeekend(date) && !holidayDates.has(dateKey)) {
        workingDays++;
      }
    }

    return workingDays;
  }

  async calculateSalary(
    userId: string,
    year: number,
    month: number,
  ): Promise<SalaryCalculation> {
    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const baseSalary = Number(user.baseSalary);

    // Calculate working days for the month
    const workingDays = await this.calculateWorkingDays(year, month);

    // Get attendance records for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Count different attendance statuses
    let presentDays = 0;
    let casualLeaveDays = 0;
    let halfDays = 0;
    let lossOfPayDays = 0;

    attendanceRecords.forEach((record) => {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          presentDays++;
          break;
        case AttendanceStatus.CASUAL_LEAVE:
          casualLeaveDays++;
          break;
        case AttendanceStatus.HALF_DAY:
          halfDays++;
          break;
        case AttendanceStatus.ABSENT:
          lossOfPayDays++;
          break;
        // WEEKEND and HOLIDAY don't count towards working days
      }
    });

    // Calculate total pay days
    const totalPayDays = presentDays + casualLeaveDays + halfDays * 0.5;

    // Calculate gross earnings (prorated); guard against no working days
    if (workingDays <= 0) {
      throw new Error(`No working days in ${year}-${month}; cannot calculate salary.`);
    }
    const grossEarnings = Math.round((totalPayDays / workingDays) * baseSalary);

    // Future: Add deductions and reimbursements
    const deductions = 0;
    const reimbursements = 0;

    const netSalary = grossEarnings - deductions + reimbursements;

    return {
      baseSalary,
      workingDays,
      presentDays,
      casualLeaveDays,
      halfDays,
      lossOfPayDays,
      totalPayDays,
      grossEarnings,
      deductions,
      reimbursements,
      netSalary,
    };
  }
}
