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
  restockDate?: number; 
}

export interface Shift {
  id: string;
  name: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  hours: number;
}

export interface Staff {
  id: string;
  username: string;
  password?: string;
  position: string;
  staffCode: string;
  canAddItems: boolean; 
  canSeeStaffOnDuty: boolean;
  canManageRegister: boolean;
  eligibleShifts: string[]; // IDs of shifts from shiftLibrary
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Off';
  signInTime?: any; // Firestore serverTimestamp
  signOutTime?: any;
  overtimeMinutes: number;
  breaks: {
    outTime: any;
    inTime?: any;
    approved: boolean;
  }[];
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
  shiftLibrary: Shift[];
  currentRegisterMonth?: string; // YYYY-MM
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
  canAddItems?: boolean;
  canSeeStaffOnDuty?: boolean;
  canManageRegister?: boolean;
  favorites: string[]; 
}

export interface AppState {
  currentUser: User | null;
  shops: Shop[];
  allUsers: User[];
  history: HistoryItem[]; 
  comments: Comment[];
}
