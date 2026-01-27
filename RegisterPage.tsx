import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Plus, 
  Trash2, 
  Clock, 
  ArrowLeft, 
  X, 
  Save, 
  Check, 
  Search, 
  Printer, 
  History, 
  Calendar, 
  MoreVertical,
  LogOut,
  LogIn,
  Moon,
  Coffee,
  AlertTriangle,
  FileText,
  ShieldAlert
} from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, Staff, Shift } from './types';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  setDoc, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const RegisterPage: React.FC<{ state: AppState, onLogout: () => void, onUpdateShop: (id: string, updates: Partial<Shop>) => void }> = ({ state, onLogout, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'library'>('daily');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [newShift, setNewShift] = useState<Partial<Shift>>({ name: '', startTime: '09:00', endTime: '17:00' });
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);

  const monthYear = `${new Date().getMonth() + 1}_${new Date().getFullYear()}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const hasPermission = useMemo(() => {
    if (!currentUser || !userShop) return false;
    return userShop.ownerId === currentUser.id || currentUser.canManageRegister;
  }, [currentUser, userShop]);

  useEffect(() => {
    if (!userShop || !hasPermission) {
      setIsLoading(false);
      return;
    }

    // Listen for today's entries
    const entriesRef = collection(db, 'shops', userShop.id, 'registers', monthYear, 'entries');
    const q = query(entriesRef, where('date', '==', todayStr));

    const unsubEntries = onSnapshot(q, (snapshot) => {
      setDailyEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, (error) => {
      console.error("Register Entries Stream Error:", error);
      setIsLoading(false);
    });

    // Listen for monthly statistics
    const statsUnsub = onSnapshot(entriesRef, (snapshot) => {
      const all = snapshot.docs.map(d => d.data());
      setMonthlyStats(all);
    }, (error) => {
      console.error("Monthly Stats Stream Error:", error);
    });

    return () => { unsubEntries(); statsUnsub(); };
  }, [userShop?.id, monthYear, hasPermission]);

  const handleAddShift = () => {
    if (!userShop || !newShift.name) return;
    const s1 = parseInt(newShift.startTime!.split(':')[0]);
    const s2 = parseInt(newShift.endTime!.split(':')[0]);
    const duration = s2 > s1 ? s2 - s1 : (24 - s1) + s2;

    const shift: Shift = {
      id: Math.random().toString(36).substr(2, 9),
      name: newShift.name,
      startTime: newShift.startTime!,
      endTime: newShift.endTime!,
      durationHours: duration
    };

    onUpdateShop(userShop.id, { shiftLibrary: [...(userShop.shiftLibrary || []), shift] });
    setShowShiftModal(false);
    setNewShift({ name: '', startTime: '09:00', endTime: '17:00' });
  };

  const handleRegisterAction = async (staffId: string, action: string, data?: any) => {
    if (!userShop) return;
    const entryId = `${todayStr}_${staffId}`;
    const entryRef = doc(db, 'shops', userShop.id, 'registers', monthYear, 'entries', entryId);
    
    const updates: any = { 
      staffId, 
      date: todayStr, 
      lastModified: serverTimestamp(),
      changedBy: currentUser?.username 
    };

    switch(action) {
      case 'signIn': updates.signIn = serverTimestamp(); updates.absent = false; break;
      case 'signOut': updates.signOut = serverTimestamp(); break;
      case 'wentOut': updates.wentOut = serverTimestamp(); break;
      case 'comeBack': 
        updates.comeBack = serverTimestamp();
        updates.breakApproved = data.approved;
        break;
      case 'absent': updates.absent = true; updates.signIn = null; break;
      case 'overtime': updates.overtimeMinutes = data.minutes; break;
    }

    await setDoc(entryRef, updates, { merge: true });
  };

  const staffSummary = useMemo(() => {
    if (!userShop) return [];
    // Safety Fix 5: Fallback to empty array if staff is missing
    return (userShop.staff || []).map(s => {
      const staffEntries = monthlyStats.filter(e => e.staffId === s.id);
      
      let actualMinutes = 0;
      let lateMinutes = 0;
      let expectedHours = 0;

      // Safety Fix 1: Use fallback array for shiftLibrary
      const eligibleShifts = (userShop.shiftLibrary || []).filter(sh => s.eligibleShifts?.includes(sh.id));
      const avgShiftDuration = eligibleShifts.length > 0 
        ? eligibleShifts.reduce((acc, curr) => acc + curr.durationHours, 0) / eligibleShifts.length 
        : 8;

      staffEntries.forEach(e => {
        if (e.absent) {
          lateMinutes += (avgShiftDuration * 60);
          expectedHours += avgShiftDuration;
        } else if (e.signIn) {
          expectedHours += avgShiftDuration;
          
          if (e.signOut) {
            const start = (e.signIn?.seconds || 0) * 1000;
            const end = (e.signOut?.seconds || 0) * 1000;
            let duration = (end - start) / 60000;
            
            if (e.comeBack && !e.breakApproved) {
               const bStart = (e.wentOut?.seconds || 0) * 1000;
               const bEnd = (e.comeBack?.seconds || 0) * 1000;
               const bDur = (bEnd - bStart) / 60000;
               duration -= bDur;
               lateMinutes += bDur;
            }
            
            actualMinutes += duration;
          }
          
          if (e.overtimeMinutes) actualMinutes += parseInt(e.overtimeMinutes);
        }
      });

      return {
        ...s,
        expectedHours: expectedHours.toFixed(1),
        actualHours: (actualMinutes / 60).toFixed(1),
        lateTally: Math.round(lateMinutes)
      };
    });
  }, [userShop, monthlyStats]);

  const handlePrint = () => {
    window.print();
  };

  // Safety Fix 4: Add Loading State before hasPermission check
  if (isLoading) {
    return (
      <Layout user={currentUser!} onLogout={onLogout}>
        <div className="p-20 text-center font-black animate-pulse uppercase tracking-[0.2em] text-slate-400">
          Loading Register Data...
        </div>
      </Layout>
    );
  }

  // Check 3: Permissions Check - Show Access Denied instead of blank screen
  if (!hasPermission) {
    return (
      <Layout user={currentUser!} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
           <div className="p-10 bg-red-50 rounded-[50px] mb-8">
             <ShieldAlert className="h-20 w-20 text-red-400" />
           </div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Access Denied</h2>
           <p className="text-slate-400 font-bold max-w-sm mt-4 text-lg">
             You do not have permission to view or manage the Register. Please contact the facility owner for access.
           </p>
           <button 
             onClick={() => navigate('/dashboard')}
             className="mt-10 px-10 py-4 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all"
           >
             Back to Dashboard
           </button>
        </div>
      </Layout>
    );
  }

  if (!userShop) return (
    <Layout user={currentUser!} onLogout={onLogout}>
      <div className="p-20 text-center font-black">Link a facility to manage registers.</div>
    </Layout>
  );

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-10 no-print">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all uppercase text-[10px] tracking-widest"><ArrowLeft className="h-4 w-4" /> Workspace</button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Register System</h1>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                 <Calendar className="h-3.5 w-3.5" /> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={() => setShowInitModal(true)} className="flex items-center gap-3 px-6 py-4 bg-white border-2 border-slate-100 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                <History className="h-4 w-4" /> New Register
             </button>
             <button onClick={handlePrint} className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200">
                <Printer className="h-4 w-4" /> Print Sheet
             </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-100 mb-10 no-print">
        {[
          { id: 'daily', label: 'Call Register', icon: ClipboardList },
          { id: 'monthly', label: 'Record & Summary', icon: FileText },
          { id: 'library', label: 'Shift Library', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-6 px-4 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] transition-all border-b-4 ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'daily' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="relative mb-10 max-w-xl no-print">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            <input type="text" className="w-full pl-14 pr-6 py-5 bg-white border-2 border-transparent rounded-[24px] font-black text-lg shadow-sm focus:border-blue-600 outline-none" placeholder="Search by name or code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Safety Fix 2 & 5: Ensure staff list and staffCode check are safe */}
            {(userShop.staff || []).filter(s => s.username.toLowerCase().includes(searchTerm.toLowerCase()) || (s.staffCode || '').includes(searchTerm)).map(s => {
               const entry = dailyEntries.find(e => e.staffId === s.id);
               const isOnline = entry?.signIn && !entry?.signOut && !entry?.absent;
               const isAbsent = entry?.absent;
               
               return (
                 <div key={s.id} className={`p-8 bg-white rounded-[40px] border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 ${isOnline ? 'border-blue-600 shadow-xl shadow-blue-50' : isAbsent ? 'border-red-100 bg-red-50/30' : 'border-transparent shadow-sm'}`}>
                    <div className="flex items-center gap-6">
                       <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-xl ${isOnline ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                          {s.username.charAt(0)}
                       </div>
                       <div>
                          <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight">{s.username}</h3>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.position}</span>
                             <div className="w-1 h-1 rounded-full bg-slate-200" />
                             <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">#{s.staffCode}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                       {!isOnline && !isAbsent ? (
                         <>
                           <button onClick={() => handleRegisterAction(s.id, 'signIn')} className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-md flex items-center gap-2"><LogIn className="h-4 w-4" /> Sign In</button>
                           <button onClick={() => handleRegisterAction(s.id, 'absent')} className="px-6 py-3 bg-red-50 text-red-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-100 flex items-center gap-2"><X className="h-4 w-4" /> Absent</button>
                         </>
                       ) : isOnline ? (
                         <>
                           <button onClick={() => handleRegisterAction(s.id, 'signOut')} className="px-6 py-3 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2"><LogOut className="h-4 w-4" /> Sign Out</button>
                           {!entry.wentOut ? (
                             <button onClick={() => handleRegisterAction(s.id, 'wentOut')} className="px-6 py-3 bg-amber-50 text-amber-600 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2"><Coffee className="h-4 w-4" /> Went Out</button>
                           ) : !entry.comeBack ? (
                             <div className="flex gap-2">
                                <button onClick={() => handleRegisterAction(s.id, 'comeBack', { approved: true })} className="px-5 py-3 bg-green-600 text-white font-black rounded-2xl text-[9px] uppercase tracking-widest">Approved Back</button>
                                <button onClick={() => handleRegisterAction(s.id, 'comeBack', { approved: false })} className="px-5 py-3 bg-red-600 text-white font-black rounded-2xl text-[9px] uppercase tracking-widest">Unapproved</button>
                             </div>
                           ) : null}
                         </>
                       ) : (
                         <button onClick={() => handleRegisterAction(s.id, 'signIn')} className="px-6 py-3 bg-slate-100 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest">Mark Present</button>
                       )}
                       
                       <div className="flex items-center gap-2 ml-4">
                          <input 
                            type="number" 
                            className="w-16 p-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs text-center" 
                            placeholder="+OT" 
                            onBlur={(e) => handleRegisterAction(s.id, 'overtime', { minutes: e.target.value })}
                          />
                          <span className="text-[8px] font-black text-slate-300 uppercase">Mins</span>
                       </div>
                    </div>
                 </div>
               );
            })}
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
           <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                 <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="px-10 py-6">Staff Member</th>
                    <th className="px-10 py-6">Exp. Hours</th>
                    <th className="px-10 py-6">Actual Hours</th>
                    <th className="px-10 py-6">Late/Penalty</th>
                    <th className="px-10 py-6 text-right">Performance</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {staffSummary.map(s => {
                    const perf = (parseFloat(s.actualHours) / parseFloat(s.expectedHours) * 100) || 0;
                    return (
                       <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-10 py-8">
                             <p className="font-black text-slate-900 uppercase tracking-tight">{s.username}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{s.position}</p>
                          </td>
                          <td className="px-10 py-8 font-black text-slate-500">{s.expectedHours}h</td>
                          <td className="px-10 py-8 font-black text-blue-600">{s.actualHours}h</td>
                          <td className="px-10 py-8">
                             <div className="flex items-center gap-2 text-red-600 font-black">
                                <AlertTriangle className="h-3 w-3" /> {s.lateTally}m
                             </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                             <div className="flex items-center justify-end gap-4">
                                <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full rounded-full ${perf > 90 ? 'bg-green-500' : perf > 70 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.min(perf, 100)}%` }} />
                                </div>
                                <span className="text-xs font-black text-slate-900">{Math.round(perf)}%</span>
                             </div>
                          </td>
                       </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>
      )}

      {activeTab === 'library' && (
        <div className="animate-in fade-in duration-500">
          <div className="mb-8 flex justify-between items-center no-print">
             <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Available Shifts</h2>
             <button onClick={() => setShowShiftModal(true)} className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100">
                <Plus className="h-4 w-4" /> Add Shift Type
             </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* Safety Fix 3: Ensure we map over shiftLibrary safely */}
             {(userShop.shiftLibrary || []).map(shift => (
                <div key={shift.id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative group hover:border-blue-200 transition-all">
                   <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-6">
                      <Clock className="h-7 w-7" />
                   </div>
                   <h3 className="font-black text-2xl text-slate-900 uppercase tracking-tight mb-2">{shift.name}</h3>
                   <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] mb-6">{shift.durationHours} Hours Duration</p>
                   
                   <div className="bg-slate-50 p-6 rounded-3xl flex justify-between items-center">
                      <div>
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Start</p>
                         <p className="text-lg font-black text-slate-900">{shift.startTime}</p>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div className="text-right">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">End</p>
                         <p className="text-lg font-black text-slate-900">{shift.endTime}</p>
                      </div>
                   </div>

                   <button 
                     onClick={() => onUpdateShop(userShop.id, { shiftLibrary: (userShop.shiftLibrary || []).filter(s => s.id !== shift.id) })}
                     className="absolute top-6 right-6 p-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                   >
                      <Trash2 className="h-5 w-5" />
                   </button>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* New Shift Modal */}
      {showShiftModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Create Shift</h2>
                 <button onClick={() => setShowShiftModal(false)} className="p-2 bg-white border border-slate-100 rounded-full"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Variant Name</label>
                    <input className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-lg outline-none focus:border-blue-600" placeholder="e.g. Morning 8h, Night 12h" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock In</label>
                       <input type="time" className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-lg outline-none" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clock Out</label>
                       <input type="time" className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-lg outline-none" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} />
                    </div>
                 </div>
                 <button onClick={handleAddShift} className="w-full py-6 bg-blue-600 text-white font-black rounded-[24px] shadow-xl shadow-blue-100 uppercase tracking-widest text-sm mt-4">Save to Library</button>
              </div>
           </div>
        </div>
      )}

      {/* Init Register Modal */}
      {showInitModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden p-10 animate-in zoom-in-95">
              <div className="text-center mb-8">
                 <div className="p-6 bg-blue-50 text-blue-600 rounded-[32px] w-fit mx-auto mb-6 shadow-inner">
                    <ClipboardList className="h-12 w-12" />
                 </div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Initialize Register</h2>
                 <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">For Month: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                 <button onClick={() => { setShowInitModal(false); alert("Fresh Register Active!"); }} className="p-8 bg-slate-50 border-2 border-transparent rounded-[32px] text-left hover:border-blue-600 hover:bg-blue-50 transition-all group">
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight group-hover:text-blue-600">Fresh Initialization</h3>
                    <p className="text-slate-400 font-bold text-xs mt-1">Start a blank register for the new month. No data carry-over.</p>
                 </button>
                 <button onClick={() => { setShowInitModal(false); alert("Continuation Active!"); }} className="p-8 bg-slate-50 border-2 border-transparent rounded-[32px] text-left hover:border-blue-600 hover:bg-blue-50 transition-all group">
                    <h3 className="font-black text-xl text-slate-900 uppercase tracking-tight group-hover:text-blue-600">Re-register Continuation</h3>
                    <p className="text-slate-400 font-bold text-xs mt-1">Pull staff from previous month and keep running totals.</p>
                 </button>
              </div>
              <button onClick={() => setShowInitModal(false)} className="w-full py-5 text-slate-400 font-black uppercase tracking-widest text-[10px] mt-6">Cancel Operation</button>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default RegisterPage;
