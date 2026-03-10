import React from 'react';
import { Box, Card, CardContent, Typography, Divider, Grid, CircularProgress, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { authApi, type MeResponse } from '../api/auth';

const formatDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
};

const Profile: React.FC = () => {
  const { data: me, isLoading, error } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: authApi.me,
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !me) {
    return (
      <Box>
        <Alert severity="error">Unable to load profile. Please try signing in again.</Alert>
      </Box>
    );
  }

  const employmentStatus = me.status ?? 'ACTIVE';

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        My Profile
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Your account and employment details.
      </Typography>

      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Personal Information
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
              rowGap: 1,
              columnGap: 3,
              fontSize: '0.95rem',
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Full Name
            </Typography>
            <Typography variant="body1">{me.name}</Typography>

            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1">{me.email}</Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Employment Details
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
              rowGap: 1,
              columnGap: 3,
              fontSize: '0.95rem',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Employee ID
            </Typography>
            <Typography variant="body1">{me.employeeId}</Typography>

            <Typography variant="body2" color="text.secondary">
              Employee Number
            </Typography>
            <Typography variant="body1">
              {me.employeeNumber !== undefined ? me.employeeNumber : '—'}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Role
            </Typography>
            <Typography variant="body1">{me.role.replace('_', ' ')}</Typography>

            <Typography variant="body2" color="text.secondary">
              Designation
            </Typography>
            <Typography variant="body1">{me.designation}</Typography>

            <Typography variant="body2" color="text.secondary">
              Date of Joining
            </Typography>
            <Typography variant="body1">{formatDate(me.dateOfJoining)}</Typography>

            <Typography variant="body2" color="text.secondary">
              Employment Status
            </Typography>
            <Typography variant="body1">{employmentStatus}</Typography>

            <Typography variant="body2" color="text.secondary">
              Base Salary
            </Typography>
            <Typography variant="body1">
              {me.baseSalary !== undefined
                ? `₹${Number(me.baseSalary).toLocaleString()}`
                : '—'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Profile;

