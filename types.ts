export type BusinessDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface BusinessHour {
  id: string;
  day: BusinessDay;
  open: string; // HH:mm
  close: string; // HH:mm
  enabled: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  time?: string;
  available: boolean;
  restockDate?: number; // Timestamp for when the item becomes available again
}

export interface Shift {
  id: string;
  name: string;
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface StaffPermissions {
  editInventory: boolean;
  seeStaffOnDuty: boolean;
  registerManagement: boolean;
  statusControl: boolean;
}

export interface Staff {
  id: string;
  fullName: string;
  phone: string;
  password?: string;
  code: string; // 6-character unique code
  position: string;
  assignedShifts: string[]; // Array of Shift IDs (updated from Shift[] snapshot)
  permissions: StaffPermissions;
  canAddItems?: boolean; // Legacy field for compatibility
}

export interface BreakRecord {
  start: number;
  end?: number;
  approved: boolean;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  signIn?: number;
  signOut?: number;
  // Added 'Sign Out' to the status union to match implementation in RegisterPage.tsx
  status: 'Present' | 'Absent' | 'On Break' | 'Sign Out';
  breaks: BreakRecord[];
  overtimeMinutes: number;
  assignedShiftId?: string;
}

export interface HistoryItem {
  id: string;
  changedBy: string;
  status: 'Open' | 'Closed'; 
  timestamp: number;
  shopId: string;
  action: string;
  username: string;
}

export interface Comment {
  id: string;
  userId: string;
  shopId: string; 
  username: string;
  text: string;
  timestamp: number;
}

export interface Shop {
  id: string;
  ownerId: string; 
  code: string;
  name: string;
  type: string;
  state: string;
  lga: string;
  address: string;
  contact: string;
  email?: string;
  isOpen: boolean;
  isAutomatic: boolean;
  locationVisible: boolean;
  currentStatus?: string; 
  businessHours: BusinessHour[];
  items: ServiceItem[];
  staff: Staff[];
  shifts: Shift[];
  location?: {
    lat: number;
    lng: number;
  };
}

export interface User {
  id: string;
  username: string;
  password?: string;
  phone: string;
  email?: string;
  shopId?: string;
  isStaff?: boolean; 
  isAdmin?: boolean; 
  canAddItems?: boolean; // Legacy
  permissions?: StaffPermissions; // For staff users
  favorites: string[]; 
}

export interface AppState {
  currentUser: User | null;
  shops: Shop[];
  allUsers: User[];
  history: HistoryItem[]; 
  comments: Comment[];
}
