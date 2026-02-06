import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { LeaveStatus, AttendanceStatus } from '@prisma/client';

@Injectable()
export class LeaveService {
  constructor(private prisma: PrismaService) {}

  private calculateLeaveDays(fromDate: Date, toDate: Date): number {
    let days = 0;
    const current = new Date(fromDate);

    while (current <= toDate) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  async applyLeave(userId: string, applyLeaveDto: ApplyLeaveDto) {
    const fromDate = new Date(applyLeaveDto.fromDate);
    const toDate = new Date(applyLeaveDto.toDate);

    // Validate dates
    if (fromDate > toDate) {
      throw new BadRequestException('From date must be before or equal to to date');
    }

    // Calculate leave days (excluding weekends)
    const totalDays = this.calculateLeaveDays(fromDate, toDate);

    if (totalDays === 0) {
      throw new BadRequestException('No working days in the selected date range');
    }

    // Get leave balance for current year
    const year = fromDate.getFullYear();
    const leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId,
          year,
        },
      },
    });

    if (!leaveBalance) {
      // Create initial leave balance if not exists
      await this.prisma.leaveBalance.create({
        data: {
          userId,
          year,
          casualLeaveTotal: 12,
          casualLeaveUsed: 0,
          casualLeavePending: 0,
          casualLeaveAvailable: 12,
        },
      });
    }

    const balance = leaveBalance || {
      casualLeaveAvailable: 12,
      casualLeavePending: 0,
    };

    // Check if sufficient leave available
    if (balance.casualLeaveAvailable < totalDays) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${balance.casualLeaveAvailable}, Requested: ${totalDays}`,
      );
    }

    // Check for overlapping leave applications
    const overlapping = await this.prisma.leaveApplication.findFirst({
      where: {
        userId,
        status: {
          in: [LeaveStatus.PENDING, LeaveStatus.APPROVED],
        },
        OR: [
          {
            fromDate: {
              lte: toDate,
            },
            toDate: {
              gte: fromDate,
            },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException('You already have a leave application for overlapping dates');
    }

    // Create leave application
    const leaveApplication = await this.prisma.leaveApplication.create({
      data: {
        userId,
        leaveType: applyLeaveDto.leaveType,
        fromDate,
        toDate,
        totalDays,
        reason: applyLeaveDto.reason,
        status: LeaveStatus.PENDING,
      },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update leave balance (mark as pending)
    await this.prisma.leaveBalance.update({
      where: {
        userId_year: {
          userId,
          year,
        },
      },
      data: {
        casualLeavePending: {
          increment: totalDays,
        },
        casualLeaveAvailable: {
          decrement: totalDays,
        },
      },
    });

    return leaveApplication;
  }

  async approveLeave(applicationId: string, reviewedBy: string, reviewLeaveDto?: ReviewLeaveDto) {
    const application = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave applications can be approved');
    }

    // Update application status
    await this.prisma.leaveApplication.update({
      where: { id: applicationId },
      data: {
        status: LeaveStatus.APPROVED,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reviewLeaveDto?.reviewNotes,
      },
    });

    // Update leave balance
    const year = application.fromDate.getFullYear();
    await this.prisma.leaveBalance.update({
      where: {
        userId_year: {
          userId: application.userId,
          year,
        },
      },
      data: {
        casualLeaveUsed: {
          increment: application.totalDays,
        },
        casualLeavePending: {
          decrement: application.totalDays,
        },
      },
    });

    // Create attendance records for leave dates (excluding weekends)
    const current = new Date(application.fromDate);
    const endDate = new Date(application.toDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Skip weekends
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        await this.prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: application.userId,
              date: new Date(current),
            },
          },
          update: {
            status: AttendanceStatus.CASUAL_LEAVE,
            manualOverride: true,
          },
          create: {
            userId: application.userId,
            date: new Date(current),
            status: AttendanceStatus.CASUAL_LEAVE,
            manualOverride: true,
            biometricSynced: false,
          },
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async rejectLeave(applicationId: string, reviewedBy: string, reviewLeaveDto?: ReviewLeaveDto) {
    const application = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending leave applications can be rejected');
    }

    // Update application status
    await this.prisma.leaveApplication.update({
      where: { id: applicationId },
      data: {
        status: LeaveStatus.REJECTED,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reviewLeaveDto?.reviewNotes,
      },
    });

    // Restore leave balance
    const year = application.fromDate.getFullYear();
    await this.prisma.leaveBalance.update({
      where: {
        userId_year: {
          userId: application.userId,
          year,
        },
      },
      data: {
        casualLeavePending: {
          decrement: application.totalDays,
        },
        casualLeaveAvailable: {
          increment: application.totalDays,
        },
      },
    });

    return this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
          },
        },
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async getMyApplications(userId: string, status?: LeaveStatus) {
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    return this.prisma.leaveApplication.findMany({
      where,
      orderBy: { appliedAt: 'desc' },
      include: {
        reviewer: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async getPendingApplications() {
    return this.prisma.leaveApplication.findMany({
      where: {
        status: LeaveStatus.PENDING,
      },
      orderBy: { appliedAt: 'asc' },
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
    });
  }

  async getMyLeaveBalance(userId: string, year: number) {
    let leaveBalance = await this.prisma.leaveBalance.findUnique({
      where: {
        userId_year: {
          userId,
          year,
        },
      },
    });

    // Create if doesn't exist
    if (!leaveBalance) {
      leaveBalance = await this.prisma.leaveBalance.create({
        data: {
          userId,
          year,
          casualLeaveTotal: 12,
          casualLeaveUsed: 0,
          casualLeavePending: 0,
          casualLeaveAvailable: 12,
        },
      });
    }

    return leaveBalance;
  }

  async cancelApplication(applicationId: string, userId: string) {
    const application = await this.prisma.leaveApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.userId !== userId) {
      throw new BadRequestException('You can only cancel your own applications');
    }

    if (application.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Only pending applications can be cancelled');
    }

    // Update status
    await this.prisma.leaveApplication.update({
      where: { id: applicationId },
      data: {
        status: LeaveStatus.CANCELLED,
      },
    });

    // Restore leave balance
    const year = application.fromDate.getFullYear();
    await this.prisma.leaveBalance.update({
      where: {
        userId_year: {
          userId: application.userId,
          year,
        },
      },
      data: {
        casualLeavePending: {
          decrement: application.totalDays,
        },
        casualLeaveAvailable: {
          increment: application.totalDays,
        },
      },
    });

    return { message: 'Leave application cancelled successfully' };
  }
}
