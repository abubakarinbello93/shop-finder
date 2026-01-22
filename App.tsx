import React, { useState, useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, deleteDoc, getDocs, where } from 'firebase/firestore';
import { db, auth } from './firebase';
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
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>({
    currentUser: null,
    shops: [],
    allUsers: [],
    history: [],
    comments: []
  });

  const lastCheckedTime = useRef<string>('');

  // 1. AUTH & DATA FETCHING LOGIC
  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // 2. SETUP AUTHENTICATED LISTENERS
        // Only fetch collections if auth is confirmed
        const unsubShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
          const fetchedShops = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Shop));
          setState(prev => ({ 
            ...prev, 
            shops: fetchedShops.length > 0 ? fetchedShops : MOCK_SHOPS as any 
          }));
        });

        // Fetch User Profile from Firestore to match Auth User
        const userQuery = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
        const unsubUser = onSnapshot(userQuery, (snapshot) => {
          if (!snapshot.empty) {
            const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
            setState(prev => ({ ...prev, currentUser: userData }));
          }
          setLoading(false);
        });

        const unsubAllUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const fetchedUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
          setState(prev => ({ ...prev, allUsers: fetchedUsers }));
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
          unsubUser();
          unsubAllUsers();
          unsubHistory();
          unsubComments();
        };
      } else {
        // 3. USER LOGGED OUT
        setState({
          currentUser: null,
          shops: [],
          allUsers: [],
          history: [],
          comments: []
        });
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 4. AUTOMATIC MODE TIMER (WAT - Nigeria Time Transition Boundaries)
  useEffect(() => {
    if (!state.currentUser || state.shops.length === 0) return;

    const checkSchedules = async () => {
      const now = new Date();
      const nigeriaTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Lagos',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'long'
      });
      
      const parts = nigeriaTime.formatToParts(now);
      const currentDay = parts.find(p => p.type === 'weekday')?.value || '';
      const hourStr = parts.find(p => p.type === 'hour')?.value || '00';
      const minStr = parts.find(p => p.type === 'minute')?.value || '00';
      const currentTime = `${hourStr}:${minStr}`;

      if (currentTime === lastCheckedTime.current) return;
      lastCheckedTime.current = currentTime;

      for (const shop of state.shops) {
        if (!shop.isAutomatic) continue;
        const schedule = (shop.businessHours || []).find(bh => bh.day === currentDay && bh.enabled);
        if (!schedule) continue;

        if (currentTime === schedule.open && !shop.isOpen) {
          await updateShop(shop.id, { isOpen: true }, true);
        } else if (currentTime === schedule.close && shop.isOpen) {
          await updateShop(shop.id, { isOpen: false }, true);
        }
      }
    };

    const intervalId = setInterval(checkSchedules, 60000);
    checkSchedules();
    return () => clearInterval(intervalId);
  }, [state.shops, state.currentUser]);

  const login = async (identifier: string, pass: string, isStaff: boolean, shopCode?: string): Promise<boolean> => {
    try {
      // If the identifier is not an email, we resolve it from our allUsers list or use a mapping
      let emailToUse = identifier;
      if (!identifier.includes('@')) {
        const found = state.allUsers.find(u => u.username === identifier || u.phone === identifier);
        if (found && found.email) {
          emailToUse = found.email;
        } else {
          // Placeholder email if user only has username/phone in Firestore
          emailToUse = `${identifier.replace(/\s/g, '')}@openshop.com`;
        }
      }

      await signInWithEmailAndPassword(auth, emailToUse, pass);
      return true;
    } catch (error) {
      console.error("Auth Login Error:", error);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const registerUser = async (userData: Partial<User>, shopData?: Partial<Shop>): Promise<{ success: boolean; message?: string }> => {
    try {
      const email = userData.email || `${userData.username?.replace(/\s/g, '')}@openshop.com`;
      
      // 1. Create User in Firebase Auth
      await createUserWithEmailAndPassword(auth, email, userData.password || '');

      // 2. Save Profile in Firestore
      const newUserObj = {
        username: userData.username || '',
        phone: userData.phone || '',
        email: email,
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
          currentStatus: '',
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
      if (createdShopId) {
        await updateDoc(doc(db, 'shops', createdShopId), { ownerId: userDocRef.id });
      }

      return { success: true };
    } catch (error: any) {
      console.error("Registration Error:", error);
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
        currentStatus: '',
        businessHours: [],
        items: [],
        staff: [],
        location: shopData.location || null
      };
      const docRef = await addDoc(collection(db, 'shops'), newShopRecord);
      await updateDoc(doc(db, 'users', state.currentUser.id), { shopId: docRef.id });
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

      if (updates.isOpen !== undefined) {
        const targetShop = state.shops.find(s => s.id === shopId);
        if (targetShop && targetShop.isOpen !== updates.isOpen) {
           await addDoc(collection(db, 'history'), {
            username: isAutoToggle ? 'System Auto-Mode' : (state.currentUser?.username || 'Unknown'),
            action: updates.isOpen ? 'Opened Facility' : 'Closed Facility',
            timestamp: Date.now(),
            shopId
          });
        }
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
      const q = query(collection(db, 'history'), where('shopId', '==', state.currentUser.shopId));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'history', d.id)));
      await Promise.all(deletePromises);
    } catch (error: any) {
      alert(`Clear Error: ${error.message}`);
    }
  };

  // 5. LOADING SPINNER COMPONENT
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h1 className="text-blue-600 font-black text-2xl tracking-tighter uppercase mb-1">OPENSHOP</h1>
            <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">Initializing Security...</p>
          </div>
        </div>
      </div>
    );
  }

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
                <Route path="/available" element={<AvailablePage state={state} onLogout={logout} onToggleFavorite={toggleFavorite} onUpdateShop={updateShop} />} />
                <Route path="/favorites" element={<FavoritesPage state={state} onLogout={logout} onToggleFavorite={toggleFavorite} onUpdateShop={updateShop} onAddComment={addComment} />} />
                <Route path="/settings" element={<SettingsPage state={state} onLogout={logout} onUpdateShop={updateShop} onUpdatePassword={updatePassword} />} />
                <Route path="/history" element={<HistoryPage state={state} onLogout={logout} onClearHistory={clearHistory} onUpdateShop={updateShop} />} />
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
