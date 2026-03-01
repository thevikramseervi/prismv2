import api from './axios';

export type LoginResponse =
  | { access_token: string; user: AuthUser }
  | { requires2fa: true; twoFactorToken: string };

export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: string;
  designation: string;
}

export const authApi = {
  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  },

  verify2fa: async (params: {
    token: string;
    code: string;
  }): Promise<{ access_token: string; user: AuthUser }> => {
    const { data } = await api.post<{ access_token: string; user: AuthUser }>(
      '/auth/2fa/verify',
      params,
    );
    return data;
  },

  setup2fa: async (): Promise<{ otpauthUrl: string; secret: string }> => {
    const { data } = await api.post<{ otpauthUrl: string; secret: string }>(
      '/auth/2fa/setup',
    );
    return data;
  },

  enable2fa: async (code: string): Promise<void> => {
    await api.post('/auth/2fa/enable', { code });
  },

  disable2fa: async (): Promise<void> => {
    await api.post('/auth/2fa/disable');
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
