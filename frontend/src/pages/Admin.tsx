import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Grid, Alert, Button } from '@mui/material';
import { usersApi } from '../api/users';
import AdminBiometricCard from '../components/admin/AdminBiometricCard';
import AdminPayrollCard from '../components/admin/AdminPayrollCard';
import { useSnackbar } from '../contexts/SnackbarContext';
import { getApiErrorMessage } from '../hooks/apiMessages';
import PageLoading from '../components/PageLoading';

const Admin: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    if (severity === 'success') showSuccess(message);
    else showError(message);
  };

  const {
    data: users,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  if (isLoading) return <PageLoading />;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Admin Panel
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Administrative tools and settings
      </Typography>

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
          {getApiErrorMessage(error, 'Failed to load users. Please try again.')}
        </Alert>
      )}

      {!isError && (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <AdminBiometricCard onMessage={showSnackbar} section="upload" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AdminPayrollCard users={users} onMessage={showSnackbar} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AdminBiometricCard onMessage={showSnackbar} section="sync" />
        </Grid>
      </Grid>
      )}
    </Box>
  );
};

export default Admin;
