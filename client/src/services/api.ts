import axios from 'axios';
import { Survey, SurveyResponse, SurveyResults, SurveyTemplate, SurveyAnalytics } from '../types/survey';
import { LoginCredentials, RegisterData, AuthResponse, ResetPasswordData, ChangePasswordData } from '../types/auth';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Invalid credentials');
      }
      throw error;
    }
  },

  register: async (data: RegisterData): Promise<{ message: string }> => {
    try {
      const response = await api.post('/api/auth/register', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Registration failed');
      }
      throw error;
    }
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, data: { password: string; confirmPassword: string }) => {
    const response = await api.post(`/api/auth/reset-password/${token}`, data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  }
};

export const surveyApi = {
  createSurvey: async (data: Partial<Survey>) => {
    const response = await api.post('/api/surveys', data);
    return response.data;
  },

  getSurveys: async () => {
    const response = await api.get('/api/surveys');
    return response.data;
  },

  getSurvey: async (id: string) => {
    const response = await api.get(`/api/surveys/${id}`);
    return response.data;
  },

  updateSurvey: async (id: string, data: Partial<Survey>) => {
    const response = await api.put(`/api/surveys/${id}`, data);
    return response.data;
  },

  deleteSurvey: async (id: string) => {
    const response = await api.delete(`/api/surveys/${id}`);
    return response.data;
  },

  submitResponse: async (surveyId: string, response: Partial<SurveyResponse>) => {
    const res = await api.post(`/api/surveys/${surveyId}/respond`, response);
    return res.data;
  },

  getSurveyResults: async (id: string): Promise<SurveyResults> => {
    const response = await api.get(`/api/surveys/${id}/results`);
    return response.data;
  },

  addCollaborator: async (surveyId: string, userId: string) => {
    const response = await api.post(`/api/surveys/${surveyId}/collaborators`, { user_id: userId });
    return response.data;
  },

  getSurveyTemplates: async () => {
    const response = await api.get('/api/surveys/templates');
    return response.data;
  },

  // Template endpoints
  getTemplates: async (): Promise<SurveyTemplate[]> => {
    const response = await api.get('/api/surveys/templates');
    return response.data;
  },

  useTemplate: async (templateId: string): Promise<{ _id: string }> => {
    const response = await api.post(`/api/surveys/templates/${templateId}/use`);
    return response.data;
  },

  // Enhanced analytics endpoint
  getSurveyAnalytics: async (surveyId: string): Promise<SurveyAnalytics> => {
    console.log('====================================')
    console.log('surveyId', surveyId)
    console.log('====================================')
    const response = await api.get(`/api/surveys/results/${surveyId}/analytics`);
    return response.data;
  }
};

export default api;