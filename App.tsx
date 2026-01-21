import React, { useState, useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { User, Shop, AppState, HistoryItem, Comment, BusinessHour } from './types';
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
  const [state, setState] = useState<AppState>({
    currentUser: null,
    shops: [],
    allUsers: [],
    history: [],
    comments: []
  });

  // 1. REAL-TIME CLOUD LISTENERS
  useEffect(() => {
    const unsubShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
      const fetchedShops = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
      setState(prev => ({ 
        ...prev, 
        shops: fetchedShops.length > 0 ? fetchedShops : MOCK_SHOPS as any 
      }));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
      setState(prev => {
        let updatedCurrentUser = prev.currentUser;
        if (prev.currentUser && !prev.currentUser.isStaff) {
          const matching = fetchedUsers.find(u => u.id === prev.currentUser?.id);
          if (matching) updatedCurrentUser = matching;
        }
        return { ...prev, allUsers: fetchedUsers, currentUser: updatedCurrentUser };
      });
    });

    const unsubHistory = onSnapshot(collection(db, 'history'), (snapshot) => {
      const fetchedHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HistoryItem));
      setState(prev => ({ ...prev, history: fetchedHistory }));
    });

    const unsubComments = onSnapshot(collection(db, 'comments'), (snapshot) => {
      const fetchedComments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
      setState(prev => ({ ...prev, comments: fetchedComments }));
    });

    return () => {
      unsubShops();
      unsubUsers();
      unsubHistory();
      unsubComments();
    };
  }, []);

  // 2. AUTOMATIC MODE TIMER (Runs every 60 seconds)
  useEffect(() => {
    const checkSchedules = async () => {
      if (state.shops.length === 0) return;

      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = days[now.getDay()];
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      for (const shop of state.shops) {
        if (!shop.isAutomatic) continue;

        const schedule = (shop.businessHours || []).find(bh => bh.day === currentDay && bh.enabled);
        let shouldBeOpen = false;

        if (schedule) {
          shouldBeOpen = currentTime >= schedule.open && currentTime < schedule.close;
        }

        // Only update if state in cloud is different to avoid infinite loop / redundant writes
        if (shouldBeOpen !== shop.isOpen) {
          console.log(`Auto-toggling ${shop.name}: ${shouldBeOpen ? 'OPEN' : 'CLOSE'}`);
          await updateShop(shop.id, { isOpen: shouldBeOpen }, true);
        }
      }
    };

    const intervalId = setInterval(checkSchedules, 60000);
    checkSchedules(); // Run immediately on mount

    return () => clearInterval(intervalId);
  }, [state.shops]);

  const login = (identifier: string, pass: string, isStaff: boolean, shopCode?: string): boolean => {
    let authenticatedUser: User | null = null;
    
    if (isStaff && shopCode) {
      const shop = state.shops.find(s => s.code.toLowerCase() === shopCode.toLowerCase());
      if (shop && shop.staff) {
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

  const registerUser = async (userData: Partial<User>, shopData?: Partial<Shop>): Promise<{ success: boolean; message?: string }> => {
    try {
      const usernameTaken = state.allUsers.some(u => u.username.toLowerCase() === userData.username?.toLowerCase());
      const phoneTaken = state.allUsers.some(u => u.phone === userData.phone);

      if (usernameTaken || phoneTaken) {
        return { success: false, message: "Username or phone is already taken." };
      }

      const newUserObj = {
        username: userData.username || '',
        password: userData.password || '', 
        phone: userData.phone || '',
        email: userData.email || '',
        favorites: [],
        isStaff: false,
        isAdmin: false,
        shopId: null
      };

      let createdShopId: string | null = null;

      if (shopData) {
        const newShopRecord = {
          ownerId: 'pending',
          code: generateShopCode(shopData.name || 'Shop'),
          name: shopData.name || 'My Facility',
          type: shopData.type || 'General',
          state: shopData.state || '',
          lga: shopData.lga || '',
          address: shopData.address || '',
          contact: userData.phone || '',
          isOpen: false,
          isAutomatic: false,
          locationVisible: true,
          businessHours: [],
          items: [],
          staff: [],
          location: shopData.location || null
        };
        const shopDocRef = await addDoc(collection(db, 'shops'), newShopRecord);
        createdShopId = shopDocRef.id;
        (newUserObj as any).shopId = createdShopId;
      }

      const userDocRef = await addDoc(collection(db, 'users'), newUserObj);
      const userId = userDocRef.id;

      if (createdShopId) {
        await updateDoc(doc(db, 'shops', createdShopId), { ownerId: userId });
      }

      return { success: true };
    } catch (error: any) {
      console.error("Registration Error:", error);
      alert(`Firestore Error: ${error.message}`);
      return { success: false, message: error.message };
    }
  };

  const handleRegisterShop = async (shopData: Partial<Shop>) => {
    if (!state.currentUser) return;
    try {
      const newShopRecord = {
        ownerId: state.currentUser.id,
        code: generateShopCode(shopData.name || 'Shop'),
        name: shopData.name || '',
        type: shopData.type || '',
        state: shopData.state || '',
        lga: shopData.lga || '',
        address: shopData.address || '',
        contact: state.currentUser.phone,
        isOpen: false,
        isAutomatic: false,
        locationVisible: true,
        businessHours: [],
        items: [],
        staff: [],
        location: shopData.location || null
      };
      const docRef = await addDoc(collection(db, 'shops'), newShopRecord);
      const shopId = docRef.id;
      await updateDoc(doc(db, 'users', state.currentUser.id), { shopId });
      alert("Facility listed successfully!");
    } catch (error: any) {
      alert(`Error Registering Shop: ${error.message}`);
    }
  };

  const updateShop = async (shopId: string, updates: Partial<Shop>, isAutoToggle: boolean = false) => {
    try {
      const shopRef = doc(db, 'shops', shopId);
      const cleanUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) cleanUpdates[key] = value;
      });
      
      await updateDoc(shopRef, cleanUpdates);

      const oldShop = state.shops.find(s => s.id === shopId);
      if (oldShop && updates.isOpen !== undefined && updates.isOpen !== oldShop.isOpen) {
        await addDoc(collection(db, 'history'), {
          username: isAutoToggle ? 'System Auto-Mode' : (state.currentUser?.username || 'Unknown'),
          action: updates.isOpen ? 'Opened Facility' : 'Closed Facility',
          timestamp: Date.now(),
          shopId
        });
      }
    } catch (error: any) {
      console.error("Firestore Update Error:", error);
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!state.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', state.currentUser.id), { password: newPassword });
    } catch (error: any) {
      alert(`Cloud Error: ${error.message}`);
    }
  };

  const toggleFavorite = async (shopId: string) => {
    if (!state.currentUser) return;
    try {
      const favorites = state.currentUser.favorites.includes(shopId)
        ? state.currentUser.favorites.filter(id => id !== shopId)
        : [...state.currentUser.favorites, shopId];
      await updateDoc(doc(db, 'users', state.currentUser.id), { favorites });
    } catch (error: any) {
      alert(`Cloud Error: ${error.message}`);
    }
  };

  const addComment = async (shopId: string, text: string) => {
    if (!state.currentUser) return;
    try {
      await addDoc(collection(db, 'comments'), {
        userId: state.currentUser.id,
        shopId,
        username: state.currentUser.username,
        text: text,
        timestamp: Date.now()
      });
    } catch (error: any) {
      alert(`Cloud Error: ${error.message}`);
    }
  };

  const handleResetPassword = async (identifier: string, newPassword: string): Promise<boolean> => {
    const user = state.allUsers.find(u => u.username === identifier || u.phone === identifier);
    if (!user) return false;
    try {
      await updateDoc(doc(db, 'users', user.id), { password: newPassword });
      return true;
    } catch (error: any) {
      alert(`Reset Error: ${error.message}`);
      return false;
    }
  };

  const clearHistory = async () => {
    if (!state.currentUser?.shopId) return;
    try {
      const q = query(collection(db, 'history'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs
        .filter(d => d.data().shopId === state.currentUser?.shopId)
        .map(d => deleteDoc(doc(db, 'history', d.id)));
      await Promise.all(deletePromises);
    } catch (error: any) {
      alert(`Clear Error: ${error.message}`);
    }
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
                <Route path="/history" element={<HistoryPage state={state} onLogout={logout} onClearHistory={clearHistory} />} />
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
