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
  Chip,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { leaveApi } from '../api/leave';
import { LeaveApplication, LeaveStatus } from '../types';

const LeaveApproval: React.FC = () => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    application: LeaveApplication | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, application: null, action: null });
  const [comments, setComments] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const queryClient = useQueryClient();

  const { data: pendingApplications, isLoading } = useQuery({
    queryKey: ['pending-leave-applications'],
    queryFn: () => leaveApi.getPending(),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      leaveApi.approve(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-applications'] });
      handleCloseActionDialog();
      setSnackbar({
        open: true,
        message: 'Leave approved successfully!',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to approve leave',
        severity: 'error',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      leaveApi.reject(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-applications'] });
      handleCloseActionDialog();
      setSnackbar({
        open: true,
        message: 'Leave rejected successfully!',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to reject leave',
        severity: 'error',
      });
    },
  });

  const handleOpenActionDialog = (
    application: LeaveApplication,
    action: 'approve' | 'reject'
  ) => {
    setActionDialog({ open: true, application, action });
    setComments('');
  };

  const handleCloseActionDialog = () => {
    setActionDialog({ open: false, application: null, action: null });
    setComments('');
  };

  const handleSubmitAction = () => {
    if (!actionDialog.application) return;

    if (actionDialog.action === 'approve') {
      approveMutation.mutate({
        id: actionDialog.application.id,
        comments: comments || undefined,
      });
    } else if (actionDialog.action === 'reject') {
      if (!comments.trim()) {
        setSnackbar({
          open: true,
          message: 'Comments are required when rejecting a leave application',
          severity: 'error',
        });
        return;
      }
      rejectMutation.mutate({ id: actionDialog.application.id, comments });
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
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Leave Approval
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Review and approve/reject leave applications
      </Typography>

      <Card elevation={2}>
        <CardContent>
          {pendingApplications && pendingApplications.length > 0 ? (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>Employee</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Employee ID</strong>
                    </TableCell>
                    <TableCell>
                      <strong>From Date</strong>
                    </TableCell>
                    <TableCell>
                      <strong>To Date</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Days</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Reason</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Applied On</strong>
                    </TableCell>
                    <TableCell align="center">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingApplications.map((application) => (
                    <TableRow key={application.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {application.user?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {application.user?.designation}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{application.user?.employeeId}</TableCell>
                      <TableCell>
                        {new Date(application.fromDate).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {new Date(application.toDate).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip label={application.totalDays} size="small" color="info" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {application.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(application.appliedAt).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Approve">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleOpenActionDialog(application, 'approve')}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenActionDialog(application, 'reject')}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No pending leave applications</Alert>
          )}
        </CardContent>
      </Card>

      {/* Approve/Reject Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.application && (
            <Box>
              <Box mb={2} p={2} bgcolor="grey.100" borderRadius={2}>
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Employee:</strong> {actionDialog.application.user?.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Duration:</strong>{' '}
                  {new Date(actionDialog.application.fromDate).toLocaleDateString('en-IN')} to{' '}
                  {new Date(actionDialog.application.toDate).toLocaleDateString('en-IN')} (
                  {actionDialog.application.totalDays} days)
                </Typography>
                <Typography variant="body2">
                  <strong>Reason:</strong> {actionDialog.application.reason}
                </Typography>
              </Box>

              <TextField
                label={actionDialog.action === 'reject' ? 'Comments (Required)' : 'Comments (Optional)'}
                multiline
                rows={4}
                fullWidth
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                margin="normal"
                required={actionDialog.action === 'reject'}
                helperText={
                  actionDialog.action === 'reject'
                    ? 'Please provide a reason for rejection'
                    : 'Optional comments for the employee'
                }
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseActionDialog}>Cancel</Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            color={actionDialog.action === 'approve' ? 'success' : 'error'}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            {approveMutation.isPending || rejectMutation.isPending
              ? 'Processing...'
              : actionDialog.action === 'approve'
              ? 'Approve'
              : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeaveApproval;
