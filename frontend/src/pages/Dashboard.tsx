import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Chip,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Timelapse,
  BeachAccess,
  CalendarMonth,
} from '@mui/icons-material';
import { attendanceApi } from '../api/attendance';
import { leaveApi } from '../api/leave';
import { announcementsApi } from '../api/announcements';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => attendanceApi.getDashboard(),
  });

  const { data: leaveBalance, isLoading: leaveLoading } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: () => leaveApi.getBalance(),
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.getAll(),
  });

  if (statsLoading || leaveLoading || announcementsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Present Days',
      value: dashboardStats?.presentDays || 0,
      icon: <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success.light',
    },
    {
      title: 'Absent Days',
      value: dashboardStats?.absentDays || 0,
      icon: <Cancel sx={{ fontSize: 40, color: 'error.main' }} />,
      color: 'error.light',
    },
    {
      title: 'Half Days',
      value: dashboardStats?.halfDays || 0,
      icon: <Timelapse sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning.light',
    },
    {
      title: 'Casual Leaves',
      value: dashboardStats?.casualLeaves || 0,
      icon: <BeachAccess sx={{ fontSize: 40, color: 'info.main' }} />,
      color: 'info.light',
    },
  ];

  return (
    <Box>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your attendance this month
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Stats Cards */}
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" variant="body2" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {card.value}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      bgcolor: card.color,
                      p: 1.5,
                      borderRadius: 2,
                      opacity: 0.9,
                    }}
                  >
                    {card.icon}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Leave Balance Card */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Leave Balance
              </Typography>
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Total Leaves</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {leaveBalance?.totalLeaves || 12}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Used Leaves</Typography>
                  <Typography variant="body2" color="error.main" fontWeight="bold">
                    {leaveBalance?.usedLeaves || 0}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Pending</Typography>
                  <Typography variant="body2" color="warning.main" fontWeight="bold">
                    {leaveBalance?.pendingLeaves || 0}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" fontWeight="bold">
                    Available Leaves
                  </Typography>
                  <Typography variant="body2" color="success.main" fontWeight="bold">
                    {leaveBalance?.availableLeaves || 12}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Announcements */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Announcements
              </Typography>
              <Box mt={2}>
                {announcements && announcements.length > 0 ? (
                  announcements.slice(0, 5).map((announcement) => (
                    <Paper
                      key={announcement.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        mb: 1.5,
                        bgcolor: announcement.isRead ? 'grey.50' : 'primary.50',
                        border: 1,
                        borderColor: announcement.isRead ? 'grey.200' : 'primary.200',
                      }}
                    >
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
                          {announcement.title}
                        </Typography>
                        <Chip
                          label={announcement.priority}
                          size="small"
                          color={
                            announcement.priority === 'HIGH'
                              ? 'error'
                              : announcement.priority === 'MEDIUM'
                              ? 'warning'
                              : 'default'
                          }
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {announcement.content}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        By {announcement.creator.name} •{' '}
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </Typography>
                    </Paper>
                  ))
                ) : (
                  <Alert severity="info">No announcements available</Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
