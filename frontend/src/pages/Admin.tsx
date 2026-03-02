import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Grid, Alert, Snackbar } from '@mui/material';
import { usersApi } from '../api/users';
import AdminSecurity2faCard from '../components/admin/AdminSecurity2faCard';
import AdminBiometricCard from '../components/admin/AdminBiometricCard';
import AdminPayrollCard from '../components/admin/AdminPayrollCard';

const Admin: React.FC = () => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Admin Panel
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Administrative tools and settings
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <AdminSecurity2faCard onMessage={showSnackbar} />
        </Grid>
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

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Admin;
