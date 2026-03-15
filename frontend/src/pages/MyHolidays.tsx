import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import { holidaysApi } from '../api/holidays';
import { type Holiday } from '../types';
import PageLoading from '../components/PageLoading';

const MyHolidays: React.FC = () => {
  const { data: holidays, isLoading, isError } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getAll(),
  });

  if (isLoading) return <PageLoading />;

  if (isError) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Alert severity="error">Failed to load holidays. Please try again later.</Alert>
        </CardContent>
      </Card>
    );
  }

  const sortedHolidays: Holiday[] = holidays
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
      <Box mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Holiday Calendar
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View all configured holidays for the lab.
        </Typography>
      </Box>

      {Object.keys(holidaysByYear).length === 0 ? (
        <Card elevation={2}>
          <CardContent>
            <Alert severity="info">No holidays have been configured yet.</Alert>
          </CardContent>
        </Card>
      ) : (
        Object.entries(holidaysByYear)
          // Show most recent year first (e.g. 2026 before 2025)
          .sort(([a], [b]) => parseInt(b, 10) - parseInt(a, 10))
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
                          <strong>Holiday</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Description</strong>
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
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          ))
      )}
    </Box>
  );
};

export default MyHolidays;

