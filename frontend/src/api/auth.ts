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
};
