import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Block, CheckCircle } from '@mui/icons-material';
import { usersApi } from '../api/users';
import { User, Role, UserStatus } from '../types';
import { useSnackbar } from '../contexts/SnackbarContext';
import { getApiErrorMessage } from '../hooks/apiMessages';
import PageLoading from '../components/PageLoading';

const Users: React.FC = () => {
  const { showSuccess, showError } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    mode: 'activate' | 'deactivate' | null;
    user: User | null;
    hasLeft: boolean;
    leavingDate: string;
  }>({ open: false, mode: null, user: null, hasLeft: true, leavingDate: '' });
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employeeId: '',
    employeeNumber: '',
    name: '',
    email: '',
    password: '',
    designation: 'Annotator',
    role: Role.EMPLOYEE,
    dateOfJoining: '',
    dateOfLeaving: '',
    baseSalary: '22000',
  });

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['users', paginationModel.page, paginationModel.pageSize],
    queryFn: () =>
      usersApi.getPage({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const users = data?.data ?? [];
  const totalUsers = data?.meta?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
      showSuccess('User created successfully!');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to create user'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
      showSuccess('User updated successfully!');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to update user'));
    },
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showSuccess('User activated successfully!');
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to activate user'));
    },
  });

  const handleClose = () => {
    setOpen(false);
    setEditUser(null);
    setFormData({
      employeeId: '',
      employeeNumber: '',
      name: '',
      email: '',
      password: '',
      designation: 'Annotator',
      role: Role.EMPLOYEE,
      dateOfJoining: '',
      dateOfLeaving: '',
      baseSalary: '22000',
    });
  };

  const handleOpen = (user?: User) => {
    if (user) {
      setEditUser(user);
      setFormData({
        employeeId: user.employeeId,
        employeeNumber: user.employeeNumber.toString(),
        name: user.name,
        email: user.email,
        password: '',
        designation: user.designation,
        role: user.role,
        dateOfJoining: user.dateOfJoining.split('T')[0],
        dateOfLeaving: user.dateOfLeaving ? user.dateOfLeaving.split('T')[0] : '',
        baseSalary: user.baseSalary.toString(),
      });
    } else {
      // Autofill next employee number and ID when creating a new user
      const maxEmpNumber =
        users && users.length > 0
          ? users.reduce((max: number, u: User) => Math.max(max, u.employeeNumber), 0)
          : 0;
      const nextEmpNumber = maxEmpNumber + 1;
      const nextEmpId = `CITSEED${nextEmpNumber}`;

      setEditUser(null);
      setFormData({
        employeeId: nextEmpId,
        employeeNumber: nextEmpNumber.toString(),
        name: '',
        email: '',
        password: '',
        designation: 'Annotator',
        role: Role.EMPLOYEE,
        dateOfJoining: '',
        dateOfLeaving: '',
        baseSalary: '22000',
      });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    const salary = parseFloat(formData.baseSalary);
    if (!formData.name.trim()) {
      showError('Name is required');
      return;
    }
    if (isNaN(salary) || salary <= 0) {
      showError('Please enter a valid base salary');
      return;
    }
    if (editUser) {
      updateMutation.mutate({
        id: editUser.id,
        data: {
          name: formData.name,
          designation: formData.designation,
          role: formData.role,
          baseSalary: salary,
          dateOfLeaving: formData.dateOfLeaving || undefined,
        },
      });
    } else {
      if (!formData.email.trim()) {
        showError('Email is required');
        return;
      }
      if (!formData.password.trim()) {
        showError('Password is required');
        return;
      }
      if (!formData.dateOfJoining) {
        showError('Date of joining is required');
        return;
      }
      const empNum = parseInt(formData.employeeNumber, 10);
      if (!Number.isFinite(empNum) || empNum <= 0) {
        showError('Please enter a valid employee number');
        return;
      }
      createMutation.mutate({
        employeeId: formData.employeeId,
        employeeNumber: empNum,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        designation: formData.designation,
        role: formData.role,
        dateOfJoining: formData.dateOfJoining,
        baseSalary: salary,
      });
    }
  };

  const handleConfirmClose = () => {
    setConfirmDialog({ open: false, mode: null, user: null, hasLeft: true, leavingDate: '' });
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.user || !confirmDialog.mode) return;
    if (confirmDialog.mode === 'deactivate') {
      if (confirmDialog.hasLeft && !confirmDialog.leavingDate) {
        showError('Please select the date of leaving.');
        return;
      }

      updateMutation.mutate({
        id: confirmDialog.user.id,
        data: {
          status: UserStatus.INACTIVE,
          dateOfLeaving: confirmDialog.hasLeft ? confirmDialog.leavingDate : undefined,
        },
      });
      handleConfirmClose();
    } else {
      activateMutation.mutate(confirmDialog.user.id);
      handleConfirmClose();
    }
  };

  const columns: GridColDef[] = [
    { field: 'employeeNumber', headerName: 'Emp No', width: 90 },
    { field: 'employeeId', headerName: 'Employee ID', width: 130 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'designation', headerName: 'Designation', width: 130 },
    {
      field: 'role',
      headerName: 'Role',
      width: 130,
      renderCell: (params) => (
        <Chip label={(params.value as string | undefined)?.replace('_', ' ') ?? ''} color="primary" size="small" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => {
        const isActive = params.value === UserStatus.ACTIVE;
        const hasLeft = !!params.row.dateOfLeaving;
        const label = isActive ? 'Active' : hasLeft ? 'Left Organization' : 'Inactive';
        const color = isActive ? 'success' : hasLeft ? 'error' : 'default';
        return <Chip label={label} color={color} size="small" />;
      },
    },
    {
      field: 'baseSalary',
      headerName: 'Base Salary',
      width: 120,
      renderCell: (params) => `₹${Number(params.value).toLocaleString()}`,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Edit user">
            <IconButton size="small" color="primary" onClick={() => handleOpen(params.row)} aria-label="Edit user">
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === UserStatus.ACTIVE ? (
            <Tooltip title="Deactivate user">
              <IconButton
                size="small"
                color="error"
                aria-label="Deactivate user"
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    mode: 'deactivate',
                    user: params.row as User,
                    hasLeft: true,
                    leavingDate: (params.row as User).dateOfLeaving
                      ? (params.row as User).dateOfLeaving!.split('T')[0]
                      : '',
                  })
                }
              >
                <Block fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Activate user">
              <IconButton
                size="small"
                color="success"
                aria-label="Activate user"
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    mode: 'activate',
                    user: params.row as User,
                    hasLeft: false,
                    leavingDate: (params.row as User).dateOfLeaving
                      ? (params.row as User).dateOfLeaving!.split('T')[0]
                      : '',
                  })
                }
              >
                <CheckCircle fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      field: 'dateOfJoining',
      headerName: 'Date of Joining',
      width: 140,
      renderCell: (params) =>
        params.value
          ? new Date(params.value as string).toLocaleDateString('en-IN')
          : '-',
    },
    {
      field: 'dateOfLeaving',
      headerName: 'Date of Leaving',
      width: 140,
      renderCell: (params) =>
        params.value
          ? new Date(params.value as string).toLocaleDateString('en-IN')
          : '-',
    },
  ];

  if (isLoading) return <PageLoading />;

  if (isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Typography color="error">Failed to load users. Please try again.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage employees and their details
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          Add User
        </Button>
      </Box>

      <Card elevation={2}>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={users || []}
              columns={columns}
              pageSizeOptions={[10, 25, 50]}
              paginationMode="server"
              rowCount={totalUsers}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Employee ID"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                disabled={!!editUser}
                required
              />
              <TextField
                label="Employee Number"
                type="number"
                value={formData.employeeNumber}
                onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                disabled={!!editUser}
                required
              />
              <TextField
                label="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                fullWidth
                sx={{ gridColumn: '1 / -1' }}
              />
              <TextField
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editUser}
                required
              />
              {!editUser && (
                <TextField
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              )}
              <TextField
                label="Designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  label="Role"
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                >
                  <MenuItem value={Role.EMPLOYEE}>Employee</MenuItem>
                  <MenuItem value={Role.LAB_ADMIN}>Lab Admin</MenuItem>
                  <MenuItem value={Role.SUPER_ADMIN}>Super Admin</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Date of Joining"
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                disabled={!!editUser}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Date of Leaving"
                type="date"
                value={formData.dateOfLeaving}
                onChange={(e) => setFormData({ ...formData, dateOfLeaving: e.target.value })}
                InputLabelProps={{ shrink: true }}
                disabled={!editUser}
                helperText={
                  editUser && editUser.status === UserStatus.INACTIVE
                    ? 'Set when the employee has left the organization'
                    : 'Optional'
                }
              />
              <TextField
                label="Base Salary"
                type="number"
                value={formData.baseSalary}
                onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : editUser
              ? 'Update'
              : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {confirmDialog.mode === 'deactivate' ? 'Deactivate User' : 'Activate User'}
        </DialogTitle>
        <DialogContent>
          {confirmDialog.user && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom>
                {confirmDialog.mode === 'deactivate'
                  ? `Do you want to mark ${confirmDialog.user.name} as having left the organization, or just deactivate them temporarily?`
                  : `Are you sure you want to activate ${confirmDialog.user.name}? They will regain access to the system.`}
              </Typography>
              {confirmDialog.mode === 'deactivate' && (
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Button
                      variant={confirmDialog.hasLeft ? 'contained' : 'outlined'}
                      size="small"
                      color="error"
                      onClick={() =>
                        setConfirmDialog((prev) => ({
                          ...prev,
                          hasLeft: true,
                        }))
                      }
                      sx={{ mr: 1 }}
                    >
                      Left organization
                    </Button>
                    <Button
                      variant={!confirmDialog.hasLeft ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() =>
                        setConfirmDialog((prev) => ({
                          ...prev,
                          hasLeft: false,
                          leavingDate: '',
                        }))
                      }
                    >
                      Temporarily inactive
                    </Button>
                  </Box>
                  {confirmDialog.hasLeft && (
                    <TextField
                      label="Date of Leaving"
                      type="date"
                      value={confirmDialog.leavingDate}
                      onChange={(e) =>
                        setConfirmDialog((prev) => ({
                          ...prev,
                          leavingDate: e.target.value,
                        }))
                      }
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmClose}>Cancel</Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={confirmDialog.mode === 'deactivate' ? 'error' : 'success'}
            disabled={updateMutation.isPending || activateMutation.isPending}
          >
            {confirmDialog.mode === 'deactivate' ? 'Deactivate' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Users;
