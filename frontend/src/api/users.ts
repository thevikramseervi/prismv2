import api from './axios';
import { User } from '../types';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const { data } = await api.get('/users');
    // API returns paginated { data: [...], meta: {...} } or plain array
    return Array.isArray(data) ? data : data.data || [];
  },

  getById: async (id: string): Promise<User> => {
    const { data } = await api.get<User>(`/users/${id}`);
    return data;
  },

  create: async (userData: {
    employeeId: string;
    employeeNumber: number;
    name: string;
    email: string;
    password: string;
    designation?: string;
    role?: string;
    dateOfJoining: string;
    baseSalary?: number;
  }): Promise<User> => {
    const { data } = await api.post<User>('/users', userData);
    return data;
  },

  update: async (id: string, updateData: Partial<User>): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}`, updateData);
    return data;
  },

  deactivate: async (id: string): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}/deactivate`);
    return data;
  },

  activate: async (id: string): Promise<User> => {
    const { data } = await api.patch<User>(`/users/${id}/activate`);
    return data;
  },
};
