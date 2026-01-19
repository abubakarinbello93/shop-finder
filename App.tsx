import React, { useState, useEffect } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
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
  const [state, setState] = useState<AppState>({
    currentUser: null,
    shops: [],
    allUsers: [],
    history: [],
    comments: []
  });

  // Initial Data Load from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        const shopsSnap = await getDocs(collection(db, 'shops'));
        const usersSnap = await getDocs(collection(db, 'users'));
        
        const fetchedShops = shopsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
        const fetchedUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));

        setState(prev => ({
          ...prev,
          shops: fetchedShops.length > 0 ? fetchedShops : MOCK_SHOPS as any,
          allUsers: fetchedUsers
        }));
      } catch (error: any) {
        console.error("Fetch error:", error);
      }
    };
    fetchData();
  }, []);

  const login = (identifier: string, pass: string, isStaff: boolean, shopCode?: string): boolean => {
    let authenticatedUser: User | null = null;

    if (isStaff && shopCode) {
      const shop = state.shops.find(s => s.code.toLowerCase() === shopCode.toLowerCase());
      if (shop) {
        const staffMember = shop.staff?.find(st => st.username === identifier && st.password === pass);
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
        return { success: false, message: "Sorry, that account identifier is already in use!" };
      }

      // 1. Prepare User Object (Explicitly clean undefined for Firestore)
      const newUserObj = {
        username: userData.username || '',
        password: userData.password || '', 
        phone: userData.phone || '',
        email: userData.email || '',
        favorites: [],
        isStaff: false,
        isAdmin: false,
        shopId: null as string | null
      };

      let createdShopId = '';
      let finalShopObj: any = null;

      // 2. If registering a shop, save shop first
      if (shopData) {
        const newShopRecord = {
          ownerId: 'pending', // Temporary, will update after user is created
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
        newUserObj.shopId = createdShopId;
        finalShopObj = { id: createdShopId, ...newShopRecord };
      }

      // 3. Save User to Firestore
      const userDocRef = await addDoc(collection(db, 'users'), newUserObj);
      const userId = userDocRef.id;

      // 4. Update Shop with real Owner ID if it was created
      if (createdShopId && finalShopObj) {
        const shopRef = doc(db, 'shops', createdShopId);
        await updateDoc(shopRef, { ownerId: userId });
        finalShopObj.ownerId = userId;
      }

      const newUserWithId: User = { id: userId, ...newUserObj } as any;

      // Update Local State
      setState(prev => ({
        ...prev,
        allUsers: [...prev.allUsers, newUserWithId],
        shops: finalShopObj ? [...prev.shops, finalShopObj] : prev.shops
      }));

      return { success: true };
    } catch (error: any) {
      console.error("Registration Critical Error:", error);
      alert(`Registration Error: ${error.message}\nCheck your Firebase configuration or internet connection.`);
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

      // Update user document to link to shop
      const userRef = doc(db, 'users', state.currentUser.id);
      await updateDoc(userRef, { shopId: shopId });

      setState(prev => {
        const updatedUser = { ...prev.currentUser!, shopId: shopId };
        return {
          ...prev,
          currentUser: updatedUser,
          allUsers: prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u),
          shops: [...prev.shops, { id: shopId, ...newShopRecord } as Shop]
        };
      });
      alert("Facility listed successfully!");
    } catch (error: any) {
      console.error("Shop registration failed:", error);
      alert(`Error Registering Shop: ${error.message}`);
    }
  };

  const updateShop = async (shopId: string, updates: Partial<Shop>) => {
    try {
      const shopRef = doc(db, 'shops', shopId);
      // Ensure no undefined values are sent to Firestore
      const cleanUpdates = JSON.parse(JSON.stringify(updates));
      await updateDoc(shopRef, cleanUpdates);

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
    } catch (error: any) {
      alert(`Update Error: ${error.message}`);
    }
  };

  const updatePassword = async (newPassword: string) => {
    if (!state.currentUser) return;
    try {
      const userRef = doc(db, 'users', state.currentUser.id);
      await updateDoc(userRef, { password: newPassword });

      setState(prev => {
        const updatedUser = { ...prev.currentUser!, password: newPassword };
        return {
          ...prev,
          currentUser: updatedUser,
          allUsers: prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
        };
      });
    } catch (error: any) {
      alert(`Password Update Error: ${error.message}`);
    }
  };

  const toggleFavorite = async (shopId: string) => {
    if (!state.currentUser) return;
    try {
      const favorites = state.currentUser.favorites.includes(shopId)
        ? state.currentUser.favorites.filter(id => id !== shopId)
        : [...state.currentUser.favorites, shopId];
      
      const userRef = doc(db, 'users', state.currentUser.id);
      await updateDoc(userRef, { favorites });

      setState(prev => {
        const updatedUser = { ...prev.currentUser!, favorites };
        return {
          ...prev,
          currentUser: updatedUser,
          allUsers: prev.allUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
        };
      });
    } catch (error: any) {
      alert(`Favorite Error: ${error.message}`);
    }
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

  const handleResetPassword = async (identifier: string, newPassword: string): Promise<boolean> => {
    const user = state.allUsers.find(u => u.username === identifier || u.phone === identifier);
    if (!user) return false;
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { password: newPassword });
      
      setState(prev => ({
        ...prev,
        allUsers: prev.allUsers.map(u => u.id === user.id ? { ...u, password: newPassword } : u)
      }));
      return true;
    } catch (error: any) {
      alert(`Reset Error: ${error.message}`);
      return false;
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
