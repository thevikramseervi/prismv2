import React, { useState } from 'react';
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
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Paper,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { leaveApi } from '../api/leave';
import { LeaveStatus } from '../types';

const Leave: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['my-leave-applications'],
    queryFn: () => leaveApi.getMyApplications(),
  });

  const { data: balance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveApi.getBalance(),
  });

  const applyMutation = useMutation({
    mutationFn: leaveApi.apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      setOpen(false);
      setFromDate('');
      setToDate('');
      setReason('');
    },
  });

  const handleSubmit = () => {
    applyMutation.mutate({ fromDate, toDate, reason });
  };

  const getStatusColor = (status: LeaveStatus): any => {
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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Leave Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Available Leaves: <strong>{balance?.availableLeaves || 0}</strong> / {balance?.totalLeaves || 12}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Apply Leave
        </Button>
      </Box>

      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            My Leave Applications
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>From Date</strong></TableCell>
                  <TableCell><strong>To Date</strong></TableCell>
                  <TableCell><strong>Days</strong></TableCell>
                  <TableCell><strong>Reason</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Applied On</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applications && applications.length > 0 ? (
                  applications.map((app) => (
                    <TableRow key={app.id} hover>
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
                        {new Date(app.appliedAt).toLocaleDateString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
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
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Leave;
