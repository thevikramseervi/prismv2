import api from './axios';
import { LeaveApplication, LeaveBalance } from '../types';

export const leaveApi = {
  apply: async (leaveData: {
    fromDate: string;
    toDate: string;
    reason: string;
  }): Promise<LeaveApplication> => {
    const { data } = await api.post<LeaveApplication>('/leave/apply', leaveData);
    return data;
  },

  getMyApplications: async (): Promise<LeaveApplication[]> => {
    const { data } = await api.get<LeaveApplication[]>('/leave/my-applications');
    return data;
  },

  getBalance: async (): Promise<LeaveBalance> => {
    const { data } = await api.get<LeaveBalance>('/leave/balance');
    return data;
  },

  getPending: async (): Promise<LeaveApplication[]> => {
    const { data } = await api.get<LeaveApplication[]>('/leave/pending');
    return data;
  },

  approve: async (id: string, comments?: string): Promise<LeaveApplication> => {
    const { data } = await api.patch<LeaveApplication>(`/leave/${id}/approve`, { comments });
    return data;
  },

  reject: async (id: string, comments: string): Promise<LeaveApplication> => {
    const { data } = await api.patch<LeaveApplication>(`/leave/${id}/reject`, { comments });
    return data;
  },

  cancel: async (id: string): Promise<void> => {
    await api.delete(`/leave/${id}`);
  },
};
