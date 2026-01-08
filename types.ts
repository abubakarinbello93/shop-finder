
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
}

export interface Staff {
  id: string;
  username: string;
  password?: string;
  canAddItems: boolean; 
}

export interface HistoryItem {
  id: string;
  username: string;
  action: string; 
  timestamp: number;
  shopId: string;
}

export interface Comment {
  id: string;
  userId: string;
  shopId: string; // Linked to a specific shop
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
  businessHours: BusinessHour[];
  items: ServiceItem[];
  staff: Staff[];
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
  favorites: string[]; 
}

export interface AppState {
  currentUser: User | null;
  shops: Shop[];
  allUsers: User[];
  history: HistoryItem[]; 
  comments: Comment[];
}
