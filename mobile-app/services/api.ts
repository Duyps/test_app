// ===========================================
// API SERVICE - HealthGuard Mobile App
// ===========================================

import { API_CONFIG, ENDPOINTS } from '../config/api';

// ===========================================
// TYPES
// ===========================================

export interface HealthDataResponse {
  heartRate: {
    current: number;
    min: number;
    max: number;
    avg: number;
    resting: number;
    lastMeasured: string;
    device: string;
    trend: 'up' | 'down' | 'stable';
  };
  sleep: {
    duration: number;
    quality: number;
    deepSleep: number;
    lightSleep: number;
    remSleep: number;
    awake: number;
    bedTime: string;
    wakeTime: string;
    device: string;
  };
  steps: {
    current: number;
    goal: number;
    distance: number;
    calories: number;
  };
  water: {
    current: number;
    goal: number;
  };
}

export interface ProfileResponse {
  profile_id: string;
  user_id: string;
  full_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  height: number | null;
  weight: number | null;
  gender: string | null;
  birth: string | null;
  blood_type?: string;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: string;
    email: string;
    full_name?: string;
    name?: string;
  };
}

// ✅ CẬP NHẬT TYPES CHO ĐỒNG BỘ MỚI (Khớp Schema Prisma)
export interface HealthRecord {
  record_time: string;
  heart_rate: number | null;
  steps: number | null;
  blood_oxygen: number | null;
  calories: number | null;
  distance: number | null;
  sleep_duration: number | null;
}

export interface MetricsResponse {
  status: string;
  daily_summary: any[];
  raw_data: HealthRecord[]; // Đây là mảng dữ liệu Duy cần để tính toán
}

export interface MetricsSyncPayload {
  data: HealthRecord[];
}

export interface MetricsSyncResponse {
  status: string;
  count: number;
  message?: string;
}

// Health Tips Types
export interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: string;
  icon?: string;
}

// ===========================================
// TOKEN MANAGEMENT
// ===========================================
import { getToken } from './auth';

let cachedToken: string | null = null;

export const initializeAuth = async (): Promise<boolean> => {
  cachedToken = await getToken();
  return cachedToken !== null;
};

export const setAuthToken = (token: string | null) => {
  cachedToken = token;
};

export const getAuthToken = () => cachedToken;

// ===========================================
// FETCH WRAPPER
// ===========================================

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (cachedToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${cachedToken}`;
  }

  try {
    console.log(`🌐 [API] ${options.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      console.error(`❌ [API] Error:`, error.message);
    }
    throw error;
  }
}

// ===========================================
// API FUNCTIONS
// ===========================================

export const api = {
  // AUTH
  login: (payload: any): Promise<LoginResponse> =>
    fetchAPI<LoginResponse>(ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: any): Promise<any> =>
    fetchAPI<any>(ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyRegisterOTP: (payload: { email: string; otp: string }): Promise<LoginResponse> =>
    fetchAPI<any>(ENDPOINTS.AUTH_VERIFY_OTP, { 
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(res => ({
        token: res.data.access_token,
        user: res.data.user
    })),

  // PROFILE
  getProfile: (): Promise<ProfileResponse> =>
    fetchAPI<ProfileResponse>(ENDPOINTS.PROFILE),

  updateProfile: (data: Partial<ProfileResponse>): Promise<ProfileResponse> =>
    fetchAPI<ProfileResponse>(ENDPOINTS.PROFILE, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ✅ HEALTH METRICS (Dùng cho HomeScreen)
  getMetrics: (params?: { days?: number }): Promise<MetricsResponse> => {
    let endpoint = ENDPOINTS.METRICS;
    if (params?.days) {
        endpoint += `?days=${params.days}`;
    }
    return fetchAPI<MetricsResponse>(endpoint);
  },

  /**
   * ✅ ĐỒNG BỘ DỮ LIỆU SẠCH (Object gộp 15 phút)
   */
  syncMetrics: (payload: MetricsSyncPayload): Promise<MetricsSyncResponse> =>
    fetchAPI<MetricsSyncResponse>(ENDPOINTS.METRICS, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Dữ liệu cũ để App không lỗi khi gọi các màn hình khác
  getHealthData: async (): Promise<any> => {
    return fetchAPI<any>(ENDPOINTS.METRICS);
  },

  // HEALTH TIPS
  getRandomHealthTip: (): Promise<{ data: HealthTip[] }> =>
    fetchAPI<{ data: HealthTip[] }>(ENDPOINTS.HEALTH_TIPS_RANDOM),

  getHealthTipCategories: (): Promise<{ data: any[] }> =>
    fetchAPI<{ data: any[] }>(ENDPOINTS.HEALTH_TIPS_CATEGORIES),
};

export default api;