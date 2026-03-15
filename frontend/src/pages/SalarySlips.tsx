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
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PictureAsPdf, Description, Visibility } from '@mui/icons-material';
import { payrollApi } from '../api/payroll';
import { PaymentStatus } from '../types';
import { useSnackbar } from '../contexts/SnackbarContext';
import PageLoading from '../components/PageLoading';

const SalarySlips: React.FC = () => {
  const navigate = useNavigate();
  const { showError } = useSnackbar();
  const { data: salarySlipsRaw, isLoading, isError } = useQuery({
    queryKey: ['my-salary-slips'],
    queryFn: () => payrollApi.getMySalarySlips(),
  });
  // Ensure we always have an array, sorted by year desc then month desc (most recent first)
  const salarySlips = React.useMemo(() => {
    const list = Array.isArray(salarySlipsRaw) ? salarySlipsRaw : [];
    return [...list].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [salarySlipsRaw]);

  const getStatusColor = (
    status: PaymentStatus,
  ): 'default' | 'error' | 'warning' | 'primary' | 'info' | 'success' => {
    switch (status) {
      case PaymentStatus.PAID:
        return 'success';
      case PaymentStatus.PROCESSED:
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
    } catch {
      showError('Failed to download PDF. Please try again.');
    }
  };

  const handleDownloadExcel = async (id: string) => {
    try {
      await payrollApi.downloadExcel(id);
    } catch {
      showError('Failed to download Excel file. Please try again.');
    }
  };

  const getMonthName = (month: number): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] ?? 'Unknown';
  };

  if (isLoading) return <PageLoading />;

  if (isError) {
    return <Alert severity="error" sx={{ mt: 2 }}>Failed to load salary slips. Please refresh the page.</Alert>;
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
                        {slip.grossEarnings != null ? `₹${Number(slip.grossEarnings).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell align="right">
                        <strong>{slip.netSalary != null ? `₹${Number(slip.netSalary).toFixed(2)}` : '—'}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={slip.paymentStatus}
                          color={getStatusColor(slip.paymentStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View slip">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/salary-slips/view/${slip.id}`)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
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
