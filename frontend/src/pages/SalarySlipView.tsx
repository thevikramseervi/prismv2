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
import { useThemeMode } from '../contexts/ThemeModeContext';
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
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';
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

      <Paper
        elevation={2}
        sx={{
          maxWidth: 720,
          mx: 'auto',
          p: 3,
          ...(isDark && {
            bgcolor: '#ffffff',
            color: '#1a1a1a',
            '& .MuiTypography-root': { color: '#1a1a1a' },
            '& .MuiTableCell-root': { color: '#1a1a1a', borderColor: '#d5d5d5' },
          }),
        }}
      >
        {/* Header */}
        <Typography variant="h6" align="center" fontWeight="bold" gutterBottom>
          Pay Slip for the month of {monthName} {payroll.year}
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2, ...(isDark && { color: '#555' }) }}>
          Figures are in INR
        </Typography>

        {/* Employee details */}
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom sx={isDark ? { color: '#555' } : undefined}>
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
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom sx={isDark ? { color: '#555' } : undefined}>
          ATTENDANCE SUMMARY
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0.5, mb: 3, fontSize: '0.875rem' }}>
          <Typography variant="body2">Working Days:</Typography>
          <Typography variant="body2">{payroll.workingDays}</Typography>
          <Typography variant="body2">Present Days:</Typography>
          <Typography variant="body2">{payroll.presentDays}</Typography>
          <Typography variant="body2">Casual Leave:</Typography>
          <Typography variant="body2">{payroll.casualLeaveDays}</Typography>
          <Typography variant="body2">Half Days:</Typography>
          <Typography variant="body2">{payroll.halfDays}</Typography>
          <Typography variant="body2">Loss of Pay:</Typography>
          <Typography variant="body2">{payroll.lossOfPayDays}</Typography>
          <Typography variant="body2">Total Pay Days:</Typography>
          <Typography variant="body2">{payroll.totalPayDays}</Typography>
        </Box>

        {/* Salary breakdown — single table: Earnings | Amount | Deductions | Amount */}
        <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" gutterBottom sx={isDark ? { color: '#555' } : undefined}>
          SALARY BREAKDOWN
        </Typography>
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            mb: 2,
            borderColor: '#D5D5D5',
            ...(isDark && { bgcolor: '#fff', '& .MuiPaper-root': { bgcolor: '#fff' } }),
            '& .MuiTable-root': { borderColor: '#D5D5D5' },
            '& .MuiTableCell-root': { borderColor: '#D5D5D5', color: '#1a1a1a' },
          }}
        >
          <Table size="small" sx={{ '& td, & th': { borderColor: '#D5D5D5' } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#EBEBEB' }}>
                <TableCell sx={{ bgcolor: '#EBEBEB', fontWeight: 700 }}>Earnings</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#EBEBEB', fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ bgcolor: '#EBEBEB', fontWeight: 700 }}>Deductions</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#EBEBEB', fontWeight: 700 }}>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ bgcolor: '#fff' }}>
                <TableCell sx={{ bgcolor: '#fff' }}>Salary and other Allowances</TableCell>
                <TableCell align="right">{formatCurrency(gross)}</TableCell>
                <TableCell sx={{ bgcolor: '#fff' }}>Withholding Tax</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#fff' }}>—</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff' }}>
                <TableCell sx={{ bgcolor: '#fff' }}></TableCell>
                <TableCell sx={{ bgcolor: '#fff' }}></TableCell>
                <TableCell sx={{ bgcolor: '#fff' }}>Professional Tax</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#fff' }}>—</TableCell>
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
            borderColor: '#D5D5D5',
            ...(isDark && { bgcolor: '#fff', '& .MuiPaper-root': { bgcolor: '#fff' }, '& .MuiTableCell-root': { color: '#1a1a1a' } }),
            '& .MuiTableCell-root': { borderColor: '#D5D5D5' },
          }}
        >
          <Table size="small">
            <TableBody>
              <TableRow sx={{ bgcolor: '#fff' }}>
                <TableCell sx={{ bgcolor: '#fff', fontWeight: 700 }}>Reimbursements</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#fff' }}>{reimbursements > 0 ? formatCurrency(reimbursements) : '—'}</TableCell>
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
            borderColor: '#D5D5D5',
            ...(isDark && { bgcolor: '#fff', '& .MuiPaper-root': { bgcolor: '#fff' }, '& .MuiTableCell-root': { color: '#1a1a1a' } }),
            '& .MuiTableCell-root': { borderColor: '#D5D5D5' },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#EBEBEB' }}>
                <TableCell sx={{ bgcolor: '#EBEBEB', fontWeight: 700 }}>Summary</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#EBEBEB' }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ bgcolor: '#fff' }}>
                <TableCell sx={{ bgcolor: '#fff' }}>Gross Earnings</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#fff' }}>{formatCurrency(gross)}</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff' }}>
                <TableCell sx={{ bgcolor: '#fff' }}>Total Deductions</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#fff' }}>{formatCurrency(deductions)}</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff' }}>
                <TableCell sx={{ bgcolor: '#fff' }}>Total Reimbursements</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#fff' }}>{formatCurrency(reimbursements)}</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#fff' }}>
                <TableCell sx={{ bgcolor: '#fff', fontWeight: 700 }}>Net Payable</TableCell>
                <TableCell align="right" sx={{ bgcolor: '#fff', fontWeight: 700 }}>{formatCurrency(net)}</TableCell>
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

        <Typography variant="caption" display="block" color="text.secondary" align="center" sx={isDark ? { color: '#666' } : undefined}>
          This is a computer-generated document. No signature is required.
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" align="center" sx={isDark ? { color: '#666' } : undefined}>
          Generated on: {formatDate(new Date().toISOString())}
        </Typography>
      </Paper>
    </Box>
  );
};

export default SalarySlipView;
