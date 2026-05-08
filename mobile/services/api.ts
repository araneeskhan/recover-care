import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Auto-detect the host machine's IP from Expo's dev server
// This works for both emulators and physical devices
function getBaseUrl(): string {
  if (Platform.OS === 'web') return 'http://localhost:3001';

  // Extract the host IP from the Expo dev server URL
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]; // strip the port
    return `http://${host}:3001`;
  }

  // Fallbacks
  if (Platform.OS === 'android') return 'http://10.0.2.2:3001';
  return 'http://localhost:3001';
}

const BASE_URL = getBaseUrl();
console.log('🔗 API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // SecureStore might not be available on web
      const token = typeof window !== 'undefined' ? localStorage?.getItem('auth_token') : null;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      SecureStore.deleteItemAsync('auth_token').catch(() => {});
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  updateEmail: (email: string, password: string) =>
    api.put('/auth/email', { email, password }),
};

// Patient
export const patientAPI = {
  getProfile: () => api.get('/patients/me'),
  getDashboard: () => api.get('/patients/me/dashboard'),
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    age?: number;
    hospital?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    bloodType?: string;
    allergies?: string;
    address?: string;
  }) => api.put('/patients/me', data),
};

// Check-ins
export const checkInAPI = {
  submit: (data: {
    painLevel: number;
    temperature?: number;
    symptoms: string[];
    notes?: string;
    mood?: string;
  }) => api.post('/checkins', data),
  getHistory: () => api.get('/checkins'),
  getLatest: () => api.get('/checkins/latest'),
};

// Messages
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (staffId: string) => api.get(`/messages/${staffId}`),
  sendMessage: (staffId: string, content: string) =>
    api.post('/messages', { staffId, content }),
};

// Medications
export const medicationAPI = {
  getAll: () => api.get('/medications'),
  markTaken: (id: string) => api.post(`/medications/${id}/take`),
  getSchedule: () => api.get('/medications/schedule'),
};

// Appointments
export const appointmentAPI = {
  getUpcoming: () => api.get('/appointments'),
};

export default api;
