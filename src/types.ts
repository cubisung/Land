export type QRType = 'vietqr' | 'url' | 'text' | 'wifi' | 'phone' | 'email' | 'sms' | 'vcard';

export interface VietQRData {
  bankBin: string;
  accountNo: string;
  accountName: string;
  amount?: string;
  addInfo?: string;
}

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface EmailData {
  address: string;
  subject: string;
  body: string;
}

export interface SmsData {
  phone: string;
  message: string;
}

export interface VCardData {
  firstName: string;
  lastName: string;
  org: string;
  title: string;
  phone: string;
  email: string;
  url: string;
  address: string;
}

export interface QROptions {
  darkColor: string;
  lightColor: string;
  transparentBg: boolean;
  errorCorrectionLevel: ErrorCorrectionLevel;
  margin: number;
  size: number; // e.g. 512
  logoUrl?: string;
  logoScale?: number; // 0.15 to 0.25
  logoShape?: 'circle' | 'square' | 'rounded';
}

export type UserRole = 'admin' | 'member';
export type UserStatus = 'approved' | 'pending' | 'rejected';

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: number;
}

export interface AttachedDocument {
  id: string;
  name: string;
  size: number;
  type: string; // e.g. 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', etc.
  url: string; // URL to download or view the document (/uploads/...)
  dataUrl?: string; // Optional fallback data URL for offline
  uploadedAt: number;
}

export interface SavedQR {
  id: string;
  title: string;
  rawString: string;
  type: QRType;
  options: QROptions;
  createdAt: number;
  createdByUid?: string;
  creatorName?: string;
  isPublic?: boolean;
  marketValue?: string;
  attachedImages?: string[];
  attachedDocuments?: AttachedDocument[];
  coordinates?: string;
  actionType?: 'save' | 'export_pdf' | 'both';
  lastExportedAt?: number;
  reportCode?: string;
}
