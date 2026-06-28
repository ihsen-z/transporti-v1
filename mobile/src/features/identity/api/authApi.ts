import { apiClient } from '../../../core/api/client';
import { ApiResult } from '../../../core/api/types';
import { User } from '../../../core/auth/authStore';

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  access: string;
  refresh: string;
  user: User;
}

export const authApi = {
  login: async (email: string, password: string): Promise<ApiResult<LoginResponse>> => {
    try {
      const response = await apiClient.post<any>('/auth/login/', { email, password });
      const data = response.data;
      return {
        success: true,
        data: {
          user: data.user,
          access: data.tokens?.access,
          refresh: data.tokens?.refresh,
        },
      };
    } catch (error: any) {
      return { success: false, error: error };
    }
  },

  register: async (payload: {
    email: string;
    password: string;
    phone: string;
    name: string;
    role: 'CLIENT' | 'TRANSPORTER';
  }): Promise<ApiResult<RegisterResponse>> => {
    try {
      // Split name into first_name and last_name to satisfy backend requirements
      const nameParts = payload.name.trim().split(/\s+/);
      const first_name = nameParts[0] || 'Prénom';
      const last_name = nameParts.slice(1).join(' ') || 'Nom';

      const backendPayload = {
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
        password_confirm: payload.password, // Frontend already validates confirmation
        role: payload.role,
        first_name,
        last_name,
      };

      const response = await apiClient.post<any>('/auth/register/', backendPayload);
      const data = response.data;
      return {
        success: true,
        data: {
          user: data.user,
          access: data.tokens?.access,
          refresh: data.tokens?.refresh,
        },
      };
    } catch (error: any) {
      return { success: false, error: error };
    }
  },

  forgotPassword: async (email: string): Promise<ApiResult<{ message: string }>> => {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/password-reset/', { email });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error };
    }
  },
};
