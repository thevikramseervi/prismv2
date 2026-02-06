import api from './axios';
import { Attendance, DashboardStats } from '../types';

export const attendanceApi = {
  getMyAttendance: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Attendance[]> => {
    const { data } = await api.get<Attendance[]>('/attendance/my-attendance', { params });
    return data;
  },

  getMonthlyAttendance: async (year: number, month: number): Promise<any> => {
    const { data } = await api.get(`/attendance/monthly/${year}/${month}`);
    return data;
  },

  getDashboard: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/attendance/dashboard');
    return data;
  },

  getAll: async (params?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Attendance[]> => {
    const { data} = await api.get<Attendance[]>('/attendance', { params });
    return data;
  },

  createManual: async (attendanceData: {
    userId: string;
    date: string;
    status: string;
  }): Promise<Attendance> => {
    const { data } = await api.post<Attendance>('/attendance/manual', attendanceData);
    return data;
  },

  update: async (id: string, updateData: { status: string }): Promise<Attendance> => {
    const { data } = await api.patch<Attendance>(`/attendance/${id}`, updateData);
    return data;
  },
};
