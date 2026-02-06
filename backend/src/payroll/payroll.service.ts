import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollCalculatorService } from './payroll-calculator.service';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private payrollCalculator: PayrollCalculatorService,
  ) {}

  async generatePayroll(
    generatePayrollDto: GeneratePayrollDto,
    generatedBy: string,
  ) {
    const { year, month, userId } = generatePayrollDto;

    // Check if payroll already exists
    const existing = await this.prisma.payroll.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Payroll already generated for this month');
    }

    // Calculate salary
    const calculation = await this.payrollCalculator.calculateSalary(userId, year, month);

    // Create payroll record
    return this.prisma.payroll.create({
      data: {
        userId,
        month,
        year,
        baseSalary: calculation.baseSalary,
        workingDays: calculation.workingDays,
        presentDays: calculation.presentDays,
        casualLeaveDays: calculation.casualLeaveDays,
        halfDays: calculation.halfDays,
        lossOfPayDays: calculation.lossOfPayDays,
        totalPayDays: calculation.totalPayDays,
        grossEarnings: calculation.grossEarnings,
        deductions: calculation.deductions,
        reimbursements: calculation.reimbursements,
        netSalary: calculation.netSalary,
        paymentStatus: 'DRAFT',
        generatedBy,
      },
      include: {
        user: {
          select: {
            employeeId: true,
            employeeNumber: true,
            name: true,
            designation: true,
            dateOfJoining: true,
          },
        },
      },
    });
  }

  async generatePayrollForAllEmployees(year: number, month: number, generatedBy: string) {
    // Get all active employees
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
    });

    const results = [];
    const errors = [];

    for (const user of users) {
      try {
        // Check if already generated
        const existing = await this.prisma.payroll.findUnique({
          where: {
            userId_month_year: {
              userId: user.id,
              month,
              year,
            },
          },
        });

        if (existing) {
          errors.push({
            userId: user.id,
            employeeId: user.employeeId,
            error: 'Payroll already exists',
          });
          continue;
        }

        const payroll = await this.generatePayroll(
          { year, month, userId: user.id },
          generatedBy,
        );
        results.push(payroll);
      } catch (error) {
        errors.push({
          userId: user.id,
          employeeId: user.employeeId,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async getMySalarySlips(userId: string) {
    return this.prisma.payroll.findMany({
      where: { userId },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
      select: {
        id: true,
        month: true,
        year: true,
        grossEarnings: true,
        netSalary: true,
        paymentStatus: true,
        paymentDate: true,
        generatedAt: true,
      },
    });
  }

  async getPayrollById(id: string) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            employeeId: true,
            employeeNumber: true,
            name: true,
            email: true,
            designation: true,
            dateOfJoining: true,
          },
        },
      },
    });

    if (!payroll) {
      throw new NotFoundException('Payroll record not found');
    }

    return payroll;
  }

  async markAsPaid(id: string) {
    const payroll = await this.getPayrollById(id);

    return this.prisma.payroll.update({
      where: { id },
      data: {
        paymentStatus: 'PAID',
        paymentDate: new Date(),
      },
    });
  }

  async getAllPayroll(year?: number, month?: number, userId?: string) {
    const where: any = {};

    if (year) {
      where.year = year;
    }

    if (month) {
      where.month = month;
    }

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.payroll.findMany({
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
        { year: 'desc' },
        { month: 'desc' },
        { user: { employeeNumber: 'asc' } },
      ],
    });
  }
}
