import React from 'react';
import { Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Box, Typography } from '@mui/material';

export interface DataTableShellProps {
  headers: React.ReactNode[];
  rows: React.ReactNode;
  /** When provided, 0 means show empty state. Otherwise we infer from rows when it's an array. */
  rowCount?: number;
  emptyMessage?: string;
  maxHeight?: number;
}

const DataTableShell: React.FC<DataTableShellProps> = ({
  headers,
  rows,
  rowCount,
  emptyMessage = 'No records found',
  maxHeight = 500,
}) => {
  const hasRows =
    rowCount !== undefined ? rowCount > 0 : (Array.isArray(rows) ? rows.length > 0 : true);

  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {headers.map((header, idx) => (
              <TableCell key={idx}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {hasRows ? (
            rows
          ) : (
            <TableRow>
              <TableCell colSpan={headers.length} align="center">
                <Box py={4}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default DataTableShell;

