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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Tooltip,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { holidaysApi } from '../api/holidays';
import { Holiday } from '../types';
import { useSnackbar } from '../contexts/SnackbarContext';
import { getApiErrorMessage } from '../hooks/apiMessages';
import PageLoading from '../components/PageLoading';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';

const Holidays: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; holiday: Holiday | null }>({
    open: false,
    holiday: null,
  });
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    date: '',
    name: '',
    description: '',
  });

  const {
    data: holidays,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      handleClose();
      showSuccess('Holiday added successfully!');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to add holiday'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Holiday> }) =>
      holidaysApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      handleClose();
      showSuccess('Holiday updated successfully!');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to update holiday'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: holidaysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showSuccess('Holiday deleted successfully!');
      setDeleteConfirm({ open: false, holiday: null });
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to delete holiday'));
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditHoliday(null);
    setFormData({ date: '', name: '', description: '' });
  };

  const handleOpen = (holiday?: Holiday) => {
    if (holiday) {
      setEditHoliday(holiday);
      setFormData({
        date: holiday.date.split('T')[0],
        name: holiday.name,
        description: holiday.description || '',
      });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.date?.trim()) {
      showError('Please select a date.');
      return;
    }
    if (!formData.name?.trim()) {
      showError('Holiday name is required.');
      return;
    }
    if (editHoliday) {
      updateMutation.mutate({
        id: editHoliday.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isFormValid = !!formData.date?.trim() && !!formData.name?.trim();

  const handleDeleteClick = (holiday: Holiday) => {
    setDeleteConfirm({ open: true, holiday });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.holiday) {
      deleteMutation.mutate(deleteConfirm.holiday.id);
      setDeleteConfirm({ open: false, holiday: null });
    }
  };

  const handleDeleteConfirmClose = () => {
    setDeleteConfirm({ open: false, holiday: null });
  };

  if (isLoading) return <PageLoading />;

  // Sort holidays by date
  const sortedHolidays = holidays
    ? [...holidays].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  // Group holidays by year
  const holidaysByYear = sortedHolidays.reduce((acc, holiday) => {
    const year = new Date(holiday.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(holiday);
    return acc;
  }, {} as Record<number, Holiday[]>);

  return (
    <Box>
      <PageHeader
        title="Holiday Calendar"
        subtitle="Manage company holidays"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
            Add Holiday
          </Button>
        }
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
          {getApiErrorMessage(error, 'Failed to load holidays. Please try again.')}
        </Alert>
      )}

      {!isError && (Object.keys(holidaysByYear).length === 0 ? (
        <Card elevation={2}>
          <CardContent>
            <Alert severity="info">No holidays configured yet</Alert>
          </CardContent>
        </Card>
      ) : (
        Object.entries(holidaysByYear)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([year, yearHolidays]) => (
            <Card key={year} elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {year} ({yearHolidays.length} holidays)
                </Typography>
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Date</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Day</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Holiday Name</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Description</strong>
                        </TableCell>
                        <TableCell align="center">
                          <strong>Actions</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {yearHolidays.map((holiday) => {
                        const date = new Date(holiday.date);
                        return (
                          <TableRow key={holiday.id} hover>
                            <TableCell>{date.toLocaleDateString('en-IN')}</TableCell>
                            <TableCell>
                              {date.toLocaleDateString('en-IN', { weekday: 'long' })}
                            </TableCell>
                            <TableCell>
                              <strong>{holiday.name}</strong>
                            </TableCell>
                            <TableCell>{holiday.description || '-'}</TableCell>
                            <TableCell align="center">
                              <Tooltip title={`Edit ${holiday.name}`}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpen(holiday)}
                                  aria-label={`Edit ${holiday.name}`}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={`Delete ${holiday.name}`}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteClick(holiday)}
                                  aria-label={`Delete ${holiday.name}`}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))
      ))}

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={handleDeleteConfirmClose}
        title="Delete holiday?"
        message={
          deleteConfirm.holiday ? (
            <>
              Are you sure you want to delete <strong>{deleteConfirm.holiday.name}</strong> (
              {new Date(deleteConfirm.holiday.date).toLocaleDateString('en-IN')})? This cannot be
              undone.
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
      />

      {/* Add/Edit Holiday Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editHoliday ? 'Edit Holiday' : 'Add New Holiday'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              label="Holiday Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              label="Description (Optional)"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isFormValid || createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : editHoliday
              ? 'Update'
              : 'Add Holiday'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Holidays;
