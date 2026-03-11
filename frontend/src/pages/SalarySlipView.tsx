import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { payrollApi } from '../api/payroll';
import {
  getPayPeriod,
  getPayDateFormatted,
  numberToWordsInr,
  formatCurrency,
  getMonthName,
} from '../utils/slipUtils';

const formatDate = (d: string | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const SalarySlipView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: payroll, isLoading, error } = useQuery({
    queryKey: ['payroll', id],
    queryFn: () => payrollApi.getById(id!),
    enabled: !!id,
  });

  if (isLoading || !id) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !payroll) {
    return (
      <Box>
        <Alert severity="error">Salary slip not found.</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/salary-slips')} sx={{ mt: 2 }}>
          Back to Salary Slips
        </Button>
      </Box>
    );
  }

  const monthName = getMonthName(payroll.month);
  const payPeriod = getPayPeriod(payroll.month, payroll.year);
  const payDateStr = getPayDateFormatted(
    payroll.month,
    payroll.year,
    payroll.paymentDate ?? null
  );
  const gross = Number(payroll.grossEarnings);
  const deductions = Number(payroll.deductions);
  const reimbursements = Number(payroll.reimbursements);
  const net = Number(payroll.netSalary);
  const presentDays = Number(payroll.presentDays);
  const halfDays = Number(payroll.halfDays);
  const totalPayDays = Number(payroll.totalPayDays);
  const user = payroll.user!;

  return (
    <Box>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate('/salary-slips')}
        sx={{ mb: 2 }}
      >
        Back to Salary Slips
      </Button>

      {/*
        The salary slip is a printable document — it always renders on a white
        background with dark text regardless of the app's colour-scheme so that
        it looks identical on screen and when saved as PDF / Excel.
      */}
      <Paper
        elevation={2}
        sx={{
          maxWidth: 720,
          mx: 'auto',
          p: 3,
          bgcolor: '#ffffff',
          color: '#1a1a1a',
          '& .MuiTypography-root': { color: '#1a1a1a' },
          '& .MuiTableCell-root': { color: '#1a1a1a', borderColor: '#d5d5d5' },
        }}
      >
        {/* Header */}
        <Typography variant="h6" align="center" fontWeight="bold" gutterBottom>
          Pay Slip for the month of {monthName} {payroll.year}
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 2, color: '#555' }}>
          Figures are in INR
        </Typography>

        {/* Employee details */}
        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555' }} gutterBottom>
          EMPLOYEE DETAILS
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0.5, mb: 2, fontSize: '0.875rem' }}>
          <Typography variant="body2">Employee ID:</Typography>
          <Typography variant="body2">{user.employeeId}</Typography>
          <Typography variant="body2">Email:</Typography>
          <Typography variant="body2">{user.email ?? '—'}</Typography>
          <Typography variant="body2">Employee Name:</Typography>
          <Typography variant="body2">{user.name}</Typography>
          <Typography variant="body2">Designation:</Typography>
          <Typography variant="body2">{user.designation}</Typography>
          <Typography variant="body2">Employee Number:</Typography>
          <Typography variant="body2">{user.employeeNumber}</Typography>
          <Typography variant="body2">Date of Joining:</Typography>
          <Typography variant="body2">{formatDate(user.dateOfJoining)}</Typography>
          <Typography variant="body2">Pay Period:</Typography>
          <Typography variant="body2">{payPeriod}</Typography>
          <Typography variant="body2">Pay Date:</Typography>
          <Typography variant="body2">{payDateStr}</Typography>
        </Box>

        {/* Attendance */}
        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555' }} gutterBottom>
          ATTENDANCE SUMMARY
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0.5, mb: 3, fontSize: '0.875rem' }}>
          <Typography variant="body2">Total Days:</Typography>
          <Typography variant="body2">{payroll.workingDays}</Typography>
          <Typography variant="body2">Weekend Days:</Typography>
          <Typography variant="body2">{payroll.weekendDays}</Typography>
          <Typography variant="body2">Holiday Days:</Typography>
          <Typography variant="body2">{payroll.holidayDays ?? 0}</Typography>
          <Typography variant="body2">Present Days:</Typography>
          <Typography variant="body2">{presentDays}</Typography>
          <Typography variant="body2">Casual Leave:</Typography>
          <Typography variant="body2">{payroll.casualLeaveDays}</Typography>
          <Typography variant="body2">Half Days:</Typography>
          <Typography variant="body2">{halfDays}</Typography>
          <Typography variant="body2">Loss of Pay:</Typography>
          <Typography variant="body2">{payroll.lossOfPayDays}</Typography>
          <Typography variant="body2">Total Pay Days:</Typography>
          <Typography variant="body2">{totalPayDays}</Typography>
        </Box>

        {/* Salary breakdown — single table: Earnings | Amount | Deductions | Amount */}
        <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#555' }} gutterBottom>
          SALARY BREAKDOWN
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            mb: 2,
            bgcolor: '#fff',
            borderColor: '#D5D5D5',
            '& .MuiTable-root': { borderColor: '#D5D5D5' },
            '& .MuiTableCell-root': { borderColor: '#D5D5D5', color: '#1a1a1a' },
          }}
        >
          <Table size="small" sx={{ '& td, & th': { borderColor: '#D5D5D5' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#EBEBEB' }}>
                <TableCell sx={{ fontWeight: 700 }}>Earnings</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Deductions</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Salary and other Allowances</TableCell>
                <TableCell align="right">{formatCurrency(gross)}</TableCell>
                <TableCell>Withholding Tax</TableCell>
                <TableCell align="right">—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell>Professional Tax</TableCell>
                <TableCell align="right">—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Reimbursements */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            mb: 2,
            bgcolor: '#fff',
            borderColor: '#D5D5D5',
            '& .MuiTableCell-root': { borderColor: '#D5D5D5', color: '#1a1a1a' },
          }}
        >
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reimbursements</TableCell>
                <TableCell align="right">{reimbursements > 0 ? formatCurrency(reimbursements) : '—'}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            mb: 2,
            bgcolor: '#fff',
            borderColor: '#D5D5D5',
            '& .MuiTableCell-root': { borderColor: '#D5D5D5', color: '#1a1a1a' },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#EBEBEB' }}>
                <TableCell sx={{ fontWeight: 700 }}>Summary</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Gross Earnings</TableCell>
                <TableCell align="right">{formatCurrency(gross)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total Deductions</TableCell>
                <TableCell align="right">{formatCurrency(deductions)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Total Reimbursements</TableCell>
                <TableCell align="right">{formatCurrency(reimbursements)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Net Payable</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(net)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
          Net Payable = Gross earnings - Total deductions
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Net Payable in words: {numberToWordsInr(net)}
        </Typography>

        <Typography variant="caption" display="block" align="center" sx={{ color: '#666' }}>
          This is a computer-generated document. No signature is required.
        </Typography>
        <Typography variant="caption" display="block" align="center" sx={{ color: '#666' }}>
          Generated on: {formatDate(new Date().toISOString())}
        </Typography>
      </Paper>
    </Box>
  );
};

export default SalarySlipView;
