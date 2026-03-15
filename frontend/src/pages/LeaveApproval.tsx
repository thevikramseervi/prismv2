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
  Chip,
  Alert,
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
import { CheckCircle, Cancel } from '@mui/icons-material';
import { leaveApi } from '../api/leave';
import { LeaveApplication, LeaveType } from '../types';
import { useSnackbar } from '../contexts/SnackbarContext';
import { getApiErrorMessage } from '../hooks/apiMessages';
import PageLoading from '../components/PageLoading';
import PageHeader from '../components/PageHeader';

const LeaveApproval: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    application: LeaveApplication | null;
    action: 'approve' | 'reject' | null;
  }>({ open: false, application: null, action: null });
  const [comments, setComments] = useState('');
  const queryClient = useQueryClient();

  const {
    data: pendingApplications,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['pending-leave-applications'],
    queryFn: () => leaveApi.getPending(),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      leaveApi.approve(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-applications'] });
      handleCloseActionDialog();
      showSuccess('Leave approved successfully!');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to approve leave'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments: string }) =>
      leaveApi.reject(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-leave-applications'] });
      handleCloseActionDialog();
      showSuccess('Leave rejected successfully!');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to reject leave'));
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
        showError('Comments are required when rejecting a leave application');
        return;
      }
      rejectMutation.mutate({ id: actionDialog.application.id, comments });
    }
  };

  if (isLoading) return <PageLoading />;

  return (
    <Box>
      <PageHeader
        title="Leave Approval"
        subtitle="Review and approve/reject leave applications"
      />

      {isError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {getApiErrorMessage(error, 'Failed to load leave applications. Please try again.')}
        </Alert>
      )}

      {!isError && (
      <Card elevation={2}>
        <CardContent>
          {pendingApplications && pendingApplications.length > 0 ? (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Type</strong>
                        </TableCell>
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
                            {application.leaveType === LeaveType.UNPAID_LEAVE
                              ? 'Unpaid'
                              : 'Casual'}
                          </TableCell>
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
                      <TableCell>{application.totalDays}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
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
                            aria-label="Approve leave"
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenActionDialog(application, 'reject')}
                            aria-label="Reject leave"
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
      )}

      {/* Approve/Reject Dialog */}
      <Dialog open={actionDialog.open} onClose={handleCloseActionDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.action === 'approve' ? 'Approve Leave' : 'Reject Leave'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.application && (
            <Box>
              <Box
                mb={2}
                p={2}
                borderRadius={2}
                sx={(theme) => ({
                  bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.100',
                  color: theme.palette.mode === 'dark' ? 'text.primary' : 'inherit',
                  border: '1px solid',
                  borderColor: 'divider',
                })}
              >
                <Typography variant="subtitle2" gutterBottom>
                  <strong>Employee:</strong> {actionDialog.application.user?.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Type:</strong>{' '}
                  {actionDialog.application.leaveType === LeaveType.UNPAID_LEAVE
                    ? 'Unpaid Leave (LOP)'
                    : 'Casual Leave (paid)'}
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
    </Box>
  );
};

export default LeaveApproval;
