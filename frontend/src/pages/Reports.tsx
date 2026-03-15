import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Download, Summarize, CheckCircle } from '@mui/icons-material';
import ResponsiveDialog from '../components/ResponsiveDialog';
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
import PageHeader from '../components/PageHeader';
import MobileTableCard from '../components/MobileTableCard';
import { useAuth } from '../contexts/AuthContext';

/** Format time to HH:MM. Backend now sends plain "HH:MM" strings for in/out times. */
const formatTime = (val: string | Date | null | undefined): string => {
  if (!val) return '-';
  try {
    if (typeof val === 'string') {
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(val)) {
        return val.slice(0, 5);
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return '-';
      return d.getUTCHours().toString().padStart(2, '0') + ':' + d.getUTCMinutes().toString().padStart(2, '0');
    }
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '-';
    return d.getUTCHours().toString().padStart(2, '0') + ':' + d.getUTCMinutes().toString().padStart(2, '0');
  } catch {
    return '-';
  }
};

/** Format duration (minutes) as H:MM, e.g. 525 -> "8:45". */
const formatDuration = (minutes?: number | null): string => {
  if (minutes == null) return '-';
  const total = Number(minutes);
  if (Number.isNaN(total)) return '-';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours}:${String(mins).padStart(2, '0')}`;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const [tabValue, setTabValue] = useState(0);
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  
  // Common filters — use UTC methods so the date strings are always correct
  // regardless of the browser's local timezone (avoids off-by-one at IST midnight).
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Payroll filters
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);

  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAllPages(),
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
    queryKey: ['leave-report', selectedUserId, startDate, endDate],
    queryFn: () =>
      leaveApi.getReport({
        userId: selectedUserId || undefined,
        fromDate: startDate,
        toDate: endDate,
      }),
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

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    record: AttendanceReportRow | null;
    newStatus: AttendanceStatus | '';
  }>({ open: false, record: null, newStatus: '' });

  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    userId: string;
    date: string;
    status: AttendanceStatus | '';
  }>({
    open: false,
    userId: '',
    date: new Date().toISOString().split('T')[0],
    status: AttendanceStatus.PRESENT,
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: AttendanceStatus;
    }) => attendanceApi.update(id, { status }),
    onSuccess: () => {
      setEditDialog({ open: false, record: null, newStatus: '' });
      refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const createAttendanceMutation = useMutation({
    mutationFn: attendanceApi.createManual,
    onSuccess: () => {
      setCreateDialog((prev) => ({
        ...prev,
        open: false,
      }));
      refetchAttendance();
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const [leaveActionDialog, setLeaveActionDialog] = useState<{
    open: boolean;
    application: LeaveApplication | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, application: null, action: null });
  const [leaveComments, setLeaveComments] = useState('');

  const [markPaidDialog, setMarkPaidDialog] = useState<{
    open: boolean;
    payroll: Payroll | null;
  }>({ open: false, payroll: null });

  const markAsPaidMutation = useMutation({
    mutationFn: (id: string) => payrollApi.markAsPaid(id),
    onSuccess: () => {
      setMarkPaidDialog({ open: false, payroll: null });
      refetchPayroll();
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }) => leaveApi.approve(id, comments),
    onSuccess: () => {
      setLeaveActionDialog({ open: false, application: null, action: null });
      setLeaveComments('');
      refetchLeave();
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({
      id,
      comments,
    }: {
      id: string;
      comments: string;
    }) => leaveApi.reject(id, comments),
    onSuccess: () => {
      setLeaveActionDialog({ open: false, application: null, action: null });
      setLeaveComments('');
      refetchLeave();
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
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
      header: 'Duration (H:MM)',
      value: (r) => formatDuration(r.totalDuration),
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
      value: (l) => new Date(l.appliedAt).toLocaleString('en-IN'),
    },
    {
      header: 'Reviewed On',
      value: (l) =>
        l.reviewedAt
          ? new Date(l.reviewedAt).toLocaleString('en-IN')
          : '-',
    },
    {
      header: 'Comments',
      value: (l) => l.reviewNotes || '',
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
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate and export detailed attendance, leave, and payroll reports."
      />
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
                <FormControl fullWidth disabled={usersLoading}>
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

            {usersError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                action={
                  <Button color="inherit" size="small" onClick={() => refetchUsers()}>
                    Retry
                  </Button>
                }
              >
                Failed to load users. Employee filters may be incomplete.
              </Alert>
            )}

            {attendanceSummary && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'background.paper' : 'grey.100',
                      }}
                    >
                      <Typography variant="h4" color="primary">
                        {attendanceSummary.total}
                      </Typography>
                      <Typography variant="caption">Total Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(34,197,94,0.1)' : 'success.50',
                      }}
                    >
                      <Typography variant="h4" color="success.main">
                        {attendanceSummary.present}
                      </Typography>
                      <Typography variant="caption">Present</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(239,68,68,0.12)' : 'error.50',
                      }}
                    >
                      <Typography variant="h4" color="error.main">
                        {attendanceSummary.absent}
                      </Typography>
                      <Typography variant="caption">Absent</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(251,191,36,0.12)' : 'warning.50',
                      }}
                    >
                      <Typography variant="h4" color="warning.main">
                        {attendanceSummary.halfDay}
                      </Typography>
                      <Typography variant="caption">Half Day</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(59,130,246,0.12)' : 'info.50',
                      }}
                    >
                      <Typography variant="h4" color="info.main">
                        {attendanceSummary.casualLeave}
                      </Typography>
                      <Typography variant="caption">Casual Leave</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'background.paper' : 'grey.100',
                      }}
                    >
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
                  <Box display="flex" gap={1}>
                    {authUser?.role === 'SUPER_ADMIN' && (
                      <Button
                        variant="contained"
                        onClick={() =>
                          setCreateDialog((prev) => ({
                            ...prev,
                            open: true,
                          }))
                        }
                      >
                        Add Manual Entry
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={exportToExcel}
                    >
                      Export to Excel
                    </Button>
                  </Box>
                </Box>
                {isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 500, overflowY: 'auto' }}>
                    {attendanceData.map((record) => (
                      <MobileTableCard
                        key={record.id}
                        items={[
                          { label: 'Date', value: new Date(record.date).toLocaleDateString('en-IN') },
                          {
                            label: 'Employee',
                            value: (
                              <Box>
                                <Typography component="span" variant="body2" fontWeight="bold" display="block">
                                  {record.user?.name || 'N/A'}
                                </Typography>
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {record.user?.employeeId}
                                </Typography>
                              </Box>
                            ),
                          },
                          {
                            label: 'Status',
                            value: (
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
                            ),
                          },
                          { label: 'First In', value: formatTime(record.firstInTime) },
                          { label: 'Last Out', value: formatTime(record.lastOutTime) },
                          { label: 'Duration', value: formatDuration(record.totalDuration) },
                        ]}
                        actions={
                          authUser?.role === 'SUPER_ADMIN' ? (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() =>
                                setEditDialog({
                                  open: true,
                                  record,
                                  newStatus: record.status as AttendanceStatus,
                                })
                              }
                            >
                              Edit
                            </Button>
                          ) : undefined
                        }
                      />
                    ))}
                  </Box>
                ) : (
                  <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 500 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Date</strong></TableCell>
                          <TableCell><strong>Employee</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell><strong>First In</strong></TableCell>
                          <TableCell><strong>Last Out</strong></TableCell>
                          <TableCell><strong>Duration (H:MM)</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendanceData.map((record) => (
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
                            <TableCell>{formatDuration(record.totalDuration)}</TableCell>
                            {authUser?.role === 'SUPER_ADMIN' && (
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() =>
                                    setEditDialog({
                                      open: true,
                                      record,
                                      newStatus: record.status as AttendanceStatus,
                                    })
                                  }
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ) : attendanceData && attendanceData.length === 0 ? (
              <Alert severity="info">No attendance records found for the selected criteria</Alert>
            ) : null}
          </TabPanel>

          {/* Leave Report */}
          <TabPanel value={tabValue} index={1}>
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
                <FormControl fullWidth disabled={usersLoading}>
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
                  disabled={leaveLoading}
                  sx={{ height: '56px' }}
                >
                  {leaveLoading ? <CircularProgress size={24} /> : 'Generate'}
                </Button>
              </Grid>
            </Grid>

            {leaveSummary && (
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'background.paper' : 'grey.100',
                      }}
                    >
                      <Typography variant="h4" color="primary">
                        {leaveSummary.total}
                      </Typography>
                      <Typography variant="caption">Total Applications</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(251,191,36,0.12)' : 'warning.50',
                      }}
                    >
                      <Typography variant="h4" color="warning.main">
                        {leaveSummary.pending}
                      </Typography>
                      <Typography variant="caption">Pending</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(34,197,94,0.1)' : 'success.50',
                      }}
                    >
                      <Typography variant="h4" color="success.main">
                        {leaveSummary.approved}
                      </Typography>
                      <Typography variant="caption">Approved</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(239,68,68,0.12)' : 'error.50',
                      }}
                    >
                      <Typography variant="h4" color="error.main">
                        {leaveSummary.rejected}
                      </Typography>
                      <Typography variant="caption">Rejected</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'background.paper' : 'grey.100',
                      }}
                    >
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
                {isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 500, overflowY: 'auto' }}>
                    {leaveData.map((leave) => (
                      <MobileTableCard
                        key={leave.id}
                        items={[
                          {
                            label: 'Employee',
                            value: (
                              <Box>
                                <Typography component="span" variant="body2" fontWeight="bold" display="block">
                                  {leave.user?.name || 'N/A'}
                                </Typography>
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {leave.user?.employeeId}
                                </Typography>
                              </Box>
                            ),
                          },
                          {
                            label: 'From – To',
                            value: `${new Date(leave.fromDate).toLocaleDateString('en-IN')} – ${new Date(leave.toDate).toLocaleDateString('en-IN')}`,
                          },
                          { label: 'Days', value: leave.totalDays },
                          { label: 'Reason', value: leave.reason },
                          {
                            label: 'Status',
                            value: (
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
                            ),
                          },
                          {
                            label: 'Applied On',
                            value: new Date(leave.appliedAt).toLocaleDateString('en-IN'),
                          },
                        ]}
                        actions={
                          authUser && (authUser.role === 'LAB_ADMIN' || authUser.role === 'SUPER_ADMIN') && leave.status === LeaveStatus.PENDING ? (
                            <Box display="flex" gap={1}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() =>
                                  setLeaveActionDialog({
                                    open: true,
                                    application: leave,
                                    action: 'approve',
                                  })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="text"
                                onClick={() =>
                                  setLeaveActionDialog({
                                    open: true,
                                    application: leave,
                                    action: 'reject',
                                  })
                                }
                              >
                                Reject
                              </Button>
                            </Box>
                          ) : undefined
                        }
                      />
                    ))}
                  </Box>
                ) : (
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
                          {authUser && (authUser.role === 'LAB_ADMIN' || authUser.role === 'SUPER_ADMIN') && (
                            <TableCell><strong>Actions</strong></TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {leaveData.map((leave) => (
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
                            {authUser && (authUser.role === 'LAB_ADMIN' || authUser.role === 'SUPER_ADMIN') && (
                              <TableCell>
                                {leave.status === LeaveStatus.PENDING ? (
                                  <Box display="flex" gap={1}>
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() =>
                                        setLeaveActionDialog({
                                          open: true,
                                          application: leave,
                                          action: 'approve',
                                        })
                                      }
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="small"
                                      color="error"
                                      variant="text"
                                      onClick={() =>
                                        setLeaveActionDialog({
                                          open: true,
                                          application: leave,
                                          action: 'reject',
                                        })
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </Box>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
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
                <FormControl fullWidth disabled={usersLoading}>
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
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'background.paper' : 'grey.100',
                      }}
                    >
                      <Typography variant="h4" color="primary">
                        {payrollSummary.total}
                      </Typography>
                      <Typography variant="caption">Total Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(59,130,246,0.12)' : 'info.50',
                      }}
                    >
                      <Typography variant="h5" color="info.main">
                        ₹{payrollSummary.totalGross.toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption">Total Gross</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(34,197,94,0.1)' : 'success.50',
                      }}
                    >
                      <Typography variant="h5" color="success.main">
                        ₹{payrollSummary.totalNet.toLocaleString('en-IN')}
                      </Typography>
                      <Typography variant="caption">Total Net</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(22,163,74,0.16)' : 'success.100',
                      }}
                    >
                      <Typography variant="h4" color="success.dark">
                        {payrollSummary.paid}
                      </Typography>
                      <Typography variant="caption">Paid</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.4 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        bgcolor: isDark ? 'rgba(251,191,36,0.12)' : 'warning.50',
                      }}
                    >
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
                {isMobile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 500, overflowY: 'auto' }}>
                    {payrollData.map((payroll) => (
                      <MobileTableCard
                        key={payroll.id}
                        items={[
                          {
                            label: 'Employee',
                            value: (
                              <Box>
                                <Typography component="span" variant="body2" fontWeight="bold" display="block">
                                  {payroll.user?.name || 'N/A'}
                                </Typography>
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {payroll.user?.employeeId}
                                </Typography>
                              </Box>
                            ),
                          },
                          {
                            label: 'Month/Year',
                            value: `${months[payroll.month - 1]} ${payroll.year}`,
                          },
                          { label: 'Working Days', value: payroll.workingDays },
                          { label: 'Pay Days', value: Number(payroll.totalPayDays).toFixed(1) },
                          {
                            label: 'Gross',
                            value: `₹${Number(payroll.grossEarnings).toLocaleString()}`,
                          },
                          {
                            label: 'Net Salary',
                            value: `₹${Number(payroll.netSalary).toLocaleString()}`,
                          },
                          {
                            label: 'Status',
                            value: (
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
                            ),
                          },
                        ]}
                        actions={
                          authUser?.role === 'SUPER_ADMIN' && payroll.paymentStatus !== PaymentStatus.PAID ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<CheckCircle />}
                              onClick={() => setMarkPaidDialog({ open: true, payroll })}
                            >
                              Mark Paid
                            </Button>
                          ) : undefined
                        }
                      />
                    ))}
                  </Box>
                ) : (
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
                          {authUser?.role === 'SUPER_ADMIN' && (
                            <TableCell align="center"><strong>Actions</strong></TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payrollData.map((payroll) => (
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
                            {authUser?.role === 'SUPER_ADMIN' && (
                              <TableCell align="center">
                                {payroll.paymentStatus !== PaymentStatus.PAID && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="success"
                                    startIcon={<CheckCircle />}
                                    onClick={() => setMarkPaidDialog({ open: true, payroll })}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            ) : payrollData && payrollData.length === 0 ? (
              <Alert severity="info">No payroll records found for the selected criteria</Alert>
            ) : null}
          </TabPanel>
        </CardContent>
      </Card>
      {authUser && (authUser.role === 'LAB_ADMIN' || authUser.role === 'SUPER_ADMIN') && (
        <>
          <ResponsiveDialog
            open={editDialog.open}
            onClose={() => setEditDialog({ open: false, record: null, newStatus: '' })}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogContent>
              {editDialog.record && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {editDialog.record.user?.name} ({editDialog.record.user?.employeeId})
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Date:{' '}
                    {new Date(editDialog.record.date).toLocaleDateString('en-IN')}
                  </Typography>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={editDialog.newStatus}
                      onChange={(e) =>
                        setEditDialog((prev) => ({
                          ...prev,
                          newStatus: e.target.value as AttendanceStatus,
                        }))
                      }
                    >
                      {Object.values(AttendanceStatus).map((s) => (
                        <MenuItem key={s} value={s}>
                          {s.replace('_', ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setEditDialog({ open: false, record: null, newStatus: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                disabled={
                  !editDialog.record ||
                  !editDialog.newStatus ||
                  updateAttendanceMutation.isPending
                }
                onClick={() => {
                  if (!editDialog.record || !editDialog.newStatus) return;
                  updateAttendanceMutation.mutate({
                    id: editDialog.record.id,
                    status: editDialog.newStatus,
                  });
                }}
              >
                {updateAttendanceMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </ResponsiveDialog>

          <ResponsiveDialog
            open={createDialog.open}
            onClose={() =>
              setCreateDialog((prev) => ({
                ...prev,
                open: false,
              }))
            }
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Manual Attendance Entry</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 1 }}>
                <FormControl fullWidth margin="normal" disabled={usersLoading}>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    label="Employee"
                    value={createDialog.userId}
                    onChange={(e) =>
                      setCreateDialog((prev) => ({
                        ...prev,
                        userId: e.target.value,
                      }))
                    }
                  >
                    {users?.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name} ({u.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Date"
                  type="date"
                  value={createDialog.date}
                  onChange={(e) =>
                    setCreateDialog((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={createDialog.status}
                    onChange={(e) =>
                      setCreateDialog((prev) => ({
                        ...prev,
                        status: e.target.value as AttendanceStatus,
                      }))
                    }
                  >
                    {Object.values(AttendanceStatus).map((s) => (
                      <MenuItem key={s} value={s}>
                        {s.replace('_', ' ')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() =>
                  setCreateDialog((prev) => ({
                    ...prev,
                    open: false,
                  }))
                }
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                disabled={
                  !createDialog.userId ||
                  !createDialog.date ||
                  !createDialog.status ||
                  createAttendanceMutation.isPending
                }
                onClick={() => {
                  createAttendanceMutation.mutate({
                    userId: createDialog.userId,
                    date: createDialog.date,
                    status: createDialog.status,
                  });
                }}
              >
                {createAttendanceMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </ResponsiveDialog>

          <ResponsiveDialog
            open={leaveActionDialog.open}
            onClose={() => {
              setLeaveActionDialog({ open: false, application: null, action: null });
              setLeaveComments('');
            }}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>
              {leaveActionDialog.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
            </DialogTitle>
            <DialogContent>
              {leaveActionDialog.application && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Employee:</strong> {leaveActionDialog.application.user?.name}{' '}
                    ({leaveActionDialog.application.user?.employeeId})
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Duration:</strong>{' '}
                    {new Date(leaveActionDialog.application.fromDate).toLocaleDateString('en-IN')} to{' '}
                    {new Date(leaveActionDialog.application.toDate).toLocaleDateString('en-IN')} (
                    {leaveActionDialog.application.totalDays} days)
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Reason:</strong> {leaveActionDialog.application.reason}
                  </Typography>
                  <TextField
                    fullWidth
                    margin="normal"
                    label={
                      leaveActionDialog.action === 'reject'
                        ? 'Comments (required)'
                        : 'Comments (optional)'
                    }
                    multiline
                    rows={3}
                    value={leaveComments}
                    onChange={(e) => setLeaveComments(e.target.value)}
                    required={leaveActionDialog.action === 'reject'}
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setLeaveActionDialog({ open: false, application: null, action: null });
                  setLeaveComments('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color={leaveActionDialog.action === 'approve' ? 'success' : 'error'}
                disabled={
                  !leaveActionDialog.application ||
                  (!leaveComments.trim() && leaveActionDialog.action === 'reject') ||
                  approveLeaveMutation.isPending ||
                  rejectLeaveMutation.isPending
                }
                onClick={() => {
                  if (!leaveActionDialog.application || !leaveActionDialog.action) return;
                  if (leaveActionDialog.action === 'approve') {
                    approveLeaveMutation.mutate({
                      id: leaveActionDialog.application.id,
                      comments: leaveComments.trim() || undefined,
                    });
                  } else {
                    rejectLeaveMutation.mutate({
                      id: leaveActionDialog.application.id,
                      comments: leaveComments.trim(),
                    });
                  }
                }}
              >
                {approveLeaveMutation.isPending || rejectLeaveMutation.isPending
                  ? 'Processing...'
                  : leaveActionDialog.action === 'approve'
                  ? 'Approve'
                  : 'Reject'}
              </Button>
            </DialogActions>
          </ResponsiveDialog>

          {/* Mark as Paid confirmation dialog */}
          <ResponsiveDialog
            open={markPaidDialog.open}
            onClose={() => setMarkPaidDialog({ open: false, payroll: null })}
            maxWidth="xs"
            fullWidth
          >
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogContent>
              {markPaidDialog.payroll && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Mark the following payroll as <strong>PAID</strong>?
                  </Typography>
                  <Box mt={1.5} p={1.5} sx={{ bgcolor: isDark ? 'background.default' : 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>Employee:</strong> {markPaidDialog.payroll.user?.name} ({markPaidDialog.payroll.user?.employeeId})
                    </Typography>
                    <Typography variant="body2">
                      <strong>Period:</strong> {['January','February','March','April','May','June','July','August','September','October','November','December'][markPaidDialog.payroll.month - 1]} {markPaidDialog.payroll.year}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Net Salary:</strong> ₹{Number(markPaidDialog.payroll.netSalary).toLocaleString()}
                    </Typography>
                  </Box>
                  <Alert severity="info" sx={{ mt: 1.5 }}>
                    This will record today's date as the payment date and cannot be undone.
                  </Alert>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setMarkPaidDialog({ open: false, payroll: null })}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                disabled={markAsPaidMutation.isPending}
                onClick={() => {
                  if (markPaidDialog.payroll) {
                    markAsPaidMutation.mutate(markPaidDialog.payroll.id);
                  }
                }}
              >
                {markAsPaidMutation.isPending ? 'Marking...' : 'Confirm Paid'}
              </Button>
            </DialogActions>
          </ResponsiveDialog>
        </>
      )}
    </Box>
  );
};

export default Reports;
