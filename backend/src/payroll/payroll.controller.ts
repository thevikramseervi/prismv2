import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Patch,
  Body,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { GeneratePayrollDto } from './dto/generate-payroll.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayrollController {
  constructor(
    private readonly payrollService: PayrollService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly excelGenerator: ExcelGeneratorService,
  ) {}

  @Post('generate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate payroll for a user or all users (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Payroll generated successfully' })
  @ApiResponse({ status: 409, description: 'Payroll already exists for this month' })
  generatePayroll(
    @CurrentUser() user: any,
    @Body() generatePayrollDto: GeneratePayrollDto,
  ) {
    if (generatePayrollDto.userId) {
      return this.payrollService.generatePayroll(generatePayrollDto, user.id);
    } else {
      return this.payrollService.generatePayrollForAllEmployees(
        generatePayrollDto.year,
        generatePayrollDto.month,
        user.id,
      );
    }
  }

  @Get('my-salary-slips')
  @ApiOperation({ summary: 'Get current user salary slips' })
  @ApiResponse({ status: 200, description: 'Salary slips retrieved successfully' })
  getMySalarySlips(@CurrentUser() user: any) {
    return this.payrollService.getMySalarySlips(user.id);
  }

  @Get()
  @Roles(Role.LAB_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all payroll records (Admin only)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Payroll records retrieved successfully' })
  getAllPayroll(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('userId') userId?: string,
  ) {
    return this.payrollService.getAllPayroll(
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
      userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payroll details by ID' })
  @ApiResponse({ status: 200, description: 'Payroll details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Payroll record not found' })
  getPayrollById(@Param('id') id: string) {
    return this.payrollService.getPayrollById(id);
  }

  @Patch(':id/mark-paid')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark payroll as paid (Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Payroll marked as paid successfully' })
  markAsPaid(@Param('id') id: string) {
    return this.payrollService.markAsPaid(id);
  }

  @Get(':id/download/pdf')
  @ApiOperation({ summary: 'Download salary slip as PDF' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  async downloadPDF(@Param('id') id: string, @Res() res: Response) {
    const payroll = await this.payrollService.getPayrollById(id);
    
    // Convert Decimal types to numbers
    const payrollData = {
      ...payroll,
      baseSalary: Number(payroll.baseSalary),
      presentDays: Number(payroll.presentDays),
      halfDays: Number(payroll.halfDays),
      totalPayDays: Number(payroll.totalPayDays),
      grossEarnings: Number(payroll.grossEarnings),
      deductions: Number(payroll.deductions),
      reimbursements: Number(payroll.reimbursements),
      netSalary: Number(payroll.netSalary),
    };
    
    const pdfStream = await this.pdfGenerator.generateSalarySlipPDF(payrollData);

    const monthName = new Date(payroll.year, payroll.month - 1).toLocaleString('default', { month: 'long' });
    const filename = `Salary_Slip_${payroll.user.name.replace(/\s+/g, '_')}_${monthName}_${payroll.year}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    pdfStream.pipe(res);
  }

  @Get(':id/download/xlsx')
  @ApiOperation({ summary: 'Download salary slip as Excel' })
  @ApiResponse({ status: 200, description: 'Excel generated successfully' })
  async downloadExcel(@Param('id') id: string, @Res() res: Response) {
    const payroll = await this.payrollService.getPayrollById(id);
    
    // Convert Decimal types to numbers
    const payrollData = {
      ...payroll,
      baseSalary: Number(payroll.baseSalary),
      presentDays: Number(payroll.presentDays),
      halfDays: Number(payroll.halfDays),
      totalPayDays: Number(payroll.totalPayDays),
      grossEarnings: Number(payroll.grossEarnings),
      deductions: Number(payroll.deductions),
      reimbursements: Number(payroll.reimbursements),
      netSalary: Number(payroll.netSalary),
    };
    
    const buffer = await this.excelGenerator.generateSalarySlipExcel(payrollData);

    const monthName = new Date(payroll.year, payroll.month - 1).toLocaleString('default', { month: 'long' });
    const filename = `Salary_Slip_${payroll.user.name.replace(/\s+/g, '_')}_${monthName}_${payroll.year}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
