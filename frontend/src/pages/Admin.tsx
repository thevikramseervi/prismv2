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
  Alert,
  Snackbar,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
} from '@mui/material';
import { MonetizationOn, Sync } from '@mui/icons-material';
import { payrollApi } from '../api/payroll';
import { usersApi } from '../api/users';
import api from '../api/axios';

const Admin: React.FC = () => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const queryClient = useQueryClient();

  // Payroll Generation State
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Biometric Sync State
  const [syncDate, setSyncDate] = useState(
    new Date(Date.now() - 86400000).toISOString().split('T')[0]
  ); // Yesterday

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const generatePayrollMutation = useMutation({
    mutationFn: (data: { year: number; month: number; userId?: string }) =>
      payrollApi.generate(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      if (result.success !== undefined) {
        setSnackbar({
          open: true,
          message: `Payroll generated! Success: ${result.success}, Failed: ${result.failed}`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Payroll generated successfully!',
          severity: 'success',
        });
      }
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to generate payroll',
        severity: 'error',
      });
    },
  });

  const syncBiometricMutation = useMutation({
    mutationFn: (date: string) => api.post(`/biometric/sync?date=${date}`),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setSnackbar({
        open: true,
        message: `Biometric sync completed! Processed: ${result.data.processed || 0}`,
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to sync biometric data',
        severity: 'error',
      });
    },
  });

  const handleGeneratePayroll = () => {
    const data: any = { year: payrollYear, month: payrollMonth };
    if (selectedUserId) {
      data.userId = selectedUserId;
    }
    generatePayrollMutation.mutate(data);
  };

  const handleSyncBiometric = () => {
    syncBiometricMutation.mutate(syncDate);
  };

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Admin Panel
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Administrative tools and settings
      </Typography>

      <Grid container spacing={3}>
        {/* Payroll Generation */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <MonetizationOn sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Generate Payroll
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate salary slips for employees
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <FormControl fullWidth margin="normal">
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

              <FormControl fullWidth margin="normal">
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

              <FormControl fullWidth margin="normal">
                <InputLabel>Employee (Optional)</InputLabel>
                <Select
                  value={selectedUserId}
                  label="Employee (Optional)"
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Employees</em>
                  </MenuItem>
                  {users &&
                    users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.name} ({user.employeeId})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <Button
                fullWidth
                variant="contained"
                color="success"
                size="large"
                startIcon={<MonetizationOn />}
                onClick={handleGeneratePayroll}
                disabled={generatePayrollMutation.isPending}
                sx={{ mt: 2 }}
              >
                {generatePayrollMutation.isPending
                  ? 'Generating...'
                  : selectedUserId
                  ? 'Generate for Selected Employee'
                  : 'Generate for All Employees'}
              </Button>

              <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: 'info.50', border: 1, borderColor: 'info.200' }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Note:</strong> Generating payroll will create salary slips based on
                  attendance records. If payroll already exists for this month/employee, the
                  operation will be skipped.
                </Typography>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        {/* Biometric Sync */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Sync sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Biometric Sync
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manually sync biometric data to attendance
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                label="Sync Date"
                type="date"
                value={syncDate}
                onChange={(e) => setSyncDate(e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                helperText="Select the date for which to sync biometric data"
              />

              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                startIcon={<Sync />}
                onClick={handleSyncBiometric}
                disabled={syncBiometricMutation.isPending}
                sx={{ mt: 2 }}
              >
                {syncBiometricMutation.isPending ? 'Syncing...' : 'Sync Biometric Data'}
              </Button>

              <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: 'warning.50', border: 1, borderColor: 'warning.200' }}>
                <Typography variant="caption" color="text.secondary">
                  <strong>How it works:</strong> The system will process unprocessed biometric
                  logs for the selected date and create/update attendance records. Attendance
                  status will be automatically determined based on total hours worked.
                </Typography>
              </Paper>

              <Box mt={3}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Attendance Rules:
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • ≥8 hours = Present
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • 4-8 hours = Half Day
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • &lt;4 hours = Absent (LOP)
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  • Weekends & holidays are automatically marked
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

export default Admin;
