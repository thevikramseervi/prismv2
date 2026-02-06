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
  CircularProgress,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Add, Edit, Block, CheckCircle } from '@mui/icons-material';
import { usersApi } from '../api/users';
import { User, Role, UserStatus } from '../types';

const Users: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
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
    baseSalary: '22000',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
      setSnackbar({ open: true, message: 'User created successfully!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to create user', severity: 'error' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
      setSnackbar({ open: true, message: 'User updated successfully!', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.response?.data?.message || 'Failed to update user', severity: 'error' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: usersApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSnackbar({ open: true, message: 'User deactivated successfully!', severity: 'success' });
    },
  });

  const activateMutation = useMutation({
    mutationFn: usersApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSnackbar({ open: true, message: 'User activated successfully!', severity: 'success' });
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
        baseSalary: user.baseSalary.toString(),
      });
    }
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editUser) {
      updateMutation.mutate({
        id: editUser.id,
        data: {
          name: formData.name,
          designation: formData.designation,
          role: formData.role,
          baseSalary: parseFloat(formData.baseSalary),
        },
      });
    } else {
      createMutation.mutate({
        employeeId: formData.employeeId,
        employeeNumber: parseInt(formData.employeeNumber),
        name: formData.name,
        email: formData.email,
        password: formData.password,
        designation: formData.designation,
        role: formData.role,
        dateOfJoining: formData.dateOfJoining,
        baseSalary: parseFloat(formData.baseSalary),
      });
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
        <Chip label={params.value.replace('_', ' ')} color="primary" size="small" />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === UserStatus.ACTIVE ? 'success' : 'default'}
          size="small"
        />
      ),
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
          <IconButton size="small" color="primary" onClick={() => handleOpen(params.row)}>
            <Edit fontSize="small" />
          </IconButton>
          {params.row.status === UserStatus.ACTIVE ? (
            <IconButton
              size="small"
              color="error"
              onClick={() => deactivateMutation.mutate(params.row.id)}
            >
              <Block fontSize="small" />
            </IconButton>
          ) : (
            <IconButton
              size="small"
              color="success"
              onClick={() => activateMutation.mutate(params.row.id)}
            >
              <CheckCircle fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
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
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Users;
