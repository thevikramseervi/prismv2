import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async create(createAttendanceDto: CreateAttendanceDto, manualOverride = true) {
    // Check if attendance already exists for this user and date
    const existing = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId: createAttendanceDto.userId,
          date: new Date(createAttendanceDto.date),
        },
      },
    });

    if (existing) {
      throw new ConflictException('Attendance already exists for this date');
    }

    const data: any = {
      userId: createAttendanceDto.userId,
      date: new Date(createAttendanceDto.date),
      status: createAttendanceDto.status,
      manualOverride,
      notes: createAttendanceDto.notes,
    };

    if (createAttendanceDto.firstInTime) {
      data.firstInTime = createAttendanceDto.firstInTime;
    }

    if (createAttendanceDto.lastOutTime) {
      data.lastOutTime = createAttendanceDto.lastOutTime;
    }

    if (createAttendanceDto.totalDuration !== undefined) {
      data.totalDuration = createAttendanceDto.totalDuration;
    }

    return this.prisma.attendance.create({ data });
  }

  async findMyAttendance(
    userId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { userId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    return this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
          },
        },
      },
    });
  }

  async findMonthlyAttendance(userId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await this.prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate summary
    const summary = {
      totalDays: endDate.getDate(),
      present: 0,
      absent: 0,
      halfDay: 0,
      casualLeave: 0,
      weekend: 0,
      holiday: 0,
    };

    attendance.forEach((record) => {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          summary.present++;
          break;
        case AttendanceStatus.ABSENT:
          summary.absent++;
          break;
        case AttendanceStatus.HALF_DAY:
          summary.halfDay++;
          break;
        case AttendanceStatus.CASUAL_LEAVE:
          summary.casualLeave++;
          break;
        case AttendanceStatus.WEEKEND:
          summary.weekend++;
          break;
        case AttendanceStatus.HOLIDAY:
          summary.holiday++;
          break;
      }
    });

    return {
      attendance,
      summary,
    };
  }

  async findAll(date?: string, status?: AttendanceStatus) {
    const where: any = {};

    if (date) {
      where.date = new Date(date);
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            employeeId: true,
            employeeNumber: true,
            name: true,
            designation: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { user: { employeeNumber: 'asc' } },
      ],
    });
  }

  async findForReport(
    userId?: string,
    startDate?: string,
    endDate?: string,
    status?: AttendanceStatus,
  ) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      if (start && end && start > end) {
        throw new BadRequestException('startDate must be before or equal to endDate');
      }

      where.date = {};
      if (start) {
        where.date.gte = start;
      }
      if (end) {
        where.date.lte = end;
      }
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            employeeId: true,
            employeeNumber: true,
            name: true,
            designation: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { user: { employeeNumber: 'asc' } },
      ],
    });
  }

  async findOne(id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
            designation: true,
          },
        },
      },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto) {
    await this.findOne(id);

    const data: any = {
      ...updateAttendanceDto,
      manualOverride: true,
    };

    return this.prisma.attendance.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
          },
        },
      },
    });
  }

  async getDashboardStats(userId: string) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get today's attendance
    const todayAttendance = await this.prisma.attendance.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    // Get monthly summary
    const monthlyAttendance = await this.findMonthlyAttendance(
      userId,
      today.getFullYear(),
      today.getMonth() + 1,
    );

    return {
      today: todayAttendance,
      monthly: monthlyAttendance.summary,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    };
  }
}
