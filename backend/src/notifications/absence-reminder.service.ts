import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, LeaveStatus, LeaveType } from '@prisma/client';

@Injectable()
export class AbsenceReminderService {
  private readonly logger = new Logger(AbsenceReminderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every weekday morning, look at yesterday's attendance.
   * For any user marked ABSENT without an approved/pending UNPAID_LEAVE
   * covering that date, send a notification suggesting they apply for
   * unpaid leave.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  async remindForUnpaidLeave() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Skip checks for weekends entirely
    const dow = yesterday.getDay(); // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) {
      return;
    }

    const yStart = new Date(yesterday);
    yStart.setHours(0, 0, 0, 0);
    const yEnd = new Date(yesterday);
    yEnd.setHours(23, 59, 59, 999);

    // Find ABSENT attendance for yesterday
    const absentRecords = await this.prisma.attendance.findMany({
      where: {
        date: {
          gte: yStart,
          lte: yEnd,
        },
        status: AttendanceStatus.ABSENT,
      },
      select: {
        userId: true,
        date: true,
      },
    });

    if (absentRecords.length === 0) {
      return;
    }

    const userIds = Array.from(new Set(absentRecords.map((r) => r.userId)));

    // Check for CASUAL or UNPAID leave applications overlapping yesterday
    const leaveApplications = await this.prisma.leaveApplication.findMany({
      where: {
        userId: { in: userIds },
        leaveType: {
          in: [LeaveType.UNPAID_LEAVE, LeaveType.CASUAL_LEAVE],
        },
        status: {
          in: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        },
        fromDate: { lte: yEnd },
        toDate: { gte: yStart },
      },
      select: {
        userId: true,
      },
    });

    const usersWithAnyLeave = new Set(leaveApplications.map((l) => l.userId));

    const usersNeedingReminder = userIds.filter((id) => !usersWithAnyLeave.has(id));

    if (usersNeedingReminder.length === 0) {
      return;
    }

    const dateLabel = yesterday.toISOString().slice(0, 10);

    await this.prisma.notification.createMany({
      data: usersNeedingReminder.map((userId) => ({
        userId,
        type: 'ABSENT_NO_UNPAID_LEAVE',
        title: 'Unpaid leave reminder',
        body: `You were marked absent on ${dateLabel}. Please apply for unpaid leave for this day if this is correct.`,
        data: {
          date: dateLabel,
        } as any,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `Sent unpaid leave reminders for ${usersNeedingReminder.length} user(s) for ${dateLabel}`,
    );
  }
}

