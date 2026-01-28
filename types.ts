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
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Staff {
  id: string;
  username?: string; // Legacy
  fullName: string;
  phone: string;
  password?: string;
  staffCode: string; // 6-character unique code
  position?: string;
  canAddItems: boolean; 
  canManageRegister: boolean;
  canSeeStaffOnDuty: boolean;
  canControlStatus: boolean;
  eligibleShiftIds: string[];
}

export interface BreakRecord {
  outAt: number;
  inAt?: number;
  isApproved: boolean;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'None';
  timeIn?: number;
  timeOut?: number;
  breaks: BreakRecord[];
  overtimeMins: number;
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
  fullName?: string;
  password?: string;
  phone: string;
  email?: string;
  shopId?: string;
  isStaff?: boolean; 
  isAdmin?: boolean; 
  canAddItems?: boolean;
  canManageRegister?: boolean;
  canSeeStaffOnDuty?: boolean;
  canControlStatus?: boolean;
  favorites: string[]; 
}

export interface AppState {
  currentUser: User | null;
  shops: Shop[];
  allUsers: User[];
  history: HistoryItem[]; 
  comments: Comment[];
}
