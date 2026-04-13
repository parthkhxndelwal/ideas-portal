const API_BASE_URL = ""

function getDeviceToken(): string {
  if (typeof window === "undefined") return ""
  let token = localStorage.getItem("solesta_device_token")
  if (!token) {
    token = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem("solesta_device_token", token)
  }
  return token
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()
    return data
  } catch (error) {
    console.error("API Error:", error)
    return {
      success: false,
      error: "NETWORK_ERROR",
      message: "Network error. Please try again.",
    }
  }
}

export interface UserStatus {
  exists: boolean
  state?: string
  isVerified?: boolean
  isKrmu?: boolean
  registration?: {
    referenceId: string
    name: string
    email: string
    isKrmu: boolean
    year: string
    rollNumber?: string
    course?: string
    isFresher?: boolean
    feeAmount: number
    feePaid: boolean
    hasQrCode: boolean
  }
}

export interface RegistrationStatus {
  exists?: boolean
  state: string
  isVerified: boolean
  isKrmu: boolean
  userDetails?: {
    name: string
    email: string
    rollNumber?: string
    course: string
    year: string
  }
  registration: {
    referenceId: string
    name: string
    email: string
    isKrmu: boolean
    rollNumber?: string
    course: string
    year: string
    isFresher?: boolean
    feeAmount: number
    feePaid: boolean
    hasQrCode: boolean
  } | null
}

export interface DisplayFeeData {
  name: string
  email: string
  rollNumber?: string
  course: string
  year: string
  feeAmount: number
}

export interface UserStatus {
  exists: boolean
  state?: string
  isVerified?: boolean
  isKrmu?: boolean
  registration?: {
    referenceId: string
    name: string
    email: string
    isKrmu: boolean
    year: string
    rollNumber?: string
    course?: string
    isFresher?: boolean
    feeAmount: number
    feePaid: boolean
    hasQrCode: boolean
  }
}

export const api = {
  getConfig: () =>
    fetchApi<{ enableExternalRegistration: boolean }>("/api/v1/config"),

  getUserStatus: (externalAppId: string) =>
    fetchApi<UserStatus>(`/api/v1/auth?externalAppId=${externalAppId}`),

  startRegistration: (
    externalAppId: string,
    institution: "krmu" | "external"
  ) =>
    fetchApi<{ state: string }>(`/api/v1/registration?path=start`, {
      method: "POST",
      body: JSON.stringify({
        externalAppId,
        institution,
        deviceToken: getDeviceToken(),
      }),
    }),

  submitRollNumber: (externalAppId: string, rollNumber: string) =>
    fetchApi<{ state: string; email: string }>(
      `/api/v1/registration?path=roll-number`,
      {
        method: "POST",
        body: JSON.stringify({
          externalAppId,
          rollNumber,
          deviceToken: getDeviceToken(),
        }),
      }
    ),

  submitEmail: (externalAppId: string, email: string) =>
    fetchApi<{ state: string }>(`/api/v1/registration?path=email`, {
      method: "POST",
      body: JSON.stringify({
        externalAppId,
        email,
        deviceToken: getDeviceToken(),
      }),
    }),

  requestOtp: (externalAppId: string) =>
    fetchApi<{ otpSent: boolean }>(`/api/v1/registration?path=otp-request`, {
      method: "POST",
      body: JSON.stringify({ externalAppId, deviceToken: getDeviceToken() }),
    }),

  verifyOtp: (externalAppId: string, otp: string) =>
    fetchApi<DisplayFeeData | { state: string }>(
      `/api/v1/registration?path=otp-verify`,
      {
        method: "POST",
        body: JSON.stringify({
          externalAppId,
          otp,
          deviceToken: getDeviceToken(),
        }),
      }
    ),

  submitDetails: (
    externalAppId: string,
    name: string,
    course: string,
    year: string,
    college?: string
  ) =>
    fetchApi<{ referenceId: string; paymentLink: string; state: string }>(
      "/api/v1/registration?path=details",
      {
        method: "POST",
        body: JSON.stringify({
          externalAppId,
          name,
          course,
          year,
          college,
          deviceToken: getDeviceToken(),
        }),
      }
    ),

  submitFresher: (externalAppId: string, isFresher: boolean) =>
    fetchApi<{
      referenceId: string
      paymentLink: string
      isFresher: boolean
      state: string
    }>("/api/v1/registration?path=fresher", {
      method: "POST",
      body: JSON.stringify({
        externalAppId,
        isFresher,
        deviceToken: getDeviceToken(),
      }),
    }),

  confirmDetails: (externalAppId: string) =>
    fetchApi<{
      referenceId: string
      paymentLink: string
      isFresher: boolean
      state: string
    }>("/api/v1/registration?path=confirm-details", {
      method: "POST",
      body: JSON.stringify({ externalAppId, deviceToken: getDeviceToken() }),
    }),

  getRegistrationStatus: (externalAppId: string) =>
    fetchApi<RegistrationStatus>(
      `/api/v1/registration?externalAppId=${externalAppId}`
    ),

  confirmPayment: (referenceId: string) =>
    fetchApi<{ confirmed: boolean }>(
      "/api/v1/registration?path=confirm-payment",
      {
        method: "POST",
        body: JSON.stringify({ referenceId }),
      }
    ),

  getTicket: (externalAppId: string) =>
    fetchApi<{ referenceId: string; name: string; qrCode: string }>(
      `/api/v1/ticket?externalAppId=${externalAppId}`
    ),

  searchByReference: (referenceId: string) =>
    fetchApi<RegistrationStatus>(
      `/api/v1/registration?path=search&referenceId=${referenceId}`
    ),

  resendTicket: (externalAppId: string, referenceId: string) =>
    fetchApi<{ sent: boolean }>("/api/v1/ticket", {
      method: "POST",
      body: JSON.stringify({ externalAppId, referenceId }),
    }),
}

export function generateExternalAppId(): string {
  const stored =
    typeof window !== "undefined"
      ? localStorage.getItem("solesta_external_id")
      : null
  if (stored) return stored

  const newId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  if (typeof window !== "undefined") {
    localStorage.setItem("solesta_external_id", newId)
  }
  return newId
}

export function getExternalAppId(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("solesta_external_id") || generateExternalAppId()
}
