
import React, { useState, useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Shop, AppState, HistoryItem, Comment } from './types';
import { MOCK_SHOPS } from './constants';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';
import ServicesPage from './pages/ServicesPage';
import AvailablePage from './pages/AvailablePage';
import SettingsPage from './pages/SettingsPage';
import FavoritesPage from './pages/FavoritesPage';
import HistoryPage from './pages/HistoryPage';
import AdminDashboard from './pages/AdminDashboard';

const generateShopCode = (name: string): string => {
  const firstWord = name.split(' ')[0].toUpperCase();
  const nums = Math.floor(100 + Math.random() * 899).toString();
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  return `${firstWord}-${nums}${letters}`;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('shopfinder_app_state_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("LocalStorage access denied", e);
    }
    return {
      currentUser: null,
      shops: MOCK_SHOPS.map(s => ({ ...s, ownerId: 'u1', locationVisible: true })) as Shop[],
      allUsers: [
        { id: 'u1', username: 'admin', password: 'password', phone: '08000000000', favorites: [], shopId: 's1' },
        { id: 'admin_master', username: 'AdminAH', password: 'admin@93', phone: '999', favorites: [], isAdmin: true }
      ],
      history: [],
      comments: []
    };
  });

  const lastCheckRef = useRef<string>("");

  useEffect(() => {
    try {
      localStorage.setItem('shopfinder_app_state_v1', JSON.stringify(state));
    } catch (e) {}
  }, [state]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentMinute = `${now.getHours()}:${now.getMinutes()}`;
      if (lastCheckRef.current === currentMinute) return;
      lastCheckRef.current = currentMinute;

      setState(prev => {
        let changed = false;
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[now.getDay()];
        const currentTimeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const newHistory: HistoryItem[] = [];
        const updatedShops = prev.shops.map(shop => {
          if (!shop.isAutomatic || !shop.businessHours) return shop;
          const schedules = shop.businessHours.filter(bh => bh.day === currentDay && bh.enabled);
          if (schedules.length === 0) return shop;

          for (const schedule of schedules) {
            if (currentTimeStr === schedule.open && !shop.isOpen) {
              changed = true;
              newHistory.push({
                id: Math.random().toString(36).substr(2, 9),
                username: 'System (Auto)',
                action: 'Opened Shop',
                timestamp: Date.now(),
                shopId: shop.id
              });
              return { ...shop, isOpen: true };
            }
            if (currentTimeStr === schedule.close && shop.isOpen) {
              changed = true;
              newHistory.push({
                id: Math.random().toString(36).substr(2, 9),
                username: 'System (Auto)',
                action: 'Closed Shop',
                timestamp: Date.now(),
                shopId: shop.id
              });
              return { ...shop, isOpen: false };
            }
          }
          return shop;
        });

        return changed ? { ...prev, shops: updatedShops, history: [...prev.history, ...newHistory] } : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const login = (identifier: string, pass: string, isStaff: boolean, shopCode?: string): boolean => {
    let authenticatedUser: User | null = null;

    if (isStaff && shopCode) {
      const shop = state.shops.find(s => s.code.toLowerCase() === shopCode.toLowerCase());
      if (shop) {
        const staffMember = shop.staff.find(st => st.username === identifier && st.password === pass);
        if (staffMember) {
          authenticatedUser = {
            id: staffMember.id,
            username: staffMember.username,
            password: staffMember.password,
            phone: '',
            shopId: shop.id,
            favorites: [],
            isStaff: true,
            canAddItems: staffMember.canAddItems
          };
        }
      }
    } else {
      authenticatedUser = state.allUsers.find(u => (u.username === identifier || u.phone === identifier) && u.password === pass) || null;
    }

    if (authenticatedUser) {
      setState(prev => ({ ...prev, currentUser: authenticatedUser }));
      localStorage.setItem('shopfinder_last_user_v1', JSON.stringify({
        username: authenticatedUser.username,
        phone: authenticatedUser.phone,
        isStaff,
        shopCode
      }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const handleRegisterShop = (shopData: Partial<Shop>) => {
    if (!state.currentUser) return;
    const newShop: Shop = {
      id: Math.random().toString(36).substr(2, 9),
      ownerId: state.currentUser.id,
      code: generateShopCode(shopData.name || 'Shop'),
      isOpen: false,
      isAutomatic: false,
      locationVisible: true,
      businessHours: [],
      items: [],
      staff: [],
      contact: state.currentUser.phone,
      ...shopData
    } as Shop;

    setState(prev => {
      const updatedUser = { ...prev.currentUser!, shopId: newShop.id };
      return {
        ...prev,
        currentUser: updatedUser,
        allUsers: prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u),
        shops: [...prev.shops, newShop]
      };
    });
  };

  const registerUser = (userData: Partial<User>, shopData?: Partial<Shop>): { success: boolean; message?: string } => {
    const usernameTaken = state.allUsers.some(u => u.username.toLowerCase() === userData.username?.toLowerCase());
    const phoneTaken = state.allUsers.some(u => u.phone === userData.phone);

    if (usernameTaken || phoneTaken) {
      return { success: false, message: "Sorry, that account identifier is already in use!" };
    }

    const userId = Math.random().toString(36).substr(2, 9);
    const newUser: User = {
      id: userId,
      username: userData.username!,
      password: userData.password!, 
      phone: userData.phone!,
      email: userData.email,
      favorites: [],
      ...userData
    } as User;

    let newShop: Shop | undefined;
    if (shopData) {
      newShop = {
        id: Math.random().toString(36).substr(2, 9),
        ownerId: userId,
        code: generateShopCode(shopData.name || 'Shop'),
        name: shopData.name || 'My Facility',
        type: shopData.type || 'General',
        state: shopData.state || '',
        lga: shopData.lga || '',
        address: shopData.address || '',
        contact: shopData.contact || userData.phone!,
        isOpen: false,
        isAutomatic: false,
        locationVisible: true,
        businessHours: [],
        items: [],
        staff: [],
        ...shopData
      } as Shop;
      newUser.shopId = newShop.id;
    }

    setState(prev => ({
      ...prev,
      allUsers: [...prev.allUsers, newUser],
      shops: newShop ? [...prev.shops, newShop] : prev.shops
    }));

    return { success: true };
  };

  const updateShop = (shopId: string, updates: Partial<Shop>) => {
    setState(prev => {
      const oldShop = prev.shops.find(s => s.id === shopId);
      const newHistory: HistoryItem[] = [];
      if (oldShop && updates.isOpen !== undefined && updates.isOpen !== oldShop.isOpen) {
        newHistory.push({
          id: Math.random().toString(36).substr(2, 9),
          username: prev.currentUser?.username || 'Unknown',
          action: updates.isOpen ? 'Opened Shop' : 'Closed Shop',
          timestamp: Date.now(),
          shopId
        });
      }
      return {
        ...prev,
        shops: prev.shops.map(s => s.id === shopId ? { ...s, ...updates } : s),
        history: [...prev.history, ...newHistory]
      };
    });
  };

  const updatePassword = (newPassword: string) => {
    if (!state.currentUser) return;
    setState(prev => {
      const isStaff = prev.currentUser?.isStaff;
      const updatedUser = { ...prev.currentUser!, password: newPassword };
      let updatedAllUsers = prev.allUsers;
      let updatedShops = prev.shops;

      if (isStaff) {
        updatedShops = prev.shops.map(shop => {
          if (shop.id === prev.currentUser?.shopId) {
            return {
              ...shop,
              staff: shop.staff.map(s => s.id === prev.currentUser?.id ? { ...s, password: newPassword } : s)
            };
          }
          return shop;
        });
      } else {
        updatedAllUsers = prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
      }

      return {
        ...prev,
        currentUser: updatedUser,
        allUsers: updatedAllUsers,
        shops: updatedShops
      };
    });
  };

  const toggleFavorite = (shopId: string) => {
    if (!state.currentUser) return;
    setState(prev => {
      const favorites = prev.currentUser!.favorites.includes(shopId)
        ? prev.currentUser!.favorites.filter(id => id !== shopId)
        : [...prev.currentUser!.favorites, shopId];
      const updatedUser = { ...prev.currentUser!, favorites };
      return {
        ...prev,
        currentUser: updatedUser,
        allUsers: prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
      };
    });
  };

  const addComment = (shopId: string, text: string) => {
    if (!state.currentUser) return;
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: state.currentUser.id,
      shopId,
      username: state.currentUser.username,
      text: text,
      timestamp: Date.now()
    };
    setState(prev => ({
      ...prev,
      comments: [newComment, ...prev.comments.filter(c => c.shopId !== shopId)]
    }));
  };

  const handleResetPassword = (identifier: string, newPassword: string): boolean => {
    const user = state.allUsers.find(u => u.username === identifier || u.phone === identifier);
    if (!user) return false;
    
    setState(prev => ({
      ...prev,
      allUsers: prev.allUsers.map(u => u.id === user.id ? { ...u, password: newPassword } : u)
    }));
    return true;
  };

  return (
    <MemoryRouter>
      <Routes>
        {!state.currentUser ? (
          <>
            <Route path="/login" element={<LoginPage onLogin={login} />} />
            <Route path="/signup" element={<SignupPage onSignup={registerUser} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage onReset={handleResetPassword} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            {state.currentUser.isAdmin ? (
              <Route path="/admin" element={<AdminDashboard state={state} onLogout={logout} />} />
            ) : (
              <>
                <Route path="/dashboard" element={<Dashboard state={state} onLogout={logout} onToggleFavorite={toggleFavorite} onUpdateShop={updateShop} onRegisterShop={handleRegisterShop} onAddComment={addComment} />} />
                <Route path="/services" element={<ServicesPage state={state} onLogout={logout} onUpdateShop={updateShop} />} />
                <Route path="/available" element={<AvailablePage state={state} onLogout={logout} onToggleFavorite={toggleFavorite} />} />
                <Route path="/favorites" element={<FavoritesPage state={state} onLogout={logout} onToggleFavorite={toggleFavorite} onUpdateShop={updateShop} onAddComment={addComment} />} />
                <Route path="/settings" element={<SettingsPage state={state} onLogout={logout} onUpdateShop={updateShop} onUpdatePassword={updatePassword} />} />
                <Route path="/history" element={<HistoryPage state={state} onLogout={logout} onClearHistory={() => setState(p => ({...p, history: []}))} />} />
              </>
            )}
            <Route path="*" element={<Navigate to={state.currentUser.isAdmin ? "/admin" : "/dashboard"} replace />} />
          </>
        )}
      </Routes>
    </MemoryRouter>
  );
};

export default App;
