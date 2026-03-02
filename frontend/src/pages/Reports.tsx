import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
} from '@mui/material';
import { Download, Summarize } from '@mui/icons-material';
import { attendanceApi } from '../api/attendance';
import { leaveApi } from '../api/leave';
import { payrollApi } from '../api/payroll';
import { usersApi } from '../api/users';
import {
  Attendance,
  AttendanceStatus,
  LeaveApplication,
  LeaveStatus,
  PaymentStatus,
  Payroll,
} from '../types';
import ExcelJS from 'exceljs';

/** Format time from ISO string or Date to HH:MM */
const formatTime = (val: string | Date | null | undefined): string => {
  if (!val) return '-';
  try {
    const d = typeof val === 'string' ? new Date(val) : val;
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const Reports: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  
  // Common filters
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Payroll filters
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  type AttendanceReportRow = Attendance & {
    user?: {
      employeeId: string;
      employeeNumber?: number;
      name: string;
      designation?: string;
    };
  };

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
  } = useQuery<AttendanceReportRow[]>({
    queryKey: ['attendance-report', selectedUserId, startDate, endDate],
    queryFn: () =>
      attendanceApi.getReport({
        userId: selectedUserId || undefined,
        startDate,
        endDate,
      }),
    enabled: false,
  });

  const {
    data: leaveData,
    isLoading: leaveLoading,
    refetch: refetchLeave,
  } = useQuery<LeaveApplication[]>({
    queryKey: ['leave-report'],
    queryFn: () => leaveApi.getReport(),
    enabled: false,
  });

  const {
    data: payrollData,
    isLoading: payrollLoading,
    refetch: refetchPayroll,
  } = useQuery<Payroll[]>({
    queryKey: ['payroll-report', payrollYear, payrollMonth, selectedUserId],
    queryFn: () =>
      payrollApi.getAll({
        year: payrollYear,
        month: payrollMonth,
        userId: selectedUserId || undefined,
      }),
    enabled: false,
  });

  const handleGenerateReport = () => {
    if (tabValue === 0) {
      refetchAttendance();
    } else if (tabValue === 1) {
      refetchLeave();
    } else if (tabValue === 2) {
      refetchPayroll();
    }
  };

  type Column<T> = {
    header: string;
    value: (row: T) => string | number;
  };

  const attendanceColumns: Column<AttendanceReportRow>[] = [
    { header: 'Employee ID', value: (r) => r.user?.employeeId || 'N/A' },
    { header: 'Employee Name', value: (r) => r.user?.name || 'N/A' },
    {
      header: 'Date',
      value: (r) => new Date(r.date).toLocaleDateString('en-IN'),
    },
    { header: 'Status', value: (r) => r.status },
    {
      header: 'First In',
      value: (r) => (r.firstInTime ? formatTime(r.firstInTime) : '-'),
    },
    {
      header: 'Last Out',
      value: (r) => (r.lastOutTime ? formatTime(r.lastOutTime) : '-'),
    },
    {
      header: 'Duration (hrs)',
      value: (r) =>
        r.totalDuration ? (Number(r.totalDuration) / 60).toFixed(2) : '-',
    },
  ];

  const leaveColumns: Column<LeaveApplication>[] = [
    { header: 'Employee ID', value: (l) => l.user?.employeeId || 'N/A' },
    { header: 'Employee Name', value: (l) => l.user?.name || 'N/A' },
    {
      header: 'From Date',
      value: (l) => new Date(l.fromDate).toLocaleDateString('en-IN'),
    },
    {
      header: 'To Date',
      value: (l) => new Date(l.toDate).toLocaleDateString('en-IN'),
    },
    { header: 'Total Days', value: (l) => l.totalDays },
    { header: 'Reason', value: (l) => l.reason },
    { header: 'Status', value: (l) => l.status },
    {
      header: 'Applied On',
      value: (l) => new Date(l.appliedAt).toLocaleDateString('en-IN'),
    },
    {
      header: 'Reviewed On',
      value: (l) =>
        l.reviewedAt
          ? new Date(l.reviewedAt).toLocaleDateString('en-IN')
          : '-',
    },
    {
      header: 'Comments',
      value: (l) => l.reviewerComments || '',
    },
  ];

  const payrollColumns: Column<Payroll>[] = [
    { header: 'Employee Number', value: (p) => p.user?.employeeNumber || 'N/A' },
    { header: 'Employee ID', value: (p) => p.user?.employeeId || 'N/A' },
    { header: 'Employee Name', value: (p) => p.user?.name || 'N/A' },
    { header: 'Month', value: (p) => p.month },
    { header: 'Year', value: (p) => p.year },
    { header: 'Base Salary', value: (p) => p.baseSalary },
    { header: 'Working Days', value: (p) => p.workingDays },
    { header: 'Present Days', value: (p) => p.presentDays },
    { header: 'Casual Leave', value: (p) => p.casualLeaveDays },
    { header: 'Half Days', value: (p) => p.halfDays },
    { header: 'LOP Days', value: (p) => p.lossOfPayDays },
    { header: 'Total Pay Days', value: (p) => p.totalPayDays },
    { header: 'Gross Earnings', value: (p) => p.grossEarnings },
    { header: 'Deductions', value: (p) => p.deductions },
    { header: 'Reimbursements', value: (p) => p.reimbursements },
    { header: 'Net Salary', value: (p) => p.netSalary },
    { header: 'Status', value: (p) => p.paymentStatus },
  ];

  const exportToExcel = async () => {
    let filename = '';

    if (tabValue === 0 && attendanceData && attendanceData.length > 0) {
      filename = `Attendance_Report_${startDate}_to_${endDate}.xlsx`;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Attendance');
      worksheet.addRow(attendanceColumns.map((c) => c.header));
      attendanceData.forEach((row) => {
        worksheet.addRow(attendanceColumns.map((c) => c.value(row)));
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (tabValue === 1 && leaveData && leaveData.length > 0) {
      filename = `Leave_Report_${new Date()
        .toISOString()
        .split('T')[0]}.xlsx`;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Leave');
      worksheet.addRow(leaveColumns.map((c) => c.header));
      leaveData.forEach((row) => {
        worksheet.addRow(leaveColumns.map((c) => c.value(row)));
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (tabValue === 2 && payrollData && payrollData.length > 0) {
      filename = `Payroll_Report_${payrollMonth}_${payrollYear}.xlsx`;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Payroll');
      worksheet.addRow(payrollColumns.map((c) => c.header));
      payrollData.forEach((row) => {
        worksheet.addRow(payrollColumns.map((c) => c.value(row)));
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const getAttendanceSummary = () => {
    if (!attendanceData) return null;

    const summary = {
      total: attendanceData.length,
      present: 0,
      absent: 0,
      halfDay: 0,
      casualLeave: 0,
      weekend: 0,
      holiday: 0,
    };

    attendanceData.forEach((record) => {
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

    return summary;
  };

  const getLeaveSummary = () => {
    if (!leaveData) return null;

    const summary = {
      total: leaveData.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
    };

    leaveData.forEach((leave) => {
      switch (leave.status) {
        case LeaveStatus.PENDING:
          summary.pending++;
          break;
        case LeaveStatus.APPROVED:
          summary.approved++;
          break;
        case LeaveStatus.REJECTED:
          summary.rejected++;
          break;
        case LeaveStatus.CANCELLED:
          summary.cancelled++;
          break;
      }
    });

    return summary;
  };

  const getPayrollSummary = () => {
    if (!payrollData) return null;

    const summary = {
      total: payrollData.length,
      totalGross: 0,
      totalNet: 0,
      paid: 0,
      pending: 0,
      draft: 0,
    };

    payrollData.forEach((payroll) => {
      summary.totalGross += Number(payroll.grossEarnings);
      summary.totalNet += Number(payroll.netSalary);

      switch (payroll.paymentStatus) {
        case PaymentStatus.PAID:
          summary.paid++;
          break;
        case PaymentStatus.PROCESSED:
          summary.pending++;
          break;
        case PaymentStatus.DRAFT:
          summary.draft++;
          break;
      }
    });

    return summary;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const attendanceSummary = getAttendanceSummary();
  const leaveSummary = getLeaveSummary();
  const payrollSummary = getPayrollSummary();

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Reports & Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Generate and export detailed reports
      </Typography>

      <Card elevation={2}>
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Attendance Report" icon={<Summarize />} iconPosition="start" />
            <Tab label="Leave Report" icon={<Summarize />} iconPosition="start" />
            <Tab label="Payroll Report" icon={<Summarize />} iconPosition="start" />
          </Tabs>

          {/* Attendance Report */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Employee (Optional)</InputLabel>
                  <Select
                    value={selectedUserId}
                    label="Employee (Optional)"
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Employees</em>
                    </MenuItem>
                    {users?.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name} ({user.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleGenerateReport}
                  disabled={attendanceLoading}
                  sx={{ height: '56px' }}
                >
                  {attendanceLoading ? <CircularProgress size={24} /> : 'Generate'}
                </Button>
              </Grid>
            </Grid>

            {attendanceSummary && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {attendanceSummary.total}
                      </Typography>
                      <Typography variant="caption">Total Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {attendanceSummary.present}
                      </Typography>
                      <Typography variant="caption">Present</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {attendanceSummary.absent}
                      </Typography>
                      <Typography variant="caption">Absent</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {attendanceSummary.halfDay}
                      </Typography>
                      <Typography variant="caption">Half Day</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {attendanceSummary.casualLeave}
                      </Typography>
                      <Typography variant="caption">Casual Leave</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                      <Typography variant="h4">
                        {attendanceSummary.weekend + attendanceSummary.holiday}
                      </Typography>
                      <Typography variant="caption">Weekend/Holiday</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {attendanceData && attendanceData.length > 0 ? (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Attendance Records ({attendanceData.length})</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={exportToExcel}
                  >
                    Export to Excel
                  </Button>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 500 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Employee</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>First In</strong></TableCell>
                        <TableCell><strong>Last Out</strong></TableCell>
                        <TableCell><strong>Duration (hrs)</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {attendanceData.map((record: any) => (
                        <TableRow key={record.id} hover>
                          <TableCell>{new Date(record.date).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>
                            {record.user?.name || 'N/A'}
                            <Typography variant="caption" display="block" color="text.secondary">
                              {record.user?.employeeId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={record.status.replace('_', ' ')}
                              size="small"
                              color={
                                record.status === AttendanceStatus.PRESENT
                                  ? 'success'
                                  : record.status === AttendanceStatus.ABSENT
                                  ? 'error'
                                  : record.status === AttendanceStatus.HALF_DAY
                                  ? 'warning'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{formatTime(record.firstInTime)}</TableCell>
                          <TableCell>{formatTime(record.lastOutTime)}</TableCell>
                          <TableCell>
                            {record.totalDuration ? (Number(record.totalDuration) / 60).toFixed(2) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : attendanceData && attendanceData.length === 0 ? (
              <Alert severity="info">No attendance records found for the selected criteria</Alert>
            ) : null}
          </TabPanel>

          {/* Leave Report */}
          <TabPanel value={tabValue} index={1}>
            <Box mb={3}>
              <Button
                variant="contained"
                onClick={handleGenerateReport}
                disabled={leaveLoading}
              >
                {leaveLoading ? <CircularProgress size={24} /> : 'Generate Report'}
              </Button>
            </Box>

            {leaveSummary && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {leaveSummary.total}
                      </Typography>
                      <Typography variant="caption">Total Applications</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {leaveSummary.pending}
                      </Typography>
                      <Typography variant="caption">Pending</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {leaveSummary.approved}
                      </Typography>
                      <Typography variant="caption">Approved</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'error.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {leaveSummary.rejected}
                      </Typography>
                      <Typography variant="caption">Rejected</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                      <Typography variant="h4">{leaveSummary.cancelled}</Typography>
                      <Typography variant="caption">Cancelled</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {leaveData && leaveData.length > 0 ? (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Leave Applications ({leaveData.length})</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={exportToExcel}
                  >
                    Export to Excel
                  </Button>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 500 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Employee</strong></TableCell>
                        <TableCell><strong>From Date</strong></TableCell>
                        <TableCell><strong>To Date</strong></TableCell>
                        <TableCell><strong>Days</strong></TableCell>
                        <TableCell><strong>Reason</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Applied On</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaveData.map((leave: any) => (
                        <TableRow key={leave.id} hover>
                          <TableCell>
                            {leave.user?.name || 'N/A'}
                            <Typography variant="caption" display="block" color="text.secondary">
                              {leave.user?.employeeId}
                            </Typography>
                          </TableCell>
                          <TableCell>{new Date(leave.fromDate).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>{new Date(leave.toDate).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell>{leave.totalDays}</TableCell>
                          <TableCell>{leave.reason}</TableCell>
                          <TableCell>
                            <Chip
                              label={leave.status}
                              size="small"
                              color={
                                leave.status === LeaveStatus.APPROVED
                                  ? 'success'
                                  : leave.status === LeaveStatus.REJECTED
                                  ? 'error'
                                  : leave.status === LeaveStatus.PENDING
                                  ? 'warning'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{new Date(leave.appliedAt).toLocaleDateString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : leaveData && leaveData.length === 0 ? (
              <Alert severity="info">No leave applications found</Alert>
            ) : null}
          </TabPanel>

          {/* Payroll Report */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={2} mb={3}>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Month</InputLabel>
                  <Select
                    value={payrollMonth}
                    label="Month"
                    onChange={(e) => setPayrollMonth(e.target.value as number)}
                  >
                    {months.map((month, index) => (
                      <MenuItem key={index} value={index + 1}>
                        {month}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={payrollYear}
                    label="Year"
                    onChange={(e) => setPayrollYear(e.target.value as number)}
                  >
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Employee (Optional)</InputLabel>
                  <Select
                    value={selectedUserId}
                    label="Employee (Optional)"
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>All Employees</em>
                    </MenuItem>
                    {users?.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name} ({user.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleGenerateReport}
                  disabled={payrollLoading}
                  sx={{ height: '56px' }}
                >
                  {payrollLoading ? <CircularProgress size={24} /> : 'Generate'}
                </Button>
              </Grid>
            </Grid>

            {payrollSummary && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {payrollSummary.total}
                      </Typography>
                      <Typography variant="caption">Total Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.50', textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main">
                        ₹{payrollSummary.totalGross.toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption">Total Gross</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.50', textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">
                        ₹{payrollSummary.totalNet.toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption">Total Net</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'success.100', textAlign: 'center' }}>
                      <Typography variant="h4" color="success.dark">
                        {payrollSummary.paid}
                      </Typography>
                      <Typography variant="caption">Paid</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'warning.50', textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {payrollSummary.pending + payrollSummary.draft}
                      </Typography>
                      <Typography variant="caption">Pending/Draft</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}

            {payrollData && payrollData.length > 0 ? (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Payroll Records ({payrollData.length})</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={exportToExcel}
                  >
                    Export to Excel
                  </Button>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 500 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Employee</strong></TableCell>
                        <TableCell><strong>Month/Year</strong></TableCell>
                        <TableCell align="right"><strong>Working Days</strong></TableCell>
                        <TableCell align="right"><strong>Pay Days</strong></TableCell>
                        <TableCell align="right"><strong>Gross</strong></TableCell>
                        <TableCell align="right"><strong>Net Salary</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payrollData.map((payroll: any) => (
                        <TableRow key={payroll.id} hover>
                          <TableCell>
                            {payroll.user?.name || 'N/A'}
                            <Typography variant="caption" display="block" color="text.secondary">
                              {payroll.user?.employeeId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {months[payroll.month - 1]} {payroll.year}
                          </TableCell>
                          <TableCell align="right">{payroll.workingDays}</TableCell>
                          <TableCell align="right">{Number(payroll.totalPayDays).toFixed(1)}</TableCell>
                          <TableCell align="right">₹{Number(payroll.grossEarnings).toLocaleString()}</TableCell>
                          <TableCell align="right">
                            <strong>₹{Number(payroll.netSalary).toLocaleString()}</strong>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payroll.paymentStatus}
                              size="small"
                              color={
                                payroll.paymentStatus === PaymentStatus.PAID
                                  ? 'success'
                                  : payroll.paymentStatus === PaymentStatus.PROCESSED
                                  ? 'warning'
                                  : 'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : payrollData && payrollData.length === 0 ? (
              <Alert severity="info">No payroll records found for the selected criteria</Alert>
            ) : null}
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Reports;
