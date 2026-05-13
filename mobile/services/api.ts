import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function getBaseUrl(): string {
  if (Platform.OS === 'web') return 'http://localhost:3001';
  const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) return `http://${debuggerHost.split(':')[0]}:3001`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3001';
  return 'http://localhost:3001';
}

const BASE_URL = getBaseUrl();
console.log('🔗 API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    const token = typeof window !== 'undefined' ? localStorage?.getItem('auth_token') : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('auth_token').catch(() => {});
      SecureStore.deleteItemAsync('auth_user').catch(() => {});
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { currentPassword, newPassword }),
  updateEmail: (email: string, password: string) =>
    api.put('/auth/email', { email, password }),
};

// ─── Patient ─────────────────────────────────────────────────────────────────
export const patientAPI = {
  getProfile: () => api.get('/patients/me'),
  getDashboard: () => api.get('/patients/me/dashboard'),
  updateProfile: (data: {
    firstName?: string; lastName?: string; age?: number; hospital?: string;
    phone?: string; emergencyContactName?: string; emergencyContactPhone?: string;
    bloodType?: string; allergies?: string; address?: string;
  }) => api.put('/patients/me', data),
  getReport: () => api.get('/patients/me/report'),
  getAlerts: () => api.get('/patients/me/alerts'),
  sendSOS: (reason?: string) => api.post('/patients/me/sos', { reason }),
};

// ─── Check-ins ───────────────────────────────────────────────────────────────
export const checkInAPI = {
  submit: (data: { painLevel: number; temperature?: number; symptoms: string[]; notes?: string; mood?: string }) =>
    api.post('/checkins', data),
  getHistory: () => api.get('/checkins'),
  getLatest: () => api.get('/checkins/latest'),
};

// ─── Messages (Patient) ──────────────────────────────────────────────────────
export const messageAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (staffId: string) => api.get(`/messages/${staffId}`),
  sendMessage: (staffId: string, content: string) => api.post('/messages', { staffId, content }),
};

// ─── Medications ─────────────────────────────────────────────────────────────
export const medicationAPI = {
  getAll: () => api.get('/medications'),
  markTaken: (id: string) => api.post(`/medications/${id}/take`),
  getSchedule: () => api.get('/medications/schedule'),
};

// ─── Appointments ────────────────────────────────────────────────────────────
export const appointmentAPI = {
  getUpcoming: () => api.get('/appointments'),
};

// ─── Wound Photos ────────────────────────────────────────────────────────────
export const woundPhotoAPI = {
  getAll: () => api.get('/wound-photos'),
  create: (data: { photoUri: string; caption?: string }) => api.post('/wound-photos', data),
};

// ─── Tasks & Journal ─────────────────────────────────────────────────────────
export const taskAPI = {
  getToday:    () => api.get('/tasks/today'),
  getWeek:     () => api.get('/tasks/week'),
  complete:    (id: string) => api.put(`/tasks/${id}/complete`),
  getJournal:  () => api.get('/tasks/journal'),
  addJournal:  (data: { content: string; mood?: string; energyLevel?: number; sleepHours?: number; anxietyLevel?: number; gratitude?: string }) =>
    api.post('/tasks/journal', data),
  // Staff
  applyCareplan: (patientId: string, clearExisting = false) =>
    api.post(`/tasks/staff/patients/${patientId}/care-plan`, { clearExisting }),
  addTask:     (patientId: string, data: { dayNumber: number; category: string; title: string; description?: string }) =>
    api.post(`/tasks/staff/patients/${patientId}/tasks`, data),
  getPatientTasks: (patientId: string) => api.get(`/tasks/staff/patients/${patientId}/tasks`),
};

// ─── Staff API ───────────────────────────────────────────────────────────────
export const staffAPI = {
  // Profile
  getProfile: () => api.get('/staff/me'),
  updateProfile: (data: { firstName?: string; lastName?: string; specialty?: string; department?: string; phone?: string }) =>
    api.put('/staff/me', data),

  // Dashboard
  getDashboard: () => api.get('/staff/dashboard'),

  // Patient management
  getPatients: (params?: { search?: string; severity?: string }) =>
    api.get('/staff/patients', { params }),
  getPatientDetail: (patientId: string) => api.get(`/staff/patients/${patientId}`),

  // Alert management
  getAlerts: (params?: { resolved?: boolean; severity?: string }) =>
    api.get('/staff/alerts', { params }),
  resolveAlert: (alertId: string, resolutionNote?: string) =>
    api.put(`/staff/alerts/${alertId}/resolve`, { resolutionNote }),

  // Messaging
  getConversations: () => api.get('/staff/messages'),
  getMessages: (patientId: string) => api.get(`/staff/messages/${patientId}`),
  sendMessage: (patientId: string, content: string) =>
    api.post('/staff/messages', { patientId, content }),

  // Clinical actions
  prescribeMedication: (patientId: string, data: {
    name: string; dosage: string; frequency: string; instructions?: string; totalDoses: number;
  }) => api.post(`/staff/patients/${patientId}/medications`, data),
  updateMedication: (patientId: string, medId: string, data: {
    dosage?: string; frequency?: string; instructions?: string; isActive?: boolean;
  }) => api.put(`/staff/patients/${patientId}/medications/${medId}`, data),
  scheduleAppointment: (patientId: string, data: {
    title: string; description?: string; dateTime: string; duration?: number;
  }) => api.post(`/staff/patients/${patientId}/appointments`, data),
  addCheckInNote: (checkInId: string, staffNotes: string) =>
    api.put(`/staff/checkins/${checkInId}/notes`, { staffNotes }),
  getAnalytics: () => api.get('/staff/analytics'),
};

export default api;
