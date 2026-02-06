import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, LeaveStatus } from '@prisma/client';

interface BiometricEntry {
  employeeId: string;
  date: Date;
  inTime: Date | null;
  outTime: Date | null;
  inDoor: string | null;
  outDoor: string | null;
  duration: number; // in minutes
}

@Injectable()
export class BiometricSyncService {
  private readonly logger = new Logger(BiometricSyncService.name);

  constructor(private prisma: PrismaService) {}

  private isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  }

  private async isHoliday(date: Date): Promise<boolean> {
    const holiday = await this.prisma.holiday.findUnique({
      where: { date },
    });
    return !!holiday;
  }

  private async hasApprovedLeave(userId: string, date: Date): Promise<boolean> {
    const leave = await this.prisma.leaveApplication.findFirst({
      where: {
        userId,
        status: LeaveStatus.APPROVED,
        fromDate: {
          lte: date,
        },
        toDate: {
          gte: date,
        },
      },
    });
    return !!leave;
  }

  async processBiometricData(entries: BiometricEntry[]): Promise<any> {
    this.logger.log(`Processing ${entries.length} biometric entries...`);

    const results = {
      processed: 0,
      skipped: 0,
      errors: [],
    };

    // Group entries by employee and date
    const grouped = new Map<string, BiometricEntry[]>();

    for (const entry of entries) {
      const key = `${entry.employeeId}_${entry.date.toDateString()}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(entry);
    }

    // Process each employee's daily data
    for (const [key, dateEntries] of grouped) {
      try {
        const [employeeId, dateStr] = key.split('_');
        const date = dateEntries[0].date;

        // Find user by employee ID
        const user = await this.prisma.user.findUnique({
          where: { employeeId },
        });

        if (!user) {
          this.logger.warn(`User not found for employee ID: ${employeeId}`);
          results.skipped++;
          continue;
        }

        // Store biometric logs
        for (const entry of dateEntries) {
          await this.prisma.biometricLog.create({
            data: {
              userId: user.id,
              date: entry.date,
              inTime: entry.inTime,
              outTime: entry.outTime,
              inDoor: entry.inDoor,
              outDoor: entry.outDoor,
              duration: entry.duration,
              rawData: entry as any,
              processed: false,
            },
          });
        }

        // Calculate total duration for the day
        const totalDurationMinutes = dateEntries.reduce(
          (sum, entry) => sum + entry.duration,
          0,
        );

        // Get first in and last out times
        const firstIn = dateEntries[0].inTime;
        const lastOut = dateEntries[dateEntries.length - 1].outTime;

        // Determine attendance status
        let status: AttendanceStatus;

        if (this.isWeekend(date)) {
          status = AttendanceStatus.WEEKEND;
        } else if (await this.isHoliday(date)) {
          status = AttendanceStatus.HOLIDAY;
        } else if (await this.hasApprovedLeave(user.id, date)) {
          status = AttendanceStatus.CASUAL_LEAVE;
        } else {
          const totalHours = totalDurationMinutes / 60;
          if (totalHours >= 8) {
            status = AttendanceStatus.PRESENT;
          } else if (totalHours >= 4) {
            status = AttendanceStatus.HALF_DAY;
          } else {
            status = AttendanceStatus.ABSENT; // LOP
          }
        }

        // Create or update attendance record
        await this.prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date,
            },
          },
          update: {
            status,
            firstInTime: firstIn?.toTimeString().slice(0, 8) || null,
            lastOutTime: lastOut?.toTimeString().slice(0, 8) || null,
            totalDuration: totalDurationMinutes,
            biometricSynced: true,
          },
          create: {
            userId: user.id,
            date,
            status,
            firstInTime: firstIn?.toTimeString().slice(0, 8) || null,
            lastOutTime: lastOut?.toTimeString().slice(0, 8) || null,
            totalDuration: totalDurationMinutes,
            biometricSynced: true,
          },
        });

        // Mark biometric logs as processed
        await this.prisma.biometricLog.updateMany({
          where: {
            userId: user.id,
            date,
            processed: false,
          },
          data: {
            processed: true,
          },
        });

        results.processed++;
      } catch (error) {
        this.logger.error(`Error processing entry: ${error.message}`);
        results.errors.push({
          key,
          error: error.message,
        });
      }
    }

    this.logger.log(
      `Processing complete. Processed: ${results.processed}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
    );

    return results;
  }

  async syncBiometricDataForDate(date: Date): Promise<any> {
    this.logger.log(`Syncing biometric data for ${date.toDateString()}...`);

    // TODO: Fetch data from actual biometric system API
    // For now, this is a placeholder for manual uploads or API integration

    // Get unprocessed biometric logs for the date
    const unprocessedLogs = await this.prisma.biometricLog.findMany({
      where: {
        date,
        processed: false,
      },
    });

    if (unprocessedLogs.length === 0) {
      this.logger.log('No unprocessed biometric data found');
      return { message: 'No data to process' };
    }

    // Convert to BiometricEntry format
    const entries: BiometricEntry[] = unprocessedLogs.map((log) => ({
      employeeId: '', // Will be populated from user lookup
      date: log.date,
      inTime: log.inTime,
      outTime: log.outTime,
      inDoor: log.inDoor,
      outDoor: log.outDoor,
      duration: log.duration,
    }));

    return this.processBiometricData(entries);
  }

  async getUnprocessedLogs() {
    return this.prisma.biometricLog.findMany({
      where: { processed: false },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }
}
