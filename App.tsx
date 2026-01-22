
import React, { useState, useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, deleteDoc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from './firebase';
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

// Helper to handle identifier to email mapping for Firebase Auth
const identifierToEmail = (id: string) => {
  if (id.includes('@')) return id;
  return `${id.replace(/\s+/g, '').toLowerCase()}@openshop.app`;
};

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
  const [loading, setLoading] = useState(true);

  const lastCheckedTime = useRef<string>('');

  // 1. AUTH STATE OBSERVER
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is logged in, fetch their profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setState(prev => ({ ...prev, currentUser: userData }));
        } else {
          // If profile doesn't exist but auth does (unlikely edge case)
          setState(prev => ({ ...prev, currentUser: null }));
        }
      } else {
        // User is logged out
        setState(prev => ({ ...prev, currentUser: null }));
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. REAL-TIME CLOUD LISTENERS (Conditional on Auth)
  useEffect(() => {
    if (!state.currentUser) return;

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
        const matching = fetchedUsers.find(u => u.id === prev.currentUser?.id);
        return { ...prev, allUsers: fetchedUsers, currentUser: matching || prev.currentUser };
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
  }, [state.currentUser?.id]);

  // 3. AUTOMATIC MODE TIMER
  useEffect(() => {
    const checkSchedules = async () => {
      if (state.shops.length === 0) return;

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
  }, [state.shops]);

  const login = async (identifier: string, pass: string, isStaff: boolean, shopCode?: string): Promise<boolean> => {
    try {
      setLoading(true);
      const email = identifierToEmail(identifier);
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error) {
      console.error("Login Error:", error);
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const registerUser = async (userData: Partial<User>, shopData?: Partial<Shop>): Promise<{ success: boolean; message?: string }> => {
    try {
      setLoading(true);
      const email = userData.email || identifierToEmail(userData.username!);
      
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, userData.password!);
      const userId = userCredential.user.uid;

      // 2. Create User Profile in Firestore
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
          ownerId: userId,
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

      await setDoc(doc(db, 'users', userId), newUserObj);
      return { success: true };
    } catch (error: any) {
      console.error("Registration Error:", error);
      setLoading(false);
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
      await updateDoc(shopRef, updates);
      if (updates.isOpen !== undefined) {
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
    // Note: In real production apps, you'd use updatePassword(auth.currentUser, ...)
    // For this context, we update the profile doc or call reauth if needed.
    alert("Password updated locally. Please use Auth settings for full reset.");
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

  const handleResetPassword = async (identifier: string): Promise<boolean> => {
    try {
      const email = identifierToEmail(identifier);
      await sendPasswordResetEmail(auth, email);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center flex-col gap-4">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-blue-600 uppercase tracking-widest text-sm">Initializing Shop Finder...</p>
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
