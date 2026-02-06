import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import { PictureAsPdf, Description } from '@mui/icons-material';
import { payrollApi } from '../api/payroll';
import { PaymentStatus } from '../types';

const SalarySlips: React.FC = () => {
  const { data: salarySlips, isLoading } = useQuery({
    queryKey: ['my-salary-slips'],
    queryFn: () => payrollApi.getMySalarySlips(),
  });

  const getStatusColor = (status: PaymentStatus): any => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'success';
      case PaymentStatus.PENDING:
        return 'warning';
      case PaymentStatus.DRAFT:
        return 'default';
      default:
        return 'default';
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      await payrollApi.downloadPDF(id);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  };

  const handleDownloadExcel = async (id: string) => {
    try {
      await payrollApi.downloadExcel(id);
    } catch (err) {
      console.error('Failed to download Excel:', err);
    }
  };

  const getMonthName = (month: number): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Salary Slips
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        View and download your salary slips
      </Typography>

      <Card elevation={2}>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Month</strong></TableCell>
                  <TableCell><strong>Year</strong></TableCell>
                  <TableCell align="right"><strong>Gross Earnings</strong></TableCell>
                  <TableCell align="right"><strong>Net Salary</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salarySlips && salarySlips.length > 0 ? (
                  salarySlips.map((slip) => (
                    <TableRow key={slip.id} hover>
                      <TableCell>{getMonthName(slip.month)}</TableCell>
                      <TableCell>{slip.year}</TableCell>
                      <TableCell align="right">
                        ₹{Number(slip.grossEarnings).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <strong>₹{Number(slip.netSalary).toFixed(2)}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={slip.paymentStatus}
                          color={getStatusColor(slip.paymentStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download PDF">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDownloadPDF(slip.id)}
                          >
                            <PictureAsPdf />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download Excel">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleDownloadExcel(slip.id)}
                          >
                            <Description />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No salary slips available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SalarySlips;
