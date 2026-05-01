import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse, User } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },

  getProfile: async (): Promise<{ message: string; user: User }> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ message: string; user: User }> => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const response = await api.put('/auth/change-password', data);
    return response.data;
  },
};

// Projects API
export const projectsAPI = {
  getProjects: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }): Promise<{ projects: any[]; pagination: any }> => {
    const response = await api.get('/projects', { params });
    return response.data;
  },

  getProject: async (id: string): Promise<{ project: any; stats: any }> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  createProject: async (data: any): Promise<{ message: string; project: any }> => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  updateProject: async (id: string, data: any): Promise<{ message: string; project: any }> => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },

  addMember: async (id: string, data: { email: string; role?: string }): Promise<{ message: string; project: any }> => {
    const response = await api.post(`/projects/${id}/members`, data);
    return response.data;
  },

  removeMember: async (id: string, memberId: string): Promise<{ message: string; project: any }> => {
    const response = await api.delete(`/projects/${id}/members/${memberId}`);
    return response.data;
  },

  deleteProject: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  },
};

// Tasks API
export const tasksAPI = {
  getProjectTasks: async (projectId: string, params?: {
    page?: number;
    limit?: number;
    status?: string;
    assignedTo?: string;
    priority?: string;
    search?: string;
  }): Promise<{ tasks: any[]; pagination: any }> => {
    const response = await api.get(`/tasks/project/${projectId}`, { params });
    return response.data;
  },

  getTask: async (id: string): Promise<{ task: any }> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  createTask: async (data: any): Promise<{ message: string; task: any }> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  updateTask: async (id: string, data: any): Promise<{ message: string; task: any }> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  deleteTask: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  addComment: async (id: string, content: string): Promise<{ message: string; task: any }> => {
    const response = await api.post(`/tasks/${id}/comments`, { content });
    return response.data;
  },

  getMyTasks: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<{ tasks: any[]; overdueCount: number; pagination: any }> => {
    const response = await api.get('/tasks/my-tasks', { params });
    return response.data;
  },

  getDashboardStats: async (): Promise<any> => {
    const response = await api.get('/tasks/dashboard/stats');
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }): Promise<{ users: any[]; pagination: any }> => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (id: string): Promise<{ user: any }> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUserRole: async (id: string, role: string): Promise<{ message: string; user: any }> => {
    const response = await api.put(`/users/${id}/role`, { role });
    return response.data;
  },

  deactivateUser: async (id: string): Promise<{ message: string; user: any }> => {
    const response = await api.put(`/users/${id}/deactivate`);
    return response.data;
  },

  getAvailableUsers: async (projectId: string): Promise<{ users: any[] }> => {
    const response = await api.get(`/users/available/${projectId}`);
    return response.data;
  },

  getAllActiveUsers: async (): Promise<{ users: any[] }> => {
    const response = await api.get('/users/all-active');
    return response.data;
  },
};

export default api;
