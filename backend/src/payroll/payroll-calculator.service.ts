import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import { isWeekend, toDateOnlyKey } from '../common/date.utils';

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

  /**
   * Working days = total calendar days in the month.
   * Company operates in India only. Month is 1-12 (January = 1).
   */
  private async calculateWorkingDays(year: number, month: number): Promise<number> {
    // Last day of month: new Date(year, month, 0) since day 0 = last day of previous month
    return new Date(year, month, 0).getDate();
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

    // Calculate working days for the month (calendar days)
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
      }
    });

    // Count weekends and holidays in the month so they are treated as paid days.
    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    const holidayDateKeys = new Set(holidays.map((h) => toDateOnlyKey(h.date)));

    let weekendDays = 0;
    let holidayDays = 0;
    const daysInMonth = workingDays;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateKey = toDateOnlyKey(date);
      if (isWeekend(date)) {
        weekendDays++;
      } else if (holidayDateKeys.has(dateKey)) {
        holidayDays++;
      }
    }

    // Calculate total pay days:
    // - Present and casual leave count fully
    // - Half days count as 0.5
    // - Weekends and holidays are treated as paid off-days
    const totalPayDays =
      presentDays +
      casualLeaveDays +
      halfDays * 0.5 +
      weekendDays +
      holidayDays;

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
