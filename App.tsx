
import React, { useState, useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Shop, AppState, HistoryItem, Comment } from './types';
import { MOCK_SHOPS } from './constants';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import Dashboard from './Dashboard';
import ServicesPage from './ServicesPage';
import AvailablePage from './AvailablePage';
import SettingsPage from './SettingsPage';
import FavoritesPage from './FavoritesPage';
import HistoryPage from './HistoryPage';
import AdminDashboard from './AdminDashboard';

const generateShopCode = (name: string): string => {
  const firstWord = name.split(' ')[0].toUpperCase();
  const nums = Math.floor(100 + Math.random() * 899).toString();
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  return `${firstWord}-${nums}${letters}`;
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('shopfinder_app_state_v3');
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

  useEffect(() => {
    try {
      localStorage.setItem('shopfinder_app_state_v3', JSON.stringify(state));
    } catch (e) {}
  }, [state]);

  const login = (identifier: string, pass: string, isStaff: boolean, shopCode?: string): boolean => {
    let authenticatedUser: User | null = null;
    if (isStaff && shopCode) {
      const shop = state.shops.find(s => s.code.toLowerCase() === shopCode.toLowerCase());
      if (shop) {
        const staffMember = shop.staff.find(st => st.username === identifier && st.password === pass);
        if (staffMember) {
          authenticatedUser = { ...staffMember, phone: '', shopId: shop.id, favorites: [], isStaff: true };
        }
      }
    } else {
      authenticatedUser = state.allUsers.find(u => (u.username === identifier || u.phone === identifier) && u.password === pass) || null;
    }
    if (authenticatedUser) {
      setState(prev => ({ ...prev, currentUser: authenticatedUser }));
      return true;
    }
    return false;
  };

  const logout = () => setState(prev => ({ ...prev, currentUser: null }));

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
    const userId = Math.random().toString(36).substr(2, 9);
    const newUser: User = { id: userId, favorites: [], ...userData } as User;
    let newShop: Shop | undefined;
    if (shopData) {
      newShop = { id: Math.random().toString(36).substr(2, 9), ownerId: userId, code: generateShopCode(shopData.name || 'SF'), isOpen: false, isAutomatic: false, locationVisible: true, businessHours: [], items: [], staff: [], contact: userData.phone!, ...shopData } as Shop;
      newUser.shopId = newShop.id;
    }
    setState(prev => ({ ...prev, allUsers: [...prev.allUsers, newUser], shops: newShop ? [...prev.shops, newShop] : prev.shops }));
    return { success: true };
  };

  const updateShop = (shopId: string, updates: Partial<Shop>) => {
    setState(prev => {
      const oldShop = prev.shops.find(s => s.id === shopId);
      const newHistory: HistoryItem[] = [];
      if (oldShop && updates.isOpen !== undefined && updates.isOpen !== oldShop.isOpen) {
        newHistory.push({ id: Math.random().toString(36).substr(2, 9), username: prev.currentUser?.username || 'Unknown', action: updates.isOpen ? 'Opened Facility' : 'Closed Facility', timestamp: Date.now(), shopId });
      }
      return { ...prev, shops: prev.shops.map(s => s.id === shopId ? { ...s, ...updates } : s), history: [...prev.history, ...newHistory] };
    });
  };

  const updatePassword = (newPassword: string) => {
    if (!state.currentUser) return;
    setState(prev => {
      const updatedUser = { ...prev.currentUser!, password: newPassword };
      return {
        ...prev,
        currentUser: updatedUser,
        allUsers: prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
      };
    });
  };

  const toggleFavorite = (shopId: string) => {
    if (!state.currentUser) return;
    setState(prev => {
      const favorites = prev.currentUser!.favorites.includes(shopId) ? prev.currentUser!.favorites.filter(id => id !== shopId) : [...prev.currentUser!.favorites, shopId];
      const updatedUser = { ...prev.currentUser!, favorites };
      return { ...prev, currentUser: updatedUser, allUsers: prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u) };
    });
  };

  const addComment = (shopId: string, text: string) => {
    if (!state.currentUser) return;
    const newComment: Comment = { id: Math.random().toString(36).substr(2, 9), userId: state.currentUser.id, shopId, username: state.currentUser.username, text, timestamp: Date.now() };
    setState(prev => ({ ...prev, comments: [newComment, ...prev.comments.filter(c => c.shopId !== shopId)] }));
  };

  const resetPassword = (identifier: string, newPass: string): boolean => {
    const user = state.allUsers.find(u => u.username === identifier || u.phone === identifier);
    if (user) {
      setState(prev => ({
        ...prev,
        allUsers: prev.allUsers.map(u => u.id === user.id ? { ...u, password: newPass } : u)
      }));
      return true;
    }
    return false;
  };

  return (
    <MemoryRouter>
      <Routes>
        {!state.currentUser ? (
          <>
            <Route path="/login" element={<LoginPage onLogin={login} />} />
            <Route path="/signup" element={<SignupPage onSignup={registerUser} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage onReset={resetPassword} />} />
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
                <Route path="/available" element={<AvailablePage state={state} onLogout={logout} onToggleFavorite={toggleFavorite} onAddComment={addComment} />} />
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
