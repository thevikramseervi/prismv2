import React, { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
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
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import { CalendarMonth, TableRows, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { attendanceApi } from '../api/attendance';
import { holidaysApi } from '../api/holidays';
import { type Attendance, AttendanceStatus, type Holiday } from '../types';
import PageHeader from '../components/PageHeader';
import PageLoading from '../components/PageLoading';
import MobileTableCard from '../components/MobileTableCard';

type ViewMode = 'table' | 'calendar';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

/** Format time to HH:MM. Backend sends plain "HH:MM" or ISO time-of-day; show as stored (no TZ shift). */
const formatTime = (val: string | Date | null | undefined): string => {
  if (!val) return '-';
  try {
    if (typeof val === 'string') {
      // Already HH:MM or HH:MM:SS → use as-is (first 5 chars).
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(val)) {
        return val.slice(0, 5);
      }
      // ISO date string (e.g. 1970-01-01T08:55:00.000Z): use UTC so we show stored time, not local.
      if (val.includes('T')) {
        const d = new Date(val);
        if (isNaN(d.getTime())) return '-';
        const h = d.getUTCHours().toString().padStart(2, '0');
        const m = d.getUTCMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return '-';
      const h = d.getUTCHours().toString().padStart(2, '0');
      const m = d.getUTCMinutes().toString().padStart(2, '0');
      return `${h}:${m}`;
    }
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '-';
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1; // 1–12 for backend

  const {
    data: monthlyData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['my-attendance-monthly', year, month],
    queryFn: () => attendanceApi.getMonthlyAttendance(year, month),
    placeholderData: keepPreviousData,
  });

  const { data: holidays } = useQuery<Holiday[]>({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getAll(),
  });

  const attendance = monthlyData?.attendance ?? [];
  const summary = monthlyData?.summary;

  const statusByDate = useMemo(() => {
    const map = new Map<string, AttendanceStatus>();
    (attendance || []).forEach((record) => {
      const key = (record.date as string).split('T')[0];
      map.set(key, record.status as AttendanceStatus);
    });
    return map;
  }, [attendance]);

  const holidayDateKeys = useMemo(() => {
    const set = new Set<string>();
    (holidays || []).forEach((holiday) => {
      const key = (holiday.date as string).split('T')[0];
      set.add(key);
    });
    return set;
  }, [holidays]);

  const monthDays = useMemo(
    () => buildMonthMatrix(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  // For table view: one row per day of the month; map date key -> record for in/out/duration
  const recordByDateKey = useMemo(() => {
    const map = new Map<string, Attendance>();
    attendance.forEach((record) => {
      const key = (record.date as string).split('T')[0];
      map.set(key, record);
    });
    return map;
  }, [attendance]);

  const tableDays = useMemo(() => {
    return monthDays
      .filter((day) => day.isCurrentMonth)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [monthDays]);

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

  /** Short labels for calendar cells on mobile */
  const getStatusShortLabel = (status: AttendanceStatus): string => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'P';
      case AttendanceStatus.ABSENT:
        return 'A';
      case AttendanceStatus.HALF_DAY:
        return 'H';
      case AttendanceStatus.CASUAL_LEAVE:
        return 'CL';
      case AttendanceStatus.WEEKEND:
        return 'W';
      case AttendanceStatus.HOLIDAY:
        return 'Hol';
      default:
        return '';
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return next;
    });
  };

  if (isLoading && !monthlyData) return <PageLoading />;

  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">Failed to load attendance. Please try again.</Typography>
      </Box>
    );
  }

  // Week header: 2-letter on mobile so Tue/Thu and Sat/Sun are distinct (no duplicate T or S)
  const dayNames = isMobile
    ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Box>
      <PageHeader
        title="My Attendance"
        subtitle="View your daily attendance as a calendar or detailed table."
      />

      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={2}
      >
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
          fullWidth={isMobile}
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

        <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
          <Tooltip title="Previous month">
            <IconButton size="small" onClick={() => handleMonthChange('prev')} aria-label="Previous month">
              <ChevronLeft />
            </IconButton>
          </Tooltip>
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            sx={{
              fontSize: { xs: '0.9rem', sm: '1rem' },
              textAlign: 'center',
              minWidth: { xs: 140, sm: 'auto' },
            }}
          >
            {currentMonth.toLocaleDateString('en-IN', {
              month: isMobile ? 'short' : 'long',
              year: 'numeric',
            })}
          </Typography>
          <Tooltip title="Next month">
            <IconButton size="small" onClick={() => handleMonthChange('next')} aria-label="Next month">
              <ChevronRight />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {viewMode === 'calendar' ? (
        <>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent sx={{ px: { xs: 1, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: isMobile ? 0.5 : 1,
                }}
              >
                {dayNames.map((day) => (
                  <Box
                    key={day}
                    textAlign="center"
                    sx={{
                      fontWeight: 'bold',
                      color: 'text.secondary',
                      fontSize: isMobile ? '0.65rem' : 'inherit',
                    }}
                  >
                    {day}
                  </Box>
                ))}

                {monthDays.map((day) => {
                  const key = formatKey(day.date);
                  const record = recordByDateKey.get(key);
                  const attendanceStatus = statusByDate.get(key);
                  // Derive status when there is no record: prefer HOLIDAY, then WEEKEND
                  let status = attendanceStatus as AttendanceStatus | undefined;
                  if (!status) {
                    if (holidayDateKeys.has(key)) {
                      status = AttendanceStatus.HOLIDAY;
                    } else {
                      const dow = day.date.getDay(); // 0 = Sun, 6 = Sat
                      if (dow === 0 || dow === 6) {
                        status = AttendanceStatus.WEEKEND;
                      }
                    }
                  }
                  const isToday =
                    formatKey(day.date) === formatKey(new Date()) && day.isCurrentMonth;

                  const dayTooltip =
                    record
                      ? (
                          <Box component="span" sx={{ display: 'block' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                              <Typography component="span" variant="caption" color="text.secondary">First in</Typography>
                              <Typography component="span" variant="caption" fontWeight={600}>{formatTime(record.firstInTime)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                              <Typography component="span" variant="caption" color="text.secondary">Last out</Typography>
                              <Typography component="span" variant="caption" fontWeight={600}>{formatTime(record.lastOutTime)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                              <Typography component="span" variant="caption" color="text.secondary">Duration</Typography>
                              <Typography component="span" variant="caption" fontWeight={600}>{formatDuration(record.totalDuration)}</Typography>
                            </Box>
                          </Box>
                        )
                      : 'No punch';

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
                    <Tooltip key={key + String(day.isCurrentMonth)} title={dayTooltip} arrow placement="top">
                      <Paper
                        elevation={0}
                        sx={{
                          p: isMobile ? 0.5 : 1,
                          minHeight: isMobile ? 40 : 64,
                          bgcolor: bg,
                          opacity: day.isCurrentMonth ? 1 : 0.6,
                          borderRadius: isMobile ? 1 : 1.5,
                          border: isToday ? 2 : 1,
                          borderColor: isToday ? 'primary.main' : 'divider',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant={isMobile ? 'caption' : 'subtitle2'}
                          fontWeight="bold"
                          sx={{
                            color: 'text.primary',
                            fontSize: isMobile ? '0.75rem' : undefined,
                            lineHeight: 1.2,
                          }}
                        >
                          {day.date.getDate()}
                        </Typography>
                        {status && !isMobile && (
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
                        {status && isMobile && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              lineHeight: 1.2,
                              color: 'text.primary',
                              mt: 0.25,
                            }}
                          >
                            {getStatusShortLabel(status)}
                          </Typography>
                        )}
                      </Paper>
                    </Tooltip>
                  );
                })}
              </Box>
              {isMobile && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}
                >
                  P Present · A Absent · H Half · CL Leave · W Weekend · Hol Holiday
                </Typography>
              )}
            </CardContent>
          </Card>

          {summary && (
            <Card elevation={1} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Month summary
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1.5}>
                  <Chip label={`Present: ${summary.present}`} size="small" color="success" />
                  <Chip label={`Absent: ${summary.absent}`} size="small" color="error" />
                  <Chip label={`Half day: ${summary.halfDay}`} size="small" color="warning" />
                  <Chip label={`Casual leave: ${summary.casualLeave}`} size="small" color="info" />
                  <Chip label={`Weekend: ${summary.weekend}`} size="small" variant="outlined" />
                  <Chip label={`Holiday: ${summary.holiday}`} size="small" color="primary" />
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
                    ({summary.totalDays} days in month)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <>
          {summary && (
            <Card elevation={1} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Month summary
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1.5}>
                  <Chip label={`Present: ${summary.present}`} size="small" color="success" />
                  <Chip label={`Absent: ${summary.absent}`} size="small" color="error" />
                  <Chip label={`Half day: ${summary.halfDay}`} size="small" color="warning" />
                  <Chip label={`Casual leave: ${summary.casualLeave}`} size="small" color="info" />
                  <Chip label={`Weekend: ${summary.weekend}`} size="small" variant="outlined" />
                  <Chip label={`Holiday: ${summary.holiday}`} size="small" color="primary" />
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5 }}>
                    ({summary.totalDays} days in month)
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          <Card elevation={2}>
            <CardContent sx={{ overflow: 'hidden' }}>
              {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {tableDays.map((day) => {
                    const key = formatKey(day.date);
                    const record = recordByDateKey.get(key);
                    let status: AttendanceStatus | undefined = record?.status as AttendanceStatus | undefined;
                    if (!status) {
                      if (holidayDateKeys.has(key)) {
                        status = AttendanceStatus.HOLIDAY;
                      } else {
                        const dow = day.date.getDay();
                        if (dow === 0 || dow === 6) status = AttendanceStatus.WEEKEND;
                      }
                    }
                    return (
                      <MobileTableCard
                        key={key}
                        items={[
                          {
                            label: 'Date',
                            value: day.date.toLocaleDateString('en-IN', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }),
                          },
                          {
                            label: 'Status',
                            value: status ? (
                              <Chip
                                label={String(status).replace(/_/g, ' ')}
                                color={getStatusColor(status)}
                                size="small"
                              />
                            ) : (
                              'No record'
                            ),
                          },
                          { label: 'First In', value: record ? formatTime(record.firstInTime) : '—' },
                          { label: 'Last Out', value: record ? formatTime(record.lastOutTime) : '—' },
                          {
                            label: 'Duration',
                            value: record ? formatDuration(record.totalDuration) : '—',
                          },
                        ]}
                      />
                    );
                  })}
                </Box>
              ) : (
                <TableContainer
                  component={Paper}
                  elevation={0}
                  sx={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <Table sx={{ minWidth: 320 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>First In</strong></TableCell>
                        <TableCell><strong>Last Out</strong></TableCell>
                        <TableCell><strong>Duration (H:MM)</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableDays.map((day) => {
                        const key = formatKey(day.date);
                        const record = recordByDateKey.get(key);
                        let status: AttendanceStatus | undefined = record?.status as AttendanceStatus | undefined;
                        if (!status) {
                          if (holidayDateKeys.has(key)) {
                            status = AttendanceStatus.HOLIDAY;
                          } else {
                            const dow = day.date.getDay();
                            if (dow === 0 || dow === 6) status = AttendanceStatus.WEEKEND;
                          }
                        }
                        return (
                          <TableRow key={key} hover>
                            <TableCell>
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {day.date.toLocaleDateString('en-IN', { weekday: 'short' })}
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                  {day.date.toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              {status ? (
                                <Chip
                                  label={String(status).replace(/_/g, ' ')}
                                  color={getStatusColor(status)}
                                  size="small"
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No record
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{record ? formatTime(record.firstInTime) : '—'}</TableCell>
                            <TableCell>{record ? formatTime(record.lastOutTime) : '—'}</TableCell>
                            <TableCell>{record ? formatDuration(record.totalDuration) : '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default Attendance;

