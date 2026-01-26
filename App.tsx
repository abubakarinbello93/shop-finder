import React, { useState, useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, deleteDoc, getDocs, getDoc, setDoc, where, orderBy, limit, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from './firebase';
import { User, Shop, AppState, HistoryItem, Comment, BusinessHour, ServiceItem } from './types';
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
  const cleaned = id.replace(/\s+/g, '').trim().toLowerCase();
  if (cleaned.includes('@')) return cleaned;
  return `${cleaned}@shop.com`;
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
  const lastRestockCheck = useRef<number>(0);

  // 1. AUTH STATE OBSERVER
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            setState(prev => ({ ...prev, currentUser: userData }));
            if (userData.phone) {
              localStorage.setItem('rememberedPhone', userData.phone);
            }
          } else {
            if (!state.currentUser?.isStaff) {
              setState(prev => ({ ...prev, currentUser: null }));
            }
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setState(prev => ({ ...prev, currentUser: null }));
        }
      } else {
        setState(prev => {
          if (prev.currentUser?.isStaff) return prev;
          return { ...prev, currentUser: null };
        });
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, [state.currentUser?.isStaff]);

  // 2. REAL-TIME CLOUD LISTENERS
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
        if (prev.currentUser?.isStaff) return { ...prev, allUsers: fetchedUsers };
        return { ...prev, allUsers: fetchedUsers, currentUser: matching || prev.currentUser };
      });
    });

    const unsubComments = onSnapshot(collection(db, 'comments'), (snapshot) => {
      const fetchedComments = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
      setState(prev => ({ ...prev, comments: fetchedComments }));
    });

    const unsubHistory = onSnapshot(collection(db, 'history'), (snapshot) => {
      const fetchedHistory = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as HistoryItem));
      setState(prev => ({ ...prev, history: fetchedHistory }));
    });

    return () => {
      unsubShops();
      unsubUsers();
      unsubComments();
      unsubHistory();
    };
  }, [state.currentUser?.id]);

  // 3. AUTOMATIC MODE TIMER & SMART RESTOCK CHECKER
  useEffect(() => {
    const runSystemChecks = async () => {
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
      const currentTimestamp = Date.now();

      // a. Check Business Hours (runs once per minute)
      if (currentTime !== lastCheckedTime.current) {
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
      }

      // b. Check Smart Restock (runs every 30 seconds)
      if (currentTimestamp - lastRestockCheck.current > 30000) {
        lastRestockCheck.current = currentTimestamp;
        for (const shop of state.shops) {
          let needsUpdate = false;
          const updatedItems = (shop.items || []).map(item => {
            if (item.restockDate && currentTimestamp >= item.restockDate) {
              needsUpdate = true;
              return { ...item, available: true, restockDate: undefined };
            }
            return item;
          });
          if (needsUpdate) {
            await updateShop(shop.id, { items: updatedItems });
          }
        }
      }
    };

    const intervalId = setInterval(runSystemChecks, 30000);
    runSystemChecks();
    return () => clearInterval(intervalId);
  }, [state.shops]);

  const login = async (identifier: string, pass: string, isStaff: boolean, shopCode?: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      if (isStaff && shopCode) {
        const shopsRef = collection(db, 'shops');
        const q = query(shopsRef, where("code", "==", shopCode));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setLoading(false);
          return false;
        }

        const shopDoc = querySnapshot.docs[0];
        const shopData = shopDoc.data() as Shop;
        const staffMember = (shopData.staff || []).find(s => s.username === identifier && s.password === pass);

        if (staffMember) {
          const staffUser: User = {
            id: staffMember.id,
            username: staffMember.username,
            phone: '',
            isStaff: true,
            shopId: shopDoc.id,
            canAddItems: staffMember.canAddItems,
            favorites: []
          };
          setState(prev => ({ ...prev, currentUser: staffUser }));
          localStorage.setItem('rememberedPhone', identifier);
          setLoading(false);
          return true;
        }
        setLoading(false);
        return false;
      }

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
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const registerUser = async (userData: Partial<User>, shopData?: Partial<Shop>): Promise<{ success: boolean; message?: string }> => {
    try {
      if (userData.password && userData.password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters long." };
      }

      setLoading(true);
      const loginIdentifier = userData.phone || userData.username!;
      const email = identifierToEmail(loginIdentifier);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, userData.password!);
      const userId = userCredential.user.uid;

      try {
        const newUserObj = {
          username: userData.username || '',
          phone: userData.phone || '',
          email: email,
          favorites: [],
          isStaff: false,
          isAdmin: false,
          shopId: null
        };

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
          newUserObj.shopId = shopDocRef.id;
        }

        await setDoc(doc(db, 'users', userId), newUserObj);
        if (userData.phone) {
          localStorage.setItem('rememberedPhone', userData.phone);
        }

        return { success: true };
      } catch (firestoreErr: any) {
        console.error("Firestore error during registration:", firestoreErr);
        return { success: false, message: "Profile created, but database configuration failed: " + firestoreErr.message };
      }
    } catch (error: any) {
      console.error("Auth Registration Error:", error);
      setLoading(false);
      if (error.code === 'auth/email-already-in-use') {
        return { success: false, message: 'This phone number is already registered.' };
      }
      return { success: false, message: error.message };
    }
  };

  const handleRegisterShop = async (shopData: Partial<Shop>) => {
    if (!state.currentUser) return;
    try {
      setLoading(true);
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
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      console.error("Error Registering Shop:", error);
      alert(`Permissions/Database Error: ${error.message}`);
    }
  };

  const updateShop = async (shopId: string, updates: Partial<Shop>, isAutoToggle: boolean = false) => {
    try {
      const shopRef = doc(db, 'shops', shopId);
      await updateDoc(shopRef, updates);
      
      if (updates.isOpen !== undefined) {
        const username = isAutoToggle ? 'System Auto-Mode' : (state.currentUser?.username || 'Unknown');
        const historyEntry = {
          changedBy: username,
          status: updates.isOpen ? 'Open' : 'Closed',
          timestamp: Date.now(),
          shopId: shopId,
          username: username,
          action: updates.isOpen ? 'Facility Opened' : 'Facility Closed'
        };
        
        await addDoc(collection(db, 'shops', shopId, 'history'), historyEntry);
        await addDoc(collection(db, 'history'), historyEntry);
      }
    } catch (error: any) {
      console.error("Firestore Update Error:", error);
    }
  };

  const updatePassword = async (newPassword: string) => {
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
      const q = query(collection(db, 'shops', state.currentUser.shopId, 'history'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
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
