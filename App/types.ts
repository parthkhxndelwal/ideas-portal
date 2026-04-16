// User and Registration Types
export interface User {
  _id?: string;
  email: string;
  name?: string;
  rollNumber?: string;
  courseAndSemester?: string;
  year?: string;
  transactionId?: string;
  registrationStatus: "pending" | "details_confirmed" | "subevent_selected" | "confirmed";
  paymentStatus: "pending" | "completed";
  isFromUniversity?: boolean;
  selectedSubEvent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MobileUser {
  id: string;
  name?: string;
  rollNumber?: string;
  email: string;
  transactionId?: string;
  courseAndSemester?: string;
  year?: string;
  selectedSubEvent?: string;
  role?: string;
  isKrmu?: boolean;
  isFresher?: boolean;
  scanned?: boolean;
  scannedAt?: string | null;
  scannedBy?: string | null;
}

// Scan Record Types
export interface ScanRecord {
  scanId: string;
  deviceId: string;
  transactionId: string;
  rollNumber?: string;
  name: string;
  qrType: "participant" | "volunteer";
  entryDate: Date;
  entryTimestamp: Date;
  scannedBy: string;
  status: "accepted" | "conflict" | "rejected";
  reason?: string;
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Local Storage Types
export interface LocalScanRecord {
  id: string;
  transactionId: string;
  rollNumber?: string;
  name: string;
  qrType: "participant" | "volunteer";
  scannedAt: Date;
  deviceId: string;
  deviceName: string;
  status: "pending" | "synced" | "failed";
  serverResponse?: any;
}

export interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  isConfigured: boolean;
}

export interface CachedData {
  users: MobileUser[];
  lastUpdated: Date;
  version: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ScanResult {
  success: boolean;
  message: string;
  alreadyScanned?: boolean;
  scannedBy?: string | null;
  scannedAt?: string | null;
  data?: any; // Full scan record from server
}

export interface UsersApiResponse {
  success: boolean;
  users: MobileUser[];
  lastUpdated: string;
  totalCount: number;
}

// QR Code Data Structure
export interface QRData {
  type: "participant" | "volunteer";
  transactionId: string;
  rollNumber?: string;
  timestamp?: number;
}