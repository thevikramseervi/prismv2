import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BiometricSyncService } from './biometric-sync.service';
import { readSheetAsArraysFromBuffer } from './biometric-excel.utils';

export interface BiometricImportResult {
  logsCreated: number;
  logsSkipped: number;
  usersNotFound: number;
  errors: Array<{ row: number; reason: string }>;
  datesProcessed: string[];
  syncResults: Array<{ date: string; processed: number; skipped: number }>;
}

function parseDuration(durationStr: string): number {
  if (!durationStr || durationStr === '00:00') return 0;
  const parts = durationStr.split(':');
  if (parts.length === 2) {
    const [hours, minutes] = parts.map(Number);
    return hours * 60 + minutes;
  }
  return 0;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

@Injectable()
export class BiometricImportService {
  private readonly logger = new Logger(BiometricImportService.name);

  constructor(
    private prisma: PrismaService,
    private biometricSyncService: BiometricSyncService,
  ) {}

  /**
   * Parse grouped biometric Excel (Device Log Duration Report format) from buffer,
   * create BiometricLog records, and auto-sync all dates to Attendance.
   */
  async importFromBuffer(buffer: Buffer): Promise<BiometricImportResult> {
    const result: BiometricImportResult = {
      logsCreated: 0,
      logsSkipped: 0,
      usersNotFound: 0,
      errors: [],
      datesProcessed: [],
      syncResults: [],
    };

    const data = (await readSheetAsArraysFromBuffer(buffer, {
      defval: null,
    })) as unknown[][];

    let currentUser: { id: string; name: string; employeeId: string } | null =
      null;
    const datesSet = new Set<string>();

    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i] as unknown[];
        if (!row || row.length === 0) continue;

        // Employee header row: "Employee :" in col B
        const cellValue = row[1];
        if (
          cellValue &&
          typeof cellValue === 'string' &&
          cellValue.includes('Employee :')
        ) {
          const empIdValue = row[4] || row[3] || row[2];
          if (!empIdValue || empIdValue === '-') continue;

          const rawValue = empIdValue.toString().trim();
          const employeeNumberMatch = rawValue.match(/^(\d+)/);

          if (employeeNumberMatch) {
            const employeeNumber = parseInt(employeeNumberMatch[1]);
            const user = await this.prisma.user.findFirst({
              where: { employeeNumber },
            });
            currentUser = user
              ? { id: user.id, name: user.name, employeeId: user.employeeId }
              : null;
          } else if (rawValue.startsWith('CITSEED')) {
            const user = await this.prisma.user.findUnique({
              where: { employeeId: rawValue },
            });
            currentUser = user
              ? { id: user.id, name: user.name, employeeId: user.employeeId }
              : null;
          } else {
            currentUser = null;
          }

          if (!currentUser) {
            result.usersNotFound++;
            this.logger.warn(`Employee not found: ${rawValue}`);
          }
          continue;
        }

        if (!currentUser) continue;

        const dateStr = row[1];
        if (!dateStr || typeof dateStr !== 'string') continue;

        const date = parseDate(dateStr);
        if (!date) continue;

        // Skip "Total Duration" summary rows
        if (String(dateStr).toLowerCase().includes('total')) continue;

        // Columns: [empty, Date, empty, empty, In Door, In Time, Out Door, empty, Out Time, empty, empty, Duration]
        const inTimeStr = row[5] ? row[5].toString() : null;
        const outTimeStrVal = row[8] ? row[8].toString() : null;
        const inDoor = row[4] ? row[4].toString() : null;
        const outDoor = row[6] ? row[6].toString() : null;
        const durationStr = row[11] ? row[11].toString() : null;
        const duration = parseDuration(durationStr || '00:00');

        let inTime: Date | undefined;
        let outTime: Date | undefined;
        if (inTimeStr) {
          const [h, m] = inTimeStr.split(':').map(Number);
          inTime = new Date(date);
          inTime.setHours(h ?? 0, m ?? 0, 0, 0);
        }
        if (outTimeStrVal) {
          const [h, m] = outTimeStrVal.split(':').map(Number);
          outTime = new Date(date);
          outTime.setHours(h ?? 0, m ?? 0, 0, 0);
        }

        try {
          // Skip if same row already exists (e.g. re-upload of same file)
          const existing = await this.prisma.biometricLog.findFirst({
            where: {
              userId: currentUser.id,
              date,
              inTime: inTime ?? null,
              outTime: outTime ?? null,
            },
          });
          if (existing) {
            result.logsSkipped++;
            datesSet.add(date.toISOString().slice(0, 10));
            continue;
          }

          await this.prisma.biometricLog.create({
            data: {
              userId: currentUser.id,
              date,
              inTime,
              outTime,
              inDoor,
              outDoor,
              duration,
              rawData: {
                inDoor: row[4] ?? null,
                outDoor: row[6] ?? null,
                inTime: inTimeStr ?? null,
                outTime: outTimeStrVal ?? null,
                duration: durationStr ?? null,
              } as object,
              processed: false,
            },
          });
          result.logsCreated++;
          datesSet.add(date.toISOString().slice(0, 10));
        } catch (createError: any) {
          if (createError.code === 'P2002') {
            result.logsSkipped++;
          } else {
            result.errors.push({
              row: i + 1,
              reason: createError.message || 'Unknown error',
            });
          }
        }
      } catch (rowError: any) {
        result.errors.push({
          row: i + 1,
          reason: rowError.message || 'Unknown error',
        });
      }
    }

    // Auto-sync all distinct dates
    const sortedDates = Array.from(datesSet).sort();
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const syncResult = await this.biometricSyncService.syncBiometricDataForDate(
        date,
      );
      result.datesProcessed.push(dateStr);
      result.syncResults.push({
        date: dateStr,
        processed: (syncResult as any)?.processed ?? 0,
        skipped: (syncResult as any)?.skipped ?? 0,
      });
    }

    this.logger.log(
      `Import complete: ${result.logsCreated} logs created, ${result.datesProcessed.length} dates synced`,
    );

    return result;
  }
}
