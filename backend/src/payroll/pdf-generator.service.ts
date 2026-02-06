import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
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
export class PdfGeneratorService {
  private getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  private formatCurrency(amount: number): string {
    return `₹ ${amount.toFixed(2)}`;
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  async generateSalarySlipPDF(payrollData: PayrollData): Promise<Readable> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = new Readable();
        stream._read = () => {};

        doc.on('data', (chunk) => stream.push(chunk));
        doc.on('end', () => {
          stream.push(null);
          resolve(stream);
        });
        doc.on('error', reject);

        const monthName = this.getMonthName(payrollData.month);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('SALARY SLIP', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica').text(`${monthName} ${payrollData.year}`, { align: 'center' });
        doc.moveDown(1);

        // Company Info (optional - can be customized)
        doc.fontSize(14).font('Helvetica-Bold').text('CIT - Attend Ease', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Automated Attendance & Payroll System', { align: 'center' });
        doc.moveDown(1.5);

        // Draw horizontal line
        doc.strokeColor('#333333').lineWidth(1);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // Employee Details Section
        const leftColumn = 50;
        const rightColumn = 320;
        let currentY = doc.y;

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('EMPLOYEE DETAILS', leftColumn, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica');
        doc.text('Employee ID:', leftColumn, currentY);
        doc.text(payrollData.user.employeeId, leftColumn + 120, currentY);
        currentY += 18;

        doc.text('Employee Name:', leftColumn, currentY);
        doc.text(payrollData.user.name, leftColumn + 120, currentY);
        currentY += 18;

        doc.text('Designation:', leftColumn, currentY);
        doc.text(payrollData.user.designation, leftColumn + 120, currentY);
        currentY += 18;

        doc.text('Date of Joining:', leftColumn, currentY);
        doc.text(this.formatDate(payrollData.user.dateOfJoining), leftColumn + 120, currentY);
        currentY += 18;

        doc.text('Email:', leftColumn, currentY);
        doc.text(payrollData.user.email, leftColumn + 120, currentY);
        
        doc.moveDown(2);
        currentY = doc.y;

        // Draw horizontal line
        doc.strokeColor('#333333').lineWidth(1);
        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 20;

        // Attendance Summary
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('ATTENDANCE SUMMARY', leftColumn, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica');
        const attendanceData = [
          ['Working Days:', payrollData.workingDays.toString()],
          ['Present Days:', payrollData.presentDays.toString()],
          ['Casual Leave:', payrollData.casualLeaveDays.toString()],
          ['Half Days:', payrollData.halfDays.toString()],
          ['Loss of Pay:', payrollData.lossOfPayDays.toString()],
          ['Total Pay Days:', payrollData.totalPayDays.toString()],
        ];

        attendanceData.forEach(([label, value]) => {
          doc.text(label, leftColumn, currentY);
          doc.text(value, leftColumn + 120, currentY);
          currentY += 18;
        });

        doc.moveDown(2);
        currentY = doc.y;

        // Draw horizontal line
        doc.strokeColor('#333333').lineWidth(1);
        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 20;

        // Salary Breakdown
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('SALARY BREAKDOWN', leftColumn, currentY);
        currentY += 25;

        doc.fontSize(10).font('Helvetica');

        // Earnings
        doc.font('Helvetica-Bold').text('Earnings', leftColumn, currentY);
        doc.text('Amount', rightColumn + 100, currentY, { width: 100, align: 'right' });
        currentY += 20;

        doc.font('Helvetica');
        doc.text('Base Salary', leftColumn + 20, currentY);
        doc.text(this.formatCurrency(payrollData.baseSalary), rightColumn + 100, currentY, { width: 100, align: 'right' });
        currentY += 18;

        doc.text('Gross Earnings', leftColumn + 20, currentY);
        doc.text(this.formatCurrency(payrollData.grossEarnings), rightColumn + 100, currentY, { width: 100, align: 'right' });
        currentY += 18;

        if (payrollData.reimbursements > 0) {
          doc.text('Reimbursements', leftColumn + 20, currentY);
          doc.text(this.formatCurrency(payrollData.reimbursements), rightColumn + 100, currentY, { width: 100, align: 'right' });
          currentY += 18;
        }

        currentY += 10;

        // Deductions
        if (payrollData.deductions > 0) {
          doc.font('Helvetica-Bold').text('Deductions', leftColumn, currentY);
          currentY += 20;

          doc.font('Helvetica');
          doc.text('Total Deductions', leftColumn + 20, currentY);
          doc.text(this.formatCurrency(payrollData.deductions), rightColumn + 100, currentY, { width: 100, align: 'right' });
          currentY += 25;
        }

        // Draw horizontal line
        doc.strokeColor('#333333').lineWidth(1);
        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 15;

        // Net Salary
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('NET SALARY', leftColumn, currentY);
        doc.text(this.formatCurrency(payrollData.netSalary), rightColumn + 100, currentY, { width: 100, align: 'right' });
        currentY += 30;

        // Draw horizontal line
        doc.strokeColor('#333333').lineWidth(1);
        doc.moveTo(50, currentY).lineTo(545, currentY).stroke();
        currentY += 20;

        // Footer
        doc.fontSize(9).font('Helvetica-Oblique');
        doc.text('This is a computer-generated document. No signature is required.', leftColumn, currentY, { align: 'center', width: 495 });
        currentY += 15;
        doc.text(`Generated on: ${this.formatDate(new Date())}`, leftColumn, currentY, { align: 'center', width: 495 });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
