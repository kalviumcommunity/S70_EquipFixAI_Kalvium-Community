import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.hostname === 'localhost')) {
    return 'http://localhost:8000/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Immediately set (or clear) the Authorization header on the shared axios instance.
 * Called by AuthContext right after a successful login/googleLogin so that the
 * header is in place before the verifyToken useEffect fires — eliminating the
 * race condition where verifyToken's authApi.me() could run before the
 * request interceptor picks up the token from localStorage.
 */
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Request interceptor: attach JWT Bearer token from localStorage as a fallback
// (covers hard page reloads where axios defaults have not yet been set)
api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('equipfix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor: handle 401 (session expired / invalid token)
// Only redirect to /login if we're not already there AND there is no fresh
// user data in localStorage (prevents evicting a user right after Google login
// during the window where verifyToken hasn't finished yet).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        // Guard: do not evict if localStorage still has valid user data
        // (this can happen during the brief post-login period before verifyToken
        // completes, or when a secondary endpoint unrelated to auth returns 401)
        const storedToken = localStorage.getItem('equipfix_token');
        const storedUser = localStorage.getItem('equipfix_user');
        const requestUrl = error.config?.url || '';
        const isAuthMeRequest = requestUrl.includes('/auth/me');

        if (!storedToken || !storedUser || isAuthMeRequest) {
          // Genuine expired / invalid session — clear and redirect
          localStorage.removeItem('equipfix_token');
          localStorage.removeItem('equipfix_user');
          delete api.defaults.headers.common['Authorization'];
          window.location.href = '/login';
        }
        // For other 401s (e.g. a role-based endpoint called too early),
        // let AuthContext.verifyToken handle the clean logout
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username, password, expected_role = null) =>
    api.post('/auth/login', { username, password, expected_role }),
  googleLogin: (payload) => api.post('/auth/google', payload),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
  me: () => api.get('/auth/me'),
  getDirectory: () => api.get('/auth/directory'),
  getStats: () => api.get('/auth/stats'),
};




export const machinesApi = {
  list: (params) => api.get('/machines', { params }),
  get: (id) => api.get(`/machines/${id}`),
  getHistory: (id) => api.get(`/machines/${id}/history`),
  getTimeline: (id) => api.get(`/machines/${id}/timeline`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  updateStatus: (id, status) => api.put(`/machines/${id}/status`, { status }),
  updateStatusByCode: (code, status) => api.put(`/machines/code/${code}/status`, { status }),
};

export const incidentsApi = {
  list: (params) => api.get('/incidents', { params }),
  get: (id) => api.get(`/incidents/${id}`),
  getTimeline: (id) => api.get(`/incidents/${id}/timeline`),
  report: (data) => api.post('/incidents', data),
  assign: (id, data) => api.put(`/incidents/${id}/assign`, data),
  updatePriority: (id, data) => api.put(`/incidents/${id}/priority`, data),
};

export const workOrdersApi = {
  list: (params) => api.get('/work-orders', { params }),
  get: (id) => api.get(`/work-orders/${id}`),
  updateStatus: (id, data) => api.put(`/work-orders/${id}/status`, data),
  addLog: (id, data) => api.post(`/work-orders/${id}/logs`, data),
  usePart: (id, data) => api.post(`/work-orders/${id}/parts`, data),
  complete: (id, data) => api.post(`/work-orders/${id}/complete`, data),
};

export const maintenanceApi = {
  listRecords: (params) => api.get('/maintenance/records', { params }),
  getRecord: (id) => api.get(`/maintenance/records/${id}`),
  processApproval: (id, data) => api.post(`/maintenance/records/${id}/approval`, data),
  listSchedules: (params) => api.get('/maintenance/schedules', { params }),
  createSchedule: (data) => api.post('/maintenance/schedules', data),
  generateWO: (id, techId) => api.post(`/maintenance/schedules/${id}/generate-wo?technician_id=${techId}`),
  checkDue: () => api.post('/maintenance/schedules/check-due'),
};

export const partsApi = {
  list: (params) => api.get('/parts', { params }),
  get: (id) => api.get(`/parts/${id}`),
  create: (data) => api.post('/parts', data),
  update: (id, data) => api.put(`/parts/${id}`, data),
  restock: (id, data) => api.post(`/parts/${id}/restock`, data),
  usageHistory: (id) => api.get(`/parts/${id}/usage-history`),
};

export const documentsApi = {
  list: (params) => api.get('/documents', { params }),
  get: (id) => api.get(`/documents/${id}`),
  getContent: (id) => api.get(`/documents/${id}/content`),
  create: (data) => api.post('/documents', data),
  addVersion: (id, data) => api.post(`/documents/${id}/versions`, data),
  ingest: (id) => api.post(`/documents/${id}/ingest`),
};

export const aiApi = {
  query: (data) => api.post('/ai/query', data),
  chat: (data) => api.post('/ai/chat', data),
  verifyKey: (data) => api.post('/ai/verify-key', data),
  feedback: (queryId, data) => api.post(`/ai/queries/${queryId}/feedback`, data),
  getHistory: (params) => api.get('/ai/history', { params }),
  executeTool: (data) => api.post('/ai/tools/execute', data),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const auditLogsApi = {
  list: (params) => api.get('/audit-logs', { params }),
};

export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
};

export const searchApi = {
  search: (q, limit = 5) => api.get('/search', { params: { q, limit_per_category: limit } }),
};

export const reportsApi = {
  exportMaintenanceCsvUrl: '/api/reports/maintenance.csv',
  exportIncidentsCsvUrl: '/api/reports/incidents.csv',
  exportDowntimeCsvUrl: '/api/reports/downtime.csv',
  exportTechniciansCsvUrl: '/api/reports/technicians.csv',
  downloadReportCsv: async (reportType, filename) => {
    const res = await api.get(`/reports/${reportType}.csv`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },
  exportMaintenanceJson: () => api.get('/reports/maintenance.json'),
  exportIncidentsJson: () => api.get('/reports/incidents.json'),
};

export const uploadApi = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  updateRole: (id, data) => api.put(`/users/${id}/role`, data),
  getRoles: () => api.get('/users/roles'),
  getWorkHistory: (id) => api.get(`/users/${id}/work-history`),
  getMe: () => api.get('/users/me'),
  updatePhone: (phone) => api.put('/users/me/phone', { phone }),
  deletePhone: () => api.delete('/users/me/phone'),
  updateAvatar: (avatar_url) => api.put('/users/me/avatar', { avatar_url }),
  deleteAvatar: () => api.delete('/users/me/avatar'),
};


export default api;
