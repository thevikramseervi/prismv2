import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import { Add, Cancel as CancelIcon } from '@mui/icons-material';
import { leaveApi } from '../api/leave';
import { holidaysApi } from '../api/holidays';
import { LeaveStatus, LeaveType } from '../types';
import PageHeader from '../components/PageHeader';
import { useSnackbar } from '../contexts/SnackbarContext';
import { getApiErrorMessage } from '../hooks/apiMessages';
import PageLoading from '../components/PageLoading';

const Leave: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.CASUAL_LEAVE);
  const queryClient = useQueryClient();

  const {
    data: applications,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['my-leave-applications'],
    queryFn: () => leaveApi.getMyApplications(),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveApi.getBalance(),
  });

  // Derive the year(s) touched by the selected range for holiday lookup
  const fromYear = fromDate ? new Date(fromDate).getUTCFullYear() : new Date().getUTCFullYear();
  const toYear   = toDate   ? new Date(toDate).getUTCFullYear()   : fromYear;

  const { data: holidays } = useQuery({
    queryKey: ['holidays-all'],
    queryFn: () => holidaysApi.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  // Build a Set of holiday date strings (YYYY-MM-DD) covering the selected years
  const holidaySet = useMemo(() => {
    const set = new Set<string>();
    (holidays ?? []).forEach((h) => {
      const y = new Date(h.date).getUTCFullYear();
      if (y >= fromYear && y <= toYear) {
        set.add(h.date.slice(0, 10));
      }
    });
    return set;
  }, [holidays, fromYear, toYear]);

  // Count working days in the selected range (excluding weekends and public holidays)
  const leaveSummary = useMemo(() => {
    if (!fromDate || !toDate) return null;
    const from = new Date(fromDate);
    const to   = new Date(toDate);
    if (from > to) return null;
    let working = 0, weekendCount = 0, holidayCount = 0;
    const cur = new Date(from);
    while (cur <= to) {
      const dow = cur.getUTCDay();
      const key = cur.toISOString().slice(0, 10);
      if (dow === 0 || dow === 6) {
        weekendCount++;
      } else if (holidaySet.has(key)) {
        holidayCount++;
      } else {
        working++;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return { working, weekendCount, holidayCount };
  }, [fromDate, toDate, holidaySet]);

  const applyMutation = useMutation({
    mutationFn: leaveApi.apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      setOpen(false);
      setFromDate('');
      setToDate('');
      setReason('');
      setLeaveType(LeaveType.CASUAL_LEAVE);
      showSuccess('Leave application submitted successfully.');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to apply for leave. Please try again.'));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => leaveApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      showSuccess('Leave application cancelled.');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to cancel leave. Please try again.'));
    },
  });

  const handleSubmit = () => {
    if (!reason?.trim()) {
      showError('Please provide a reason for leave.');
      return;
    }
    applyMutation.mutate({ fromDate, toDate, reason, leaveType });
  };

  const getStatusColor = (
    status: LeaveStatus,
  ): 'default' | 'error' | 'warning' | 'primary' | 'info' | 'success' => {
    switch (status) {
      case LeaveStatus.APPROVED:
        return 'success';
      case LeaveStatus.REJECTED:
        return 'error';
      case LeaveStatus.PENDING:
        return 'warning';
      case LeaveStatus.CANCELLED:
        return 'default';
      default:
        return 'default';
    }
  };

  if (isLoading) return <PageLoading />;

  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">Failed to load leave applications. Please try again.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Leave Management"
        subtitle={`Available Leaves: ${balance?.availableLeaves ?? 0} / ${balance?.totalLeaves ?? 12}`}
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpen(true)}
          >
            Apply Leave
          </Button>
        }
      />

      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            My Leave Applications
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Type</strong></TableCell>
                  <TableCell><strong>From Date</strong></TableCell>
                  <TableCell><strong>To Date</strong></TableCell>
                  <TableCell><strong>Days</strong></TableCell>
                  <TableCell><strong>Reason</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Applied On</strong></TableCell>
                  <TableCell><strong>Reviewed On</strong></TableCell>
                  <TableCell><strong>Admin Comments</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications && applications.length > 0 ? (
                  applications.map((app) => (
                    <TableRow key={app.id} hover>
                      <TableCell>
                        {app.leaveType === LeaveType.UNPAID_LEAVE ? 'Unpaid' : 'Casual'}
                      </TableCell>
                      <TableCell>
                        {new Date(app.fromDate).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {new Date(app.toDate).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>{app.totalDays}</TableCell>
                      <TableCell>{app.reason}</TableCell>
                      <TableCell>
                        <Chip
                          label={app.status}
                          color={getStatusColor(app.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(app.appliedAt).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {app.reviewedAt
                          ? new Date(app.reviewedAt).toLocaleString('en-IN')
                          : app.status === LeaveStatus.PENDING
                          ? 'Pending'
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {app.reviewNotes
                          ? app.reviewNotes
                          : app.status === LeaveStatus.PENDING
                          ? '—'
                          : 'No comments'}
                      </TableCell>
                      <TableCell>
                        {app.status === LeaveStatus.PENDING && (
                          <Tooltip title="Cancel application">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => cancelMutation.mutate(app.id)}
                              disabled={cancelMutation.isPending}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      No leave applications found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Apply Leave Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Apply for Leave</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mt={1}>
            <TextField
              label="Leave Type"
              select
              fullWidth
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              SelectProps={{ native: true }}
            >
              <option value={LeaveType.CASUAL_LEAVE}>Casual Leave (paid)</option>
              <option value={LeaveType.UNPAID_LEAVE}>Unpaid Leave (LOP)</option>
            </TextField>
          </Box>
          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              label="From Date"
              type="date"
              fullWidth
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To Date"
              type="date"
              fullWidth
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Live working-days feedback */}
          {fromDate && toDate && (
            fromDate > toDate ? (
              <Alert severity="error" sx={{ mt: 1 }}>
                "To Date" must be on or after "From Date".
              </Alert>
            ) : leaveSummary?.working === 0 ? (
              <Alert severity="warning" sx={{ mt: 1 }}>
                The selected range falls entirely on weekends or public holidays — no working days to deduct.
              </Alert>
            ) : leaveSummary ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                <strong>{leaveSummary.working} working day{leaveSummary.working !== 1 ? 's' : ''}</strong> will be deducted
                {(leaveSummary.weekendCount > 0 || leaveSummary.holidayCount > 0) && (
                  <>
                    {' '}(excluding{' '}
                    {leaveSummary.weekendCount > 0 && (
                      <>{leaveSummary.weekendCount} weekend day{leaveSummary.weekendCount !== 1 ? 's' : ''}</>
                    )}
                    {leaveSummary.weekendCount > 0 && leaveSummary.holidayCount > 0 && ' + '}
                    {leaveSummary.holidayCount > 0 && (
                      <>{leaveSummary.holidayCount} public holiday{leaveSummary.holidayCount !== 1 ? 's' : ''}</>
                    )}
                    )
                  </>
                )}.
              </Alert>
            ) : null
          )}

          <TextField
            label="Reason"
            multiline
            rows={3}
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              applyMutation.isPending ||
              !fromDate ||
              !toDate ||
              !reason?.trim() ||
              fromDate > toDate ||
              leaveSummary?.working === 0
            }
          >
            {applyMutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Leave;
