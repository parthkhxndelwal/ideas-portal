const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Network error. Please try again.',
    };
  }
}

export interface UserStatus {
  exists: boolean;
  state?: string;
  isVerified?: boolean;
  isKrmu?: boolean;
  registration?: {
    referenceId: string;
    name: string;
    email: string;
    isKrmu: boolean;
    year: string;
    isFresher?: boolean;
    feeAmount: number;
    feePaid: boolean;
    hasQrCode: boolean;
  };
}

export interface RegistrationStatus {
  state: string;
  isVerified: boolean;
  isKrmu: boolean;
  registration: {
    referenceId: string;
    name: string;
    email: string;
    isKrmu: boolean;
    year: string;
    isFresher?: boolean;
    feeAmount: number;
    feePaid: boolean;
    hasQrCode: boolean;
  } | null;
}

export const api = {
  verifyKey: () => fetchApi<{ valid: boolean }>('/api/v1/auth/verify', { method: 'POST' }),

  getUserStatus: (externalAppId: string) =>
    fetchApi<UserStatus>(`/api/v1/auth/user?externalAppId=${externalAppId}`),

  startRegistration: (externalAppId: string, institution: 'krmu' | 'external') =>
    fetchApi<{ state: string }>('/api/v1/registration/start', {
      method: 'POST',
      body: JSON.stringify({ externalAppId, institution }),
    }),

  submitRollNumber: (externalAppId: string, rollNumber: string) =>
    fetchApi<{ state: string; email: string }>('/api/v1/registration/roll-number', {
      method: 'POST',
      body: JSON.stringify({ externalAppId, rollNumber }),
    }),

  submitEmail: (externalAppId: string, email: string) =>
    fetchApi<{ state: string }>('/api/v1/registration/email', {
      method: 'POST',
      body: JSON.stringify({ externalAppId, email }),
    }),

  requestOtp: (externalAppId: string) =>
    fetchApi<{ otpSent: boolean }>('/api/v1/registration/otp/request', {
      method: 'POST',
      body: JSON.stringify({ externalAppId }),
    }),

  verifyOtp: (externalAppId: string, otp: string) =>
    fetchApi<{ state: string }>('/api/v1/registration/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ externalAppId, otp }),
    }),

  submitDetails: (
    externalAppId: string,
    name: string,
    course: string,
    year: string,
    college?: string
  ) =>
    fetchApi<{ referenceId: string; paymentLink: string; state: string }>(
      '/api/v1/registration/details',
      {
        method: 'POST',
        body: JSON.stringify({ externalAppId, name, course, year, college }),
      }
    ),

  submitFresher: (externalAppId: string, isFresher: boolean) =>
    fetchApi<{ referenceId: string; paymentLink: string; isFresher: boolean; state: string }>(
      '/api/v1/registration/fresher',
      {
        method: 'POST',
        body: JSON.stringify({ externalAppId, isFresher }),
      }
    ),

  getRegistrationStatus: (externalAppId: string) =>
    fetchApi<RegistrationStatus>(`/api/v1/registration/status?externalAppId=${externalAppId}`),

  confirmPayment: (externalAppId: string, referenceId: string) =>
    fetchApi<{ confirmed: boolean }>('/api/v1/registration/confirm-payment', {
      method: 'POST',
      body: JSON.stringify({ externalAppId, referenceId }),
    }),

  getTicket: (externalAppId: string) =>
    fetchApi<{ referenceId: string; name: string; qrCode: string }>(
      `/api/v1/ticket?externalAppId=${externalAppId}`
    ),

  resendTicket: (externalAppId: string, referenceId: string) =>
    fetchApi<{ sent: boolean }>('/api/v1/ticket/resend', {
      method: 'POST',
      body: JSON.stringify({ externalAppId, referenceId }),
    }),
};

export function generateExternalAppId(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('solesta_external_id') : null;
  if (stored) return stored;
  
  const newId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  if (typeof window !== 'undefined') {
    localStorage.setItem('solesta_external_id', newId);
  }
  return newId;
}

export function getExternalAppId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('solesta_external_id') || generateExternalAppId();
}