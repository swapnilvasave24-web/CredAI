import axios from 'axios';
import type {
  AuthResponse, ApplicantProfile, AssessmentInput, AssessmentResult,
  AssessmentHistoryItem, InstitutionStatus, InstitutionMetrics,
  AdminDashboard, FairnessResult, FederatedRound, FederatedStatus, FederatedTrainResult
} from '../types';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('credai_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('credai_token');
      localStorage.removeItem('credai_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authRegister = (name: string, email: string, password: string) =>
  api.post<AuthResponse>('/auth/register', { name, email, password }).then(r => r.data);

export const authLogin = (email: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data);

export const authLogout = () => api.post('/auth/logout');

// Applicant
export const getProfile = () =>
  api.get<ApplicantProfile>('/applicant/profile').then(r => r.data);

export const updateProfile = (data: Partial<ApplicantProfile>) =>
  api.put<ApplicantProfile>('/applicant/profile', data).then(r => r.data);

export const submitAssessment = (data: AssessmentInput) =>
  api.post<AssessmentResult>('/assessments', data).then(r => r.data);

export const getAssessments = () =>
  api.get<AssessmentHistoryItem[]>('/assessments').then(r => r.data);

export const getAssessment = (id: number) =>
  api.get<AssessmentResult>(`/assessments/${id}`).then(r => r.data);

export const getExplanation = (id: number) =>
  api.get<AssessmentHistoryItem[]>(`/assessments/${id}/explanation`).then(r => r.data);

// Institution
export const getInstitutionStatus = () =>
  api.get<InstitutionStatus>('/institution/status').then(r => r.data);

export const getInstitutionMetrics = () =>
  api.get<InstitutionMetrics>('/institution/metrics').then(r => r.data);

// Admin
export const getAdminDashboard = () =>
  api.get<AdminDashboard>('/admin/dashboard').then(r => r.data);

export const getModelMetrics = () =>
  api.get<Record<string, unknown>>('/admin/model-metrics').then(r => r.data);

export const getFairness = () =>
  api.get<FairnessResult>('/admin/fairness').then(r => r.data);

// Federated
export const getFederatedStatus = () =>
  api.get<FederatedStatus>('/federated/status').then(r => r.data);

export const getFederatedRounds = () =>
  api.get<FederatedRound[]>('/federated/rounds').then(r => r.data);

export const startFederatedTraining = (rounds: number, localEpochs: number = 20) =>
  api.post<FederatedTrainResult>('/federated/train', { rounds, local_epochs: localEpochs }, { timeout: 300_000 })
    .then(r => r.data);
