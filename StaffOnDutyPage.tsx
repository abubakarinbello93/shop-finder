import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, ArrowLeft, RefreshCw, Briefcase, UserCheck, ShieldAlert, Search } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, Staff } from './types';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from './firebase';

const StaffOnDutyPage: React.FC<{ state: AppState, onLogout: () => void, onUpdateShop: (id: string, updates: Partial<Shop>) => void }> = ({ state, onLogout, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);
  
  const [activeEntries, setActiveEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userShop) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const monthYear = `${new Date().getMonth() + 1}_${new Date().getFullYear()}`;
    const entriesRef = collection(db, 'shops', userShop.id, 'registers', monthYear, 'entries');
    
    // Listen for entries from today that are signed in but not signed out
    const q = query(entriesRef, where('date', '==', todayStr));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const currentlyOnDuty = entries.filter((e: any) => e.signIn && !e.signOut && !e.absent);
      setActiveEntries(currentlyOnDuty);
      setIsLoading(false);
    }, (error) => {
      console.error("Duty Stream Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userShop?.id]);

  const onDutyStaff = useMemo(() => {
    if (!userShop) return [];
    
    // Match entries to staff profiles and sort
    const matched = activeEntries.map(entry => {
      const profile = userShop.staff.find(s => s.id === entry.staffId);
      return { ...entry, profile };
    }).filter(e => e.profile);

    // Filter by search
    const filtered = matched.filter(e => 
      e.profile.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.profile.position.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort: Position A-Z, then Name A-Z
    return filtered.sort((a, b) => {
      const posCompare = a.profile.position.localeCompare(b.profile.position);
      if (posCompare !== 0) return posCompare;
      return a.profile.username.localeCompare(b.profile.username);
    });
  }, [activeEntries, userShop, searchTerm]);

  if (!userShop) {
    return (
      <Layout user={currentUser!} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center py-40">
           <ShieldAlert className="h-20 w-20 text-slate-200 mb-6" />
           <p className="font-black text-slate-400 uppercase tracking-widest">No Linked Facility</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all uppercase text-[10px] tracking-widest"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Workspace
        </button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Live Duty Feed</h1>
            <p className="text-slate-400 font-bold mt-4 uppercase tracking-[0.2em] text-xs flex items-center gap-2">
              <RefreshCw className="h-3 w-3 animate-spin-slow text-green-500" /> Real-time tracking active
            </p>
          </div>
          <div className="bg-white px-8 py-5 rounded-[24px] shadow-sm border border-slate-100 flex items-center gap-6">
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">On-Site Now</p>
                <p className="text-3xl font-black text-blue-600 leading-none">{onDutyStaff.length}</p>
             </div>
             <div className="h-10 w-px bg-slate-100" />
             <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Team</p>
                <p className="text-3xl font-black text-slate-900 leading-none">{userShop.staff.length}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="relative mb-10 max-w-xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
        <input 
          type="text"
          className="w-full pl-14 pr-6 py-5 bg-white border-2 border-transparent rounded-[24px] font-black text-lg shadow-sm focus:border-blue-600 focus:bg-white outline-none transition-all placeholder:text-slate-200"
          placeholder="Filter by name or position..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-40 text-center flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Accessing Satellite Feed...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {onDutyStaff.map((entry) => {
            const since = entry.signIn ? new Date(entry.signIn.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            return (
              <div key={entry.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all hover:shadow-xl hover:-translate-y-1 animate-in zoom-in-95 duration-500">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[24px] bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {entry.profile.username.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-slate-900 tracking-tight leading-none mb-2 uppercase">{entry.profile.username}</h3>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" /> {entry.profile.position}
                      </p>
                    </div>
                  </div>
                  <div className="p-2 bg-green-50 text-green-500 rounded-full animate-pulse shadow-sm">
                    <UserCheck className="h-5 w-5" />
                  </div>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sign-In Time</p>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{since}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Key</p>
                    <p className="text-sm font-black text-blue-600 uppercase tracking-tight">#{entry.profile.staffCode}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">{entry.wentOut ? 'On Break' : 'On Site'}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 right-0 -mr-6 -mb-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                  <Users className="h-40 w-40" />
                </div>
              </div>
            );
          })}

          {onDutyStaff.length === 0 && (
            <div className="col-span-full py-40 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
               <div className="p-8 bg-slate-50 rounded-[32px] mb-6">
                 <Users className="h-16 w-16 text-slate-200" />
               </div>
               <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tighter">Quiet Environment</h3>
               <p className="text-slate-400 font-bold text-base mt-2 uppercase tracking-widest">No staff members currently clocked in.</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default StaffOnDutyPage;
