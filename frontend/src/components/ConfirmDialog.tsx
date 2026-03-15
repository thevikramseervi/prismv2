import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'error' | 'success';
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'primary',
  onConfirm,
  onClose,
  loading = false,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="confirm-dialog-title">
    <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
    <DialogContent>
      {message != null && message !== '' ? (
        <Typography component="div">{message}</Typography>
      ) : null}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button onClick={onConfirm} color={confirmColor} variant="contained" disabled={loading}>
        {loading ? 'Processing...' : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
