import React, { useRef } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  TextField,
  Divider,
  Paper,
} from '@mui/material';
import { CloudUpload, Sync } from '@mui/icons-material';
import { useApiMutation } from '../../hooks';
import api from '../../api/axios';

export interface AdminBiometricCardProps {
  onMessage: (message: string, severity: 'success' | 'error') => void;
  /** 'upload' | 'sync' | 'both' — which card(s) to render. Default 'both'. */
  section?: 'upload' | 'sync' | 'both';
}

const AdminBiometricCard: React.FC<AdminBiometricCardProps> = ({ onMessage, section = 'both' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncDate, setSyncDate] = React.useState(
    () => new Date(Date.now() - 86400000).toISOString().split('T')[0]
  );

  const syncBiometricMutation = useApiMutation({
    mutationFn: (date: string) => api.post<{ processed?: number }>(`/biometric/sync?date=${date}`),
    successMessage: (res: { data?: { processed?: number } }) =>
      `Biometric sync completed! Processed: ${res.data?.processed ?? 0}`,
    errorMessage: 'Failed to sync biometric data',
    invalidateKeys: [['attendance']],
    onMessage,
  });

  const uploadBiometricMutation = useApiMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/biometric/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    successMessage: (data: { logsCreated?: number; datesProcessed?: unknown[] }) =>
      `Import complete: ${data.logsCreated ?? 0} logs created, ${data.datesProcessed?.length ?? 0} dates synced`,
    errorMessage: 'Failed to upload biometric file',
    invalidateKeys: [['attendance']],
    onMessage,
    onSuccess: () => {
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      onMessage('Only .xlsx files are supported. Convert .xls to .xlsx first.', 'error');
      return;
    }
    uploadBiometricMutation.mutate(file);
  };

  const showUpload = section === 'upload' || section === 'both';
  const showSync = section === 'sync' || section === 'both';

  return (
    <>
      {showUpload && (
      <Card elevation={2}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CloudUpload sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Upload Biometric File
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload Device Log Duration Report (.xlsx) from biometric device
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            component="label"
            startIcon={<CloudUpload />}
            disabled={uploadBiometricMutation.isPending}
            sx={{ mt: 1 }}
          >
            {uploadBiometricMutation.isPending ? 'Importing...' : 'Choose & Upload Biometric Excel'}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              hidden
            />
          </Button>

          <Paper elevation={0} sx={{ mt: 2, p: 2, bgcolor: 'success.50', border: 1, borderColor: 'success.200' }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Workflow:</strong> Download the Device Log Duration Report from your
              biometric device, convert to .xlsx if needed, then upload here. The system will
              import logs and auto-sync all dates to attendance.
            </Typography>
          </Paper>
        </CardContent>
      </Card>
      )}

      {showSync && (
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
            onClick={() => syncBiometricMutation.mutate(syncDate)}
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
      )}
    </>
  );
};

export default AdminBiometricCard;
