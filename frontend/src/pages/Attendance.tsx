import React, { useMemo, useState } from 'react';
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
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  useTheme,
} from '@mui/material';
import { CalendarMonth, TableRows, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { attendanceApi } from '../api/attendance';
import { type Attendance, AttendanceStatus } from '../types';
import PageHeader from '../components/PageHeader';

type ViewMode = 'table' | 'calendar';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

/** Format time from ISO string or Date (e.g. "1970-01-01T09:25:00.000Z") to HH:MM */
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

const buildMonthMatrix = (year: number, month: number): CalendarDay[] => {
  // month: 0-11, week starts on Monday (Mon = 0 ... Sun = 6)
  const firstOfMonth = new Date(year, month, 1);
  const jsDay = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const startDay = (jsDay + 6) % 7; // shift so Monday becomes 0
  const startDate = new Date(year, month, 1 - startDay);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push({
      date: d,
      isCurrentMonth: d.getMonth() === month,
    });
  }
  return days;
};

// Build a YYYY-MM-DD key in LOCAL time (no timezone shifts)
const formatKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Attendance: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const {
    data: attendance,
    isLoading,
    isError,
  } = useQuery<Attendance[]>({
    queryKey: ['my-attendance'],
    queryFn: () => attendanceApi.getMyAttendance(),
  });

  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const statusByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    (attendance || []).forEach((record) => {
      // API returns ISO date string; normalise using local Y-M-D
      const date = new Date(record.date);
      const key = formatKey(date);
      map.set(key, record.status as AttendanceStatus);
    });
    return map;
  }, [attendance]);

  const monthDays = useMemo(
    () => buildMonthMatrix(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const getStatusColor = (
    status: AttendanceStatus,
  ): 'default' | 'error' | 'warning' | 'primary' | 'info' | 'success' => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'success';
      case AttendanceStatus.ABSENT:
        return 'error';
      case AttendanceStatus.HALF_DAY:
        return 'warning';
      case AttendanceStatus.CASUAL_LEAVE:
        return 'info';
      case AttendanceStatus.WEEKEND:
        return 'default';
      case AttendanceStatus.HOLIDAY:
        return 'primary';
      default:
        return 'default';
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">Failed to load attendance. Please try again.</Typography>
      </Box>
    );
  }

  // Week header starting Monday
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Box>
      <PageHeader
        title="My Attendance"
        subtitle="View your daily attendance as a calendar or detailed table."
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="calendar">
            <CalendarMonth sx={{ mr: 1 }} fontSize="small" />
            Calendar
          </ToggleButton>
          <ToggleButton value="table">
            <TableRows sx={{ mr: 1 }} fontSize="small" />
            Table
          </ToggleButton>
        </ToggleButtonGroup>

        {viewMode === 'calendar' && (
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton size="small" onClick={() => handleMonthChange('prev')}>
              <ChevronLeft />
            </IconButton>
            <Typography variant="subtitle1" fontWeight="bold">
              {currentMonth.toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric',
              })}
            </Typography>
            <IconButton size="small" onClick={() => handleMonthChange('next')}>
              <ChevronRight />
            </IconButton>
          </Box>
        )}
      </Box>

      {viewMode === 'calendar' ? (
        <>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 1,
                }}
              >
                {dayNames.map((day) => (
                  <Box key={day} textAlign="center" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    {day}
                  </Box>
                ))}

                {monthDays.map((day) => {
                  const key = formatKey(day.date);
                  const status = statusByDate.get(key);
                  const isToday =
                    formatKey(day.date) === formatKey(new Date()) && day.isCurrentMonth;

                  let bg: string;
                  if (!day.isCurrentMonth) {
                    bg = isDark ? 'grey.900' : 'grey.50';
                  } else if (status === AttendanceStatus.PRESENT) {
                    bg = isDark ? 'success.dark' : 'success.light';
                  } else if (status === AttendanceStatus.ABSENT) {
                    bg = isDark ? 'error.dark' : 'error.light';
                  } else if (status === AttendanceStatus.HALF_DAY) {
                    bg = isDark ? 'warning.dark' : 'warning.light';
                  } else if (status === AttendanceStatus.CASUAL_LEAVE) {
                    bg = isDark ? 'info.dark' : 'info.light';
                  } else if (status === AttendanceStatus.HOLIDAY) {
                    bg = isDark ? 'primary.dark' : 'primary.light';
                  } else {
                    bg = isDark ? 'grey.800' : 'grey.100';
                  }

                  return (
                    <Paper
                      key={key + String(day.isCurrentMonth)}
                      elevation={0}
                      sx={{
                        p: 1,
                        minHeight: 64,
                        bgcolor: bg,
                        opacity: day.isCurrentMonth ? 1 : 0.6,
                        borderRadius: 1.5,
                        border: isToday ? 2 : 1,
                        borderColor: isToday ? 'primary.main' : 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{ color: 'text.primary' }}
                      >
                        {day.date.getDate()}
                      </Typography>
                      {status && (
                        <Typography
                          variant="caption"
                          sx={{
                            mt: 0.5,
                            textTransform: 'capitalize',
                            color: 'text.primary',
                          }}
                        >
                          {status.replace('_', ' ').toLowerCase()}
                        </Typography>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          <Card elevation={1}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Legend
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1.5}>
                <Chip label="Present" size="small" color="success" />
                <Chip label="Absent" size="small" color="error" />
                <Chip label="Half Day" size="small" color="warning" />
                <Chip label="Casual Leave" size="small" color="info" />
                <Chip label="Holiday" size="small" color="primary" />
                <Chip label="No record" size="small" variant="outlined" />
              </Box>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card elevation={2}>
          <CardContent>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>First In</strong></TableCell>
                    <TableCell><strong>Last Out</strong></TableCell>
                    <TableCell><strong>Duration (hrs)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance && attendance.length > 0 ? (
                    attendance.map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          {new Date(record.date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.status.replace('_', ' ')}
                            color={getStatusColor(record.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatTime(record.firstInTime)}</TableCell>
                        <TableCell>{formatTime(record.lastOutTime)}</TableCell>
                        <TableCell>
                          {record.totalDuration
                            ? (Number(record.totalDuration) / 60).toFixed(2)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Attendance;

