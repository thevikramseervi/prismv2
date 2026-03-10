import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Add, Delete, Save, Download } from '@mui/icons-material';
import ExcelJS from 'exceljs';
import { activityApi, type CreateActivityPayload } from '../api/activity';
import { usersApi } from '../api/users';
import { ActivityEntry, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

type EditableRow = {
  id?: string;
  date: string;
  userId: string;
  userName: string;
  employeeId: string;
  userStatus?: string;
  userType: string;
  project: string;
  task: string;
  subTask?: string;
  unit: string;
  nos: string;
  percentage: string;
  productivity: string;
  weightage: string;
  isNew?: boolean;
};

const toRow = (entry: ActivityEntry, fallbackUser?: { name: string; employeeId: string; status?: string }): EditableRow => {
  const user = entry.user ?? fallbackUser;
  return {
    id: entry.id,
    date: entry.date.split('T')[0],
    userId: entry.userId,
    userName: user?.name ?? '',
    employeeId: user?.employeeId ?? '',
    userStatus: user?.status,
    userType: entry.userType,
    project: entry.project,
    task: entry.task,
    subTask: entry.subTask,
    unit: entry.unit,
    nos: String(entry.nos ?? ''),
    percentage: String(entry.percentage ?? ''),
    productivity: String(entry.productivity ?? ''),
    weightage: String(entry.weightage ?? ''),
  };
};

const ActivityReport: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === Role.LAB_ADMIN || user?.role === Role.SUPER_ADMIN;

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id ?? '');
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: users } = useQuery({
    queryKey: ['users-for-activity'],
    queryFn: () => usersApi.getAll(),
    enabled: isAdmin,
  });

  const activitiesQuery = useQuery({
    queryKey: ['activities', isAdmin ? 'admin' : 'me', selectedUserId, selectedDate],
    queryFn: async () => {
      if (isAdmin) {
        if (!selectedUserId) return [];
        return activityApi.getReport({
          userId: selectedUserId,
          startDate: selectedDate,
          endDate: selectedDate,
        });
      }
      return activityApi.getMy({ date: selectedDate });
    },
    enabled: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateActivityPayload) => activityApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setMessage({ type: 'success', text: 'Activity saved successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      setMessage({
        type: 'error',
        text: err?.response?.data?.message ?? 'Failed to save activity',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Partial<CreateActivityPayload> }) =>
      activityApi.update(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setMessage({ type: 'success', text: 'Activity updated successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      setMessage({
        type: 'error',
        text: err?.response?.data?.message ?? 'Failed to update activity',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activityApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setMessage({ type: 'success', text: 'Activity deleted successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      setMessage({
        type: 'error',
        text: err?.response?.data?.message ?? 'Failed to delete activity',
      });
    },
  });

  const isBusy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleLoad = async () => {
    setMessage(null);
    const data = await activitiesQuery.refetch();
    const list = data.data ?? [];

    const currentUserInfo = user
      ? {
          name: user.name,
          employeeId: user.employeeId,
        }
      : undefined;

    const selectedUser = users?.find((u) => u.id === selectedUserId);
    const fallbackUser = selectedUser
      ? { name: selectedUser.name, employeeId: selectedUser.employeeId, status: selectedUser.status }
      : currentUserInfo;

    setRows(list.map((a) => toRow(a, fallbackUser)));
  };

  const ensureContextUser = () => {
    if (isAdmin) {
      const userForRow = users?.find((u) => u.id === selectedUserId);
      if (!userForRow) {
        throw new Error('Please select an employee before adding rows');
      }
      return userForRow;
    }
    if (!user) {
      throw new Error('User context not available');
    }
    return {
      id: user.id,
      name: user.name,
      employeeId: user.employeeId,
      status: undefined as string | undefined,
    };
  };

  const handleAddRow = () => {
    try {
      const ctxUser = ensureContextUser();
      const defaultUserId = isAdmin ? selectedUserId : user!.id;

      const newRow: EditableRow = {
        date: selectedDate,
        userId: defaultUserId,
        userName: ctxUser.name,
        employeeId: ctxUser.employeeId,
        userStatus: ctxUser.status,
        userType: 'SEED',
        project: '',
        task: '',
        subTask: '',
        unit: '',
        nos: '',
        percentage: '',
        productivity: '',
        weightage: '',
        isNew: true,
      };

      setRows((prev) => [...prev, newRow]);
      setMessage(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage({
        type: 'error',
        text: error.message ?? 'Unable to add row',
      });
    }
  };

  const updateRowField = (index: number, field: keyof EditableRow, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveRow = async (row: EditableRow, index: number) => {
    const payload: CreateActivityPayload = {
      userId: isAdmin ? row.userId : undefined,
      date: row.date,
      userType: row.userType || 'SEED',
      project: row.project,
      task: row.task,
      subTask: row.subTask,
      unit: row.unit,
      nos: Number(row.nos || 0),
      percentage: Number(row.percentage || 0),
      productivity: Number(row.productivity || 0),
      weightage: Number(row.weightage || 0),
    };

    if (!row.project || !row.task || !row.unit) {
      setMessage({ type: 'error', text: 'Project, Task and Unit are required' });
      return;
    }

    if (row.id) {
      await updateMutation.mutateAsync({ id: row.id, payload });
    } else {
      const created = await createMutation.mutateAsync(payload);
      setRows((prev) => {
        const copy = [...prev];
        copy[index] = toRow(created, {
          name: row.userName,
          employeeId: row.employeeId,
          status: row.userStatus,
        });
        return copy;
      });
    }

    await activitiesQuery.refetch();
  };

  const handleDeleteRow = async (row: EditableRow, index: number) => {
    if (row.id) {
      await deleteMutation.mutateAsync(row.id);
      await activitiesQuery.refetch();
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const currentUserLabel = useMemo(() => {
    if (!user) return '';
    return `${user.name} (${user.employeeId})`;
  }, [user]);

  const handleExportExcel = async () => {
    if (rows.length === 0) {
      setMessage({ type: 'error', text: 'No activity rows to export for this date' });
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Activity');

      worksheet.addRow([
        'Date',
        'Student Name',
        'User Type',
        'User Status',
        'Project',
        'Task',
        'Sub Task',
        'Unit',
        'Nos',
        'Percentage',
        'Productivity',
        'Weightage',
      ]);

      rows.forEach((row) => {
        worksheet.addRow([
          row.date,
          row.employeeId ? `${row.userName} - ${row.employeeId}` : row.userName,
          row.userType,
          row.userStatus ?? '',
          row.project,
          row.task,
          row.subTask ?? '',
          row.unit,
          Number(row.nos || 0),
          Number(row.percentage || 0),
          Number(row.productivity || 0),
          Number(row.weightage || 0),
        ]);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      const employeePart = isAdmin
        ? rows[0]?.employeeId || 'Employee'
        : user?.employeeId || 'Me';

      link.href = url;
      link.download = `Activity_Report_${selectedDate}_${employeePart}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage({ type: 'error', text: 'Failed to export activity report to Excel' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Activity Report"
        subtitle="Enter and review daily activities in a format similar to the Excel report."
      />
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} mb={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              {isAdmin ? (
                <FormControl fullWidth>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={selectedUserId}
                    label="Employee"
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setRows([]);
                    }}
                  >
                    <MenuItem value="">
                      <em>Select employee</em>
                    </MenuItem>
                    {users?.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name} ({u.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  fullWidth
                  label="Employee"
                  value={currentUserLabel}
                  InputProps={{ readOnly: true }}
                />
              )}
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleLoad}
                disabled={activitiesQuery.isFetching}
                sx={{ height: '56px' }}
              >
                {activitiesQuery.isFetching ? <CircularProgress size={24} /> : 'Load Activities'}
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleAddRow}
                disabled={isBusy || (isAdmin && !selectedUserId)}
                startIcon={<Add />}
                sx={{ height: '56px' }}
              >
                Add Row
              </Button>
            </Grid>
          </Grid>

          {message && (
            <Box mb={2}>
              <Alert severity={message.type} onClose={() => setMessage(null)}>
                {message.text}
              </Alert>
            </Box>
          )}

          <Box
            mb={2}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">Activity rows</Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportExcel}
              disabled={rows.length === 0}
            >
              Export to Excel
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date</strong></TableCell>
                  <TableCell><strong>Student Name</strong></TableCell>
                  <TableCell><strong>User Type</strong></TableCell>
                  <TableCell><strong>User Status</strong></TableCell>
                  <TableCell><strong>Project</strong></TableCell>
                  <TableCell><strong>Task</strong></TableCell>
                  <TableCell><strong>Sub Task</strong></TableCell>
                  <TableCell><strong>Unit</strong></TableCell>
                  <TableCell align="right"><strong>Nos</strong></TableCell>
                  <TableCell align="right"><strong>%</strong></TableCell>
                  <TableCell align="right"><strong>Productivity</strong></TableCell>
                  <TableCell align="right"><strong>Weightage</strong></TableCell>
                  <TableCell align="center"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} align="center">
                      No activity rows for this date. Click &quot;Add Row&quot; to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={row.id ?? index}>
                      <TableCell>
                        <TextField
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRowField(index, 'date', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={row.userName}
                          size="small"
                          InputProps={{ readOnly: !isAdmin }}
                          onChange={(e) => updateRowField(index, 'userName', e.target.value)}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {row.employeeId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={row.userType}
                          onChange={(e) => updateRowField(index, 'userType', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {row.userStatus ? (
                          <Chip label={row.userStatus} size="small" />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={row.project}
                          onChange={(e) => updateRowField(index, 'project', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={row.task}
                          onChange={(e) => updateRowField(index, 'task', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={row.subTask ?? ''}
                          onChange={(e) => updateRowField(index, 'subTask', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={row.unit}
                          onChange={(e) => updateRowField(index, 'unit', e.target.value)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          value={row.nos}
                          onChange={(e) => updateRowField(index, 'nos', e.target.value)}
                          size="small"
                          type="number"
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          value={row.percentage}
                          onChange={(e) => updateRowField(index, 'percentage', e.target.value)}
                          size="small"
                          type="number"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          value={row.productivity}
                          onChange={(e) => updateRowField(index, 'productivity', e.target.value)}
                          size="small"
                          type="number"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          value={row.weightage}
                          onChange={(e) => updateRowField(index, 'weightage', e.target.value)}
                          size="small"
                          type="number"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          aria-label="save"
                          color="primary"
                          onClick={() => handleSaveRow(row, index)}
                          disabled={isBusy}
                          size="small"
                        >
                          <Save fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="delete"
                          color="error"
                          onClick={() => handleDeleteRow(row, index)}
                          disabled={isBusy}
                          size="small"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ActivityReport;

