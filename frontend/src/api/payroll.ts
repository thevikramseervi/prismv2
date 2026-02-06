import api from './axios';
import { Payroll } from '../types';

export const payrollApi = {
  getMySalarySlips: async (): Promise<Payroll[]> => {
    const { data } = await api.get<Payroll[]>('/payroll/my-salary-slips');
    return data;
  },

  getAll: async (params?: {
    year?: number;
    month?: number;
    userId?: string;
  }): Promise<Payroll[]> => {
    const { data } = await api.get<Payroll[]>('/payroll', { params });
    return data;
  },

  getById: async (id: string): Promise<Payroll> => {
    const { data } = await api.get<Payroll>(`/payroll/${id}`);
    return data;
  },

  generate: async (generateData: {
    year: number;
    month: number;
    userId?: string;
  }): Promise<any> => {
    const { data } = await api.post('/payroll/generate', generateData);
    return data;
  },

  markAsPaid: async (id: string): Promise<Payroll> => {
    const { data } = await api.patch<Payroll>(`/payroll/${id}/mark-paid`);
    return data;
  },

  downloadPDF: async (id: string): Promise<void> => {
    const response = await api.get(`/payroll/${id}/download/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salary-slip-${id}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  downloadExcel: async (id: string): Promise<void> => {
    const response = await api.get(`/payroll/${id}/download/xlsx`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salary-slip-${id}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  },
};
