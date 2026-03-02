import axios from 'axios';
import { toast } from 'sonner';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. REQUEST INTERCEPTOR (Add Token)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 2. RESPONSE INTERCEPTOR (Handle 401 Errors)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server says "401 Unauthorized"
    if (error.response && error.response.status === 401) {
      // Only redirect if we are not already on the login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        console.warn('Session expired. Redirecting to login...');

        // Clear bad token
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Notify user
        toast.error("Session expired. Please log in again.");

        // Force redirect
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- PAYMENT SETTINGS ---
export const paymentSettingsApi = {
  // 🏦 For Starter Tier: Route Setup
  connectBank: async (data: {
    accountName: string;
    email: string;
    beneficiaryName: string;
    accountNumber: string;
    ifscCode: string;
  }) => {
    const res = await apiClient.post('/store/connect-bank', data);
    return res.data;
  },

  // 🚀 For Pro Tier: BYOG Setup
  saveApiKeys: async (data: { keyId: string; keySecret: string }) => {
    const res = await apiClient.post('/store/save-keys', data);
    return res.data;
  },
};

// --- WHATSAPP SETTINGS ---
export const whatsappSettingsApi = {
  get: async () => {
    const res = await apiClient.get('/store/whatsapp-settings');
    return res.data;
  },
  save: async (data: { phoneNumberId: string; token: string; enabled: boolean }) => {
    const res = await apiClient.post('/store/whatsapp-settings', data);
    return res.data;
  },
};

// --- ORDERS ---
export const ordersApi = {
  updateStatus: async (orderId: string, status: string) => {
    const res = await apiClient.patch(`/orders/${orderId}/status`, { status });
    return res.data;
  },
};

export { apiClient };
