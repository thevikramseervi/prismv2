import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Alert,
} from '@mui/material';
import { notificationsApi } from '../api/notifications';
import { Notification } from '../types';

const Notifications: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const hasUnread = (notifications || []).some((n) => !n.readAt);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Notifications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Updates about your leave requests and other actions.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          disabled={!hasUnread || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
        >
          {markAllMutation.isPending ? 'Marking...' : 'Mark all as read'}
        </Button>
      </Box>

      {notifications && notifications.length > 0 ? (
        notifications.map((notification: Notification) => {
          const isUnread = !notification.readAt;
          return (
            <Card
              key={notification.id}
              elevation={2}
              sx={{ mb: 2, opacity: isUnread ? 1 : 0.7 }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" fontWeight={isUnread ? 'bold' : 'normal'}>
                    {notification.title}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {isUnread && <Chip label="New" color="primary" size="small" />}
                    <Typography variant="caption" color="text.secondary">
                      {new Date(notification.createdAt).toLocaleString('en-IN')}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  {notification.body}
                </Typography>
                {notification.type === 'LEAVE_REQUEST' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      if (!notification.readAt) {
                        markOneMutation.mutate(notification.id);
                      }
                      navigate('/leave-approval');
                    }}
                  >
                    Review leave requests
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card elevation={2}>
          <CardContent>
            <Alert severity="info">You have no notifications yet.</Alert>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Notifications;

