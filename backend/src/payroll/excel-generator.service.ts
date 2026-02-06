import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

interface PayrollData {
  id: string;
  month: number;
  year: number;
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
  user: {
    employeeId: string;
    employeeNumber: number;
    name: string;
    email: string;
    designation: string;
    dateOfJoining: Date;
  };
}

@Injectable()
export class ExcelGeneratorService {
  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  async generateSalarySlipExcel(payrollData: PayrollData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Salary Slip');

    const monthName = this.getMonthName(payrollData.month);

    // Set column widths
    worksheet.columns = [
      { width: 5 },   // A - spacing
      { width: 25 },  // B - labels
      { width: 20 },  // C - values
      { width: 5 },   // D - spacing
      { width: 25 },  // E - labels
      { width: 20 },  // F - values
    ];

    let currentRow = 2;

    // Header - SALARY SLIP
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const headerCell = worksheet.getCell(`B${currentRow}`);
    headerCell.value = 'SALARY SLIP';
    headerCell.font = { size: 18, bold: true };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 1;

    // Month Year
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const monthCell = worksheet.getCell(`B${currentRow}`);
    monthCell.value = `${monthName} ${payrollData.year}`;
    monthCell.font = { size: 14, bold: true };
    monthCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 1;

    // Company Name
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const companyCell = worksheet.getCell(`B${currentRow}`);
    companyCell.value = 'CIT - Attend Ease';
    companyCell.font = { size: 12 };
    companyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 2;

    // Employee Details Section Header
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const empHeaderCell = worksheet.getCell(`B${currentRow}`);
    empHeaderCell.value = 'EMPLOYEE DETAILS';
    empHeaderCell.font = { size: 12, bold: true };
    empHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
    empHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow += 1;

    // Employee Details
    const employeeDetails = [
      ['Employee ID:', payrollData.user.employeeId, 'Employee Number:', payrollData.user.employeeNumber.toString()],
      ['Name:', payrollData.user.name, 'Designation:', payrollData.user.designation],
      ['Email:', payrollData.user.email, 'Date of Joining:', this.formatDate(payrollData.user.dateOfJoining)],
    ];

    employeeDetails.forEach((row) => {
      worksheet.getCell(`B${currentRow}`).value = row[0];
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      worksheet.getCell(`C${currentRow}`).value = row[1];
      
      worksheet.getCell(`E${currentRow}`).value = row[2];
      worksheet.getCell(`E${currentRow}`).font = { bold: true };
      worksheet.getCell(`F${currentRow}`).value = row[3];
      currentRow += 1;
    });

    currentRow += 1;

    // Attendance Summary Section Header
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const attHeaderCell = worksheet.getCell(`B${currentRow}`);
    attHeaderCell.value = 'ATTENDANCE SUMMARY';
    attHeaderCell.font = { size: 12, bold: true };
    attHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
    attHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow += 1;

    // Attendance Details
    const attendanceDetails = [
      ['Working Days:', payrollData.workingDays.toString(), 'Present Days:', payrollData.presentDays.toString()],
      ['Casual Leave:', payrollData.casualLeaveDays.toString(), 'Half Days:', payrollData.halfDays.toString()],
      ['Loss of Pay:', payrollData.lossOfPayDays.toString(), 'Total Pay Days:', payrollData.totalPayDays.toString()],
    ];

    attendanceDetails.forEach((row) => {
      worksheet.getCell(`B${currentRow}`).value = row[0];
      worksheet.getCell(`B${currentRow}`).font = { bold: true };
      worksheet.getCell(`C${currentRow}`).value = row[1];
      
      worksheet.getCell(`E${currentRow}`).value = row[2];
      worksheet.getCell(`E${currentRow}`).font = { bold: true };
      worksheet.getCell(`F${currentRow}`).value = row[3];
      currentRow += 1;
    });

    currentRow += 1;

    // Salary Breakdown Section Header
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const salHeaderCell = worksheet.getCell(`B${currentRow}`);
    salHeaderCell.value = 'SALARY BREAKDOWN';
    salHeaderCell.font = { size: 12, bold: true };
    salHeaderCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
    salHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    currentRow += 1;

    // Earnings Header
    worksheet.getCell(`B${currentRow}`).value = 'Earnings';
    worksheet.getCell(`B${currentRow}`).font = { bold: true, underline: true };
    worksheet.getCell(`C${currentRow}`).value = 'Amount (₹)';
    worksheet.getCell(`C${currentRow}`).font = { bold: true, underline: true };
    worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
    currentRow += 1;

    // Earnings
    worksheet.getCell(`B${currentRow}`).value = 'Base Salary';
    worksheet.getCell(`C${currentRow}`).value = payrollData.baseSalary;
    worksheet.getCell(`C${currentRow}`).numFmt = '₹#,##0.00';
    worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
    currentRow += 1;

    worksheet.getCell(`B${currentRow}`).value = 'Gross Earnings';
    worksheet.getCell(`C${currentRow}`).value = payrollData.grossEarnings;
    worksheet.getCell(`C${currentRow}`).numFmt = '₹#,##0.00';
    worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
    currentRow += 1;

    if (payrollData.reimbursements > 0) {
      worksheet.getCell(`B${currentRow}`).value = 'Reimbursements';
      worksheet.getCell(`C${currentRow}`).value = payrollData.reimbursements;
      worksheet.getCell(`C${currentRow}`).numFmt = '₹#,##0.00';
      worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
      currentRow += 1;
    }

    currentRow += 1;

    // Deductions
    if (payrollData.deductions > 0) {
      worksheet.getCell(`B${currentRow}`).value = 'Deductions';
      worksheet.getCell(`B${currentRow}`).font = { bold: true, underline: true };
      worksheet.getCell(`C${currentRow}`).value = 'Amount (₹)';
      worksheet.getCell(`C${currentRow}`).font = { bold: true, underline: true };
      worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
      currentRow += 1;

      worksheet.getCell(`B${currentRow}`).value = 'Total Deductions';
      worksheet.getCell(`C${currentRow}`).value = payrollData.deductions;
      worksheet.getCell(`C${currentRow}`).numFmt = '₹#,##0.00';
      worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
      currentRow += 2;
    }

    // Net Salary
    worksheet.getCell(`B${currentRow}`).value = 'NET SALARY';
    worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`B${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' }
    };
    worksheet.getCell(`C${currentRow}`).value = payrollData.netSalary;
    worksheet.getCell(`C${currentRow}`).numFmt = '₹#,##0.00';
    worksheet.getCell(`C${currentRow}`).alignment = { horizontal: 'right' };
    worksheet.getCell(`C${currentRow}`).font = { bold: true, size: 12 };
    worksheet.getCell(`C${currentRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' }
    };
    currentRow += 2;

    // Footer
    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const footerCell = worksheet.getCell(`B${currentRow}`);
    footerCell.value = 'This is a computer-generated document. No signature is required.';
    footerCell.font = { italic: true, size: 9 };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 1;

    worksheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const dateCell = worksheet.getCell(`B${currentRow}`);
    dateCell.value = `Generated on: ${this.formatDate(new Date())}`;
    dateCell.font = { italic: true, size: 9 };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
