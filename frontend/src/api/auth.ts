import api from './axios';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<any> => {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  me: async (): Promise<any> => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  changePassword: async (body: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    await api.patch('/auth/me/password', body);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', {
      email,
    });
    return data;
  },

  resetPassword: async (body: {
    token: string;
    newPassword: string;
  }): Promise<void> => {
    await api.post('/auth/reset-password', body);
  },
};
