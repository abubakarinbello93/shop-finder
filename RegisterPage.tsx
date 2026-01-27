import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowLeft, Plus, Trash2, Search, Clock, Save, X, Settings, UserCheck, Calendar, FileText, Printer, ChevronRight, UserPlus, Check, History, AlertTriangle } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, Staff, Shift, AttendanceRecord } from './types';
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

interface RegisterPageProps {
  state: AppState;
  onLogout: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ state, onLogout, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'register' | 'summary' | 'library'>('register');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [newShift, setNewShift] = useState<Partial<Shift>>({ name: '', start: '08:00', end: '16:00', hours: 8 });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Load attendance for today
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!userShop) return;
    const q = query(
      collection(db, 'shops', userShop.id, 'attendance'),
      where('date', '==', today)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendance(records);
    });
    return () => unsubscribe();
  }, [userShop?.id, today]);

  const filteredStaff = useMemo(() => {
    if (!userShop) return [];
    const term = searchTerm.toLowerCase();
    return (userShop.staff || []).filter(s => 
      s.username.toLowerCase().includes(term) || 
      s.staffCode.toLowerCase().includes(term)
    );
  }, [userShop, searchTerm]);

  const handleCreateRegister = async (mode: 'fresh' | 'continuation') => {
    if (!userShop) return;
    if (window.confirm(`Start a new register for ${new Date().toLocaleString('default', { month: 'long' })}?`)) {
      await onUpdateShop(userShop.id, { currentRegisterMonth: viewMonth });
      alert("Register initialized for this period.");
    }
  };

  const handleSignIn = async (staffId: string) => {
    if (!userShop) return;
    const ref = doc(db, 'shops', userShop.id, 'attendance', `${today}_${staffId}`);
    await setDoc(ref, {
      staffId,
      date: today,
      status: 'Present',
      signInTime: serverTimestamp(),
      overtimeMinutes: 0,
      breaks: []
    }, { merge: true });
  };

  const handleSignOut = async (staffId: string) => {
    if (!userShop) return;
    const ref = doc(db, 'shops', userShop.id, 'attendance', `${today}_${staffId}`);
    await setDoc(ref, { signOutTime: serverTimestamp() }, { merge: true });
  };

  const handleBreak = async (staffId: string, action: 'out' | 'in', breakIdx?: number) => {
    if (!userShop) return;
    const record = attendance.find(a => a.staffId === staffId);
    if (!record) return;

    const ref = doc(db, 'shops', userShop.id, 'attendance', record.id);
    if (action === 'out') {
      const newBreaks = [...(record.breaks || []), { outTime: new Date(), approved: true }];
      await setDoc(ref, { breaks: newBreaks }, { merge: true });
    } else if (action === 'in' && breakIdx !== undefined) {
      const newBreaks = [...record.breaks];
      newBreaks[breakIdx].inTime = new Date();
      await setDoc(ref, { breaks: newBreaks }, { merge: true });
    }
  };

  const handleAddShift = async () => {
    if (!userShop || !newShift.name) return;
    const updatedLibrary = [...(userShop.shiftLibrary || []), { ...newShift, id: Math.random().toString(36).substr(2, 9) } as Shift];
    await onUpdateShop(userShop.id, { shiftLibrary: updatedLibrary });
    setIsShiftModalOpen(false);
    setNewShift({ name: '', start: '08:00', end: '16:00', hours: 8 });
  };

  if (!userShop) return <Layout user={currentUser!} onLogout={onLogout}>Restricted</Layout>;

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-10 flex flex-col gap-6 print:hidden">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:gap-3 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
             <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Register Management</h1>
             <div className="flex items-center gap-3 mt-4">
                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Calendar className="h-3.5 w-3.5" /> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
             </div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => window.print()} className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase bg-white border border-slate-100 px-6 py-4 rounded-[20px] shadow-sm hover:bg-slate-50 transition-all tracking-widest">
                <Printer className="h-4 w-4" /> Print Sheet
             </button>
             <button onClick={() => handleCreateRegister('fresh')} className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase bg-blue-50 border border-blue-100 px-6 py-4 rounded-[20px] shadow-sm hover:bg-blue-100 transition-all tracking-widest">
                <Plus className="h-4 w-4" /> Start New Month
             </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-white p-1 rounded-[24px] shadow-sm border border-slate-100 mb-8 max-w-md print:hidden">
         {['register', 'summary', 'library'].map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab as any)}
             className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-[20px] transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             {tab}
           </button>
         ))}
      </div>

      {/* REGISTER VIEW */}
      {activeTab === 'register' && (
        <div className="space-y-6">
           <div className="relative print:hidden">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
              <input 
                className="w-full pl-14 pr-8 py-5 bg-white border-2 border-transparent rounded-[32px] shadow-sm focus:border-blue-600 outline-none font-bold transition-all"
                placeholder="Search staff by name or code..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>

           <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                       <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          <th className="px-10 py-6">Staff Profile</th>
                          <th className="px-10 py-6">Code</th>
                          <th className="px-10 py-6">Shift</th>
                          <th className="px-10 py-6">Status</th>
                          <th className="px-10 py-6 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredStaff.map(staff => {
                          const record = attendance.find(a => a.staffId === staff.id);
                          const isOnline = record && record.status === 'Present' && !record.signOutTime;
                          const isOnBreak = isOnline && record.breaks?.some(b => !b.inTime);

                          return (
                            <tr key={staff.id} className="hover:bg-slate-50/50 transition-all group">
                               <td className="px-10 py-6">
                                  <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg">
                                        {staff.username.charAt(0)}
                                     </div>
                                     <div>
                                        <p className="font-black text-slate-900 uppercase tracking-tight">{staff.username}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{staff.position}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-10 py-6 font-black text-blue-700 text-xs tracking-widest">{staff.staffCode}</td>
                               <td className="px-10 py-6">
                                  <select className="bg-slate-50 border-none rounded-xl p-2 text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-100">
                                     <option>Select Shift</option>
                                     {(userShop.shiftLibrary || []).map(s => <option key={s.id}>{s.name}</option>)}
                                  </select>
                               </td>
                               <td className="px-10 py-6">
                                  <div className="flex items-center gap-2">
                                     <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                     <span className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                                        {isOnline ? (isOnBreak ? 'ON BREAK' : 'ACTIVE') : 'OFFLINE'}
                                     </span>
                                  </div>
                               </td>
                               <td className="px-10 py-6 text-right">
                                  <div className="flex justify-end gap-2">
                                     {!record ? (
                                        <>
                                           <button onClick={() => handleSignIn(staff.id)} className="px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Sign In</button>
                                           <button className="px-4 py-2 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded-lg hover:bg-slate-200 transition-all">Absent</button>
                                        </>
                                     ) : (
                                        <>
                                           {isOnline && (
                                              <button 
                                                onClick={() => isOnBreak ? handleBreak(staff.id, 'in', record.breaks.findIndex(b => !b.inTime)) : handleBreak(staff.id, 'out')}
                                                className={`px-4 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${isOnBreak ? 'bg-indigo-600 text-white' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}
                                              >
                                                 {isOnBreak ? 'Come Back' : 'Went Out'}
                                              </button>
                                           )}
                                           {isOnline && (
                                              <button onClick={() => handleSignOut(staff.id)} className="px-4 py-2 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-700 shadow-lg shadow-red-100 transition-all">Sign Out</button>
                                           )}
                                           {record.signOutTime && (
                                              <span className="text-[9px] font-black text-slate-300 uppercase italic">Clocked Out</span>
                                           )}
                                        </>
                                     )}
                                  </div>
                               </td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* LIBRARY VIEW */}
      {activeTab === 'library' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-indigo-50 border-2 border-indigo-100 p-8 rounded-[40px] flex justify-between items-center shadow-sm">
              <div>
                 <h3 className="text-2xl font-black text-indigo-900 tracking-tighter uppercase leading-none">Shift Library</h3>
                 <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-2">Define standard operational hours for your monthly register.</p>
              </div>
              <button 
                onClick={() => setIsShiftModalOpen(true)}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Plus className="h-4 w-4" /> Add Shift Type
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(userShop.shiftLibrary || []).map((shift) => (
                <div key={shift.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 group relative hover:border-indigo-200 transition-all">
                   <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-6">
                      <Clock className="h-6 w-6" />
                   </div>
                   <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">{shift.name}</h4>
                   <div className="flex gap-4 mt-6">
                      <div className="flex-1 p-3 bg-slate-50 rounded-xl">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Start</p>
                         <p className="text-sm font-black text-slate-700">{shift.start}</p>
                      </div>
                      <div className="flex-1 p-3 bg-slate-50 rounded-xl">
                         <p className="text-[8px] font-black text-slate-400 uppercase mb-1">End</p>
                         <p className="text-sm font-black text-slate-700">{shift.end}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => {
                       const updated = (userShop.shiftLibrary || []).filter(s => s.id !== shift.id);
                       onUpdateShop(userShop.id, { shiftLibrary: updated });
                    }}
                    className="absolute top-8 right-8 text-slate-200 hover:text-red-500 transition-colors"
                   >
                     <Trash2 className="h-5 w-5" />
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* SHIFT CREATION MODAL */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 border-b bg-slate-50/50 flex justify-between items-center">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">New Shift Profile</h2>
                 <button onClick={() => setIsShiftModalOpen(false)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:text-red-500 transition-all"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Shift Label</label>
                    <input className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600 transition-all" placeholder="e.g. Morning 7h" value={newShift.name} onChange={e => setNewShift({...newShift, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Starts At</label>
                       <input type="time" className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600" value={newShift.start} onChange={e => setNewShift({...newShift, start: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Ends At</label>
                       <input type="time" className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600" value={newShift.end} onChange={e => setNewShift({...newShift, end: e.target.value})} />
                    </div>
                 </div>
                 <button onClick={handleAddShift} className="w-full py-6 bg-blue-600 text-white font-black rounded-[30px] shadow-2xl shadow-blue-100 flex items-center justify-center gap-4 hover:bg-blue-700 transition-all uppercase tracking-widest text-sm">
                    <Save className="h-5 w-5" /> Commit Shift
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* SUMMARY TABLE - Optimized for Monthly Reporting */}
      {activeTab === 'summary' && (
        <div className="animate-in fade-in duration-700">
           <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-10 border-b flex justify-between items-center bg-slate-50/30">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Operational Summary</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Performance & Time Accounting for {viewMonth}</p>
                 </div>
                 <div className="flex gap-3">
                    <input type="month" className="bg-white border-2 border-slate-100 p-3 rounded-2xl font-black text-[10px] uppercase outline-none focus:border-blue-600" value={viewMonth} onChange={e => setViewMonth(e.target.value)} />
                 </div>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 border-b">
                          <th className="px-10 py-6">Employee</th>
                          <th className="px-10 py-6 text-center">Exp. Hours</th>
                          <th className="px-10 py-6 text-center">Act. Hours</th>
                          <th className="px-10 py-6 text-center">Overtime</th>
                          <th className="px-10 py-6 text-center text-red-500">Late Tally</th>
                          <th className="px-10 py-6 text-right">Net Value</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {userShop.staff.map(staff => (
                          <tr key={staff.id} className="hover:bg-slate-50/50">
                             <td className="px-10 py-6">
                                <p className="font-black text-slate-900 uppercase tracking-tight">{staff.username}</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">ID: {staff.staffCode}</p>
                             </td>
                             <td className="px-10 py-6 text-center font-bold text-slate-600">0h</td>
                             <td className="px-10 py-6 text-center font-bold text-green-600">0h</td>
                             <td className="px-10 py-6 text-center font-bold text-blue-600">0m</td>
                             <td className="px-10 py-6 text-center font-bold text-red-500">0m</td>
                             <td className="px-10 py-6 text-right">
                                <span className="px-4 py-1.5 bg-slate-100 rounded-full font-black text-[9px] uppercase tracking-widest text-slate-600">No Data</span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
              <div className="p-10 bg-slate-50/50 border-t flex items-center justify-between">
                 <p className="text-[10px] font-bold text-slate-400 uppercase max-w-md leading-relaxed">
                   Expected hours are calculated based on assigned library shifts. Actual hours net out unapproved breaks and include authorized overtime.
                 </p>
                 <button onClick={() => window.print()} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3">
                   <FileText className="h-4 w-4" /> Export Audit Log
                 </button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default RegisterPage;
