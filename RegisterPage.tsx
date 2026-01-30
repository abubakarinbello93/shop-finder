import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, ArrowLeft, Clock, Save, User, 
  Calendar, Check, X, Coffee, AlertCircle, RefreshCw, 
  UserMinus, TrendingUp, Calculator, Printer, FileText
} from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, AttendanceRecord, Staff } from './types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, writeBatch, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from './firebase';

interface RegisterPageProps {
  state: AppState;
  onLogout: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
}

const formatMinsToHM = (totalMins: number) => {
  if (totalMins <= 0) return '0H 00M';
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  return `${h}H ${m.toString().padStart(2, '0')}M`;
};

const formatTimestampToTime = (ts?: number) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const RegisterPage: React.FC<RegisterPageProps> = ({ state, onLogout, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = (shops || []).find(s => s.id === currentUser?.shopId);
  
  const [activeTab, setActiveTab] = useState<'daily' | 'history'>('daily');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [historyAttendance, setHistoryAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Sync Listeners
  useEffect(() => {
    if (!userShop) {
      setLoading(false);
      return;
    }
    
    // Today's Real-time listener
    const qDaily = query(
      collection(db, 'shops', userShop.id, 'attendance'), 
      where('date', '==', today)
    );
    
    const unsubDaily = onSnapshot(qDaily, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendance(records);
      setLoading(false);
    });

    // History listener (Activity Log)
    const startOfMonth = `${selectedMonth}-01`;
    const endOfMonth = `${selectedMonth}-31`; 
    
    const qHistory = query(
      collection(db, 'shops', userShop.id, 'attendance'), 
      where('date', '>=', startOfMonth), 
      where('date', '<=', endOfMonth),
      orderBy('date', 'desc'),
      orderBy('signIn', 'desc')
    );

    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      setIsSyncing(true);
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setHistoryAttendance(records);
      setTimeout(() => setIsSyncing(false), 300);
    });

    return () => { 
      unsubDaily(); 
      unsubHistory(); 
    };
  }, [userShop?.id, selectedMonth, today]);

  const allStaff = useMemo(() => userShop?.staff || [], [userShop]);

  const handleAction = async (staffId: string, action: 'in' | 'out' | 'break_start' | 'break_end' | 'absent', breakApproved?: boolean) => {
    if (!userShop) return;
    const recordId = `${staffId}_${today}`;
    const recordRef = doc(db, 'shops', userShop.id, 'attendance', recordId);
    const existing = attendance.find(r => r.staffId === staffId);

    try {
      if (action === 'in') {
        await setDoc(recordRef, {
          staffId, 
          date: today, 
          signIn: Date.now(), 
          status: 'Present', 
          breaks: [], 
          overtimeMinutes: 0
        }, { merge: true });
      } else if (action === 'out') {
        await setDoc(recordRef, { 
          signOut: Date.now(), 
          status: 'Sign Out' 
        }, { merge: true });
      } else if (action === 'break_start') {
        const breaks = [...(existing?.breaks || []), { start: Date.now(), approved: false }];
        await setDoc(recordRef, { 
          breaks, 
          status: 'On Break' 
        }, { merge: true });
      } else if (action === 'break_end') {
        const breaks = [...(existing?.breaks || [])];
        const last = breaks[breaks.length - 1];
        if (last) {
          last.end = Date.now();
          last.approved = breakApproved || false;
        }
        await setDoc(recordRef, { 
          breaks, 
          status: 'Present' 
        }, { merge: true });
      } else if (action === 'absent') {
        await setDoc(recordRef, { 
          staffId, 
          date: today, 
          status: 'Absent', 
          breaks: [], 
          overtimeMinutes: 0 
        }, { merge: true });
      }
    } catch (e: any) {
      alert(`Cloud Sync Error: ${e.message}`);
    }
  };

  const handleSaveOvertime = async (staffId: string, minutes: number) => {
    if (!userShop) return;
    try {
      const recordRef = doc(db, 'shops', userShop.id, 'attendance', `${staffId}_${today}`);
      await setDoc(recordRef, { overtimeMinutes: minutes }, { merge: true });
      alert("Overtime recorded!");
    } catch (e: any) {
      alert(`Overtime Save Error: ${e.message}`);
    }
  };

  const clearRecordsForMonth = async () => {
    if (!userShop || !window.confirm("ARE YOU SURE? This will permanently delete all records for this period.")) return;
    try {
      const batch = writeBatch(db);
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = `${selectedMonth}-31`;
      const q = query(collection(db, 'shops', userShop.id, 'attendance'), where('date', '>=', startOfMonth), where('date', '<=', endOfMonth));
      const snap = await getDocs(q);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      alert("Records Cleared.");
    } catch (e: any) {
      alert(`Clear Error: ${e.message}`);
    }
  };

  const handlePrint = useCallback(() => {
    setIsPreparingPrint(true);
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 800);
  }, []);

  // Daily Activity Log Logic
  const activityLog = useMemo(() => {
    if (!userShop) return [];
    
    return historyAttendance.map(record => {
      const staff = allStaff.find(s => s.id === record.staffId);
      
      // Calculation Logic
      let penaltyMins = 0;
      if (record.breaks) {
        penaltyMins = record.breaks
          .filter(b => !b.approved && b.end)
          .reduce((sum, b) => sum + (b.end! - b.start) / 60000, 0);
      }

      let totalWorkMins = 0;
      if (record.signIn && record.signOut) {
        const rawDurationMins = (record.signOut - record.signIn) / 60000;
        totalWorkMins = (rawDurationMins + record.overtimeMinutes) - penaltyMins;
      } else if (record.signIn && record.date === today && record.status !== 'Absent') {
        // Calculate current progress for entries still signed in today
        const rawDurationMins = (Date.now() - record.signIn) / 60000;
        totalWorkMins = (rawDurationMins + record.overtimeMinutes) - penaltyMins;
      }

      return {
        ...record,
        staffName: staff?.fullName || 'Unknown Staff',
        penaltyMins: Math.round(penaltyMins),
        totalWorkMins: Math.round(totalWorkMins)
      };
    });
  }, [historyAttendance, allStaff, today, userShop]);

  if (loading) {
    return (
      <Layout user={currentUser!} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center h-64 w-full">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 font-black text-slate-400 uppercase tracking-widest text-xs">Syncing Register...</p>
        </div>
      </Layout>
    );
  }

  if (!userShop) return <Layout user={currentUser!} onLogout={onLogout}>Restricted</Layout>;

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            #printable-report, #printable-report * { visibility: visible !important; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; display: block !important; background: white; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      <div className="w-full min-h-full flex flex-col no-print">
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 w-full">
          <div>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all">
              <ArrowLeft className="h-5 w-5" /> Workspace
            </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Register Management</h1>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setActiveTab('daily')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'daily' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border text-slate-400'}`}>Daily Call</button>
              <button onClick={() => setActiveTab('history')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border text-slate-400'}`}>Daily Activity Log</button>
            </div>
          </div>
          
          <div className="flex gap-3">
            {activeTab === 'history' && (
              <>
                <div className="relative group">
                  <input type="month" className="p-4 bg-white border-2 rounded-2xl font-black text-sm outline-none focus:border-indigo-600 shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                  {isSyncing && <RefreshCw className="absolute -top-2 -right-2 h-4 w-4 text-indigo-600 animate-spin" />}
                </div>
                <button onClick={handlePrint} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all border-2 border-blue-100 flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                  <Printer className="h-4 w-4" /> Print Report
                </button>
              </>
            )}
            <button onClick={clearRecordsForMonth} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border-2 border-red-100 shadow-sm"><RefreshCw className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 w-full">
          {activeTab === 'daily' ? (
            <div className="space-y-4 w-full">
              {allStaff.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 w-full">
                  {allStaff.map(staff => {
                    const rec = attendance.find(r => r.staffId === staff.id);
                    return (
                      <DailyStaffCard 
                        key={staff.id} 
                        staff={staff} 
                        record={rec} 
                        onAction={(action, approved) => handleAction(staff.id, action, approved)} 
                        onSaveOvertime={(mins) => handleSaveOvertime(staff.id, mins)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="p-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-50 w-full">
                  <UserMinus className="h-16 w-16 text-slate-100 mx-auto mb-4" />
                  <p className="font-black text-slate-300 uppercase">No staff members found.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden w-full overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="px-8 py-6">Date</th>
                    <th className="px-8 py-6">Staff Member</th>
                    <th className="px-8 py-6 text-center">Sign In</th>
                    <th className="px-8 py-6 text-center">Sign Out</th>
                    <th className="px-8 py-6 text-center">Overtime</th>
                    <th className="px-8 py-6 text-center">Penalty</th>
                    <th className="px-8 py-6 text-right">Total Time Work</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activityLog.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 font-bold text-slate-400 text-xs">{log.date}</td>
                      <td className="px-8 py-6">
                        <span className="font-black text-slate-900">{log.staffName}</span>
                      </td>
                      <td className="px-8 py-6 text-center font-bold text-slate-700">{formatTimestampToTime(log.signIn)}</td>
                      <td className="px-8 py-6 text-center font-bold text-slate-700">{formatTimestampToTime(log.signOut)}</td>
                      <td className="px-8 py-6 text-center font-bold text-blue-600">+{log.overtimeMinutes}m</td>
                      <td className="px-8 py-6 text-center font-bold text-red-500">-{log.penaltyMins}m</td>
                      <td className="px-8 py-6 text-right">
                        <span className={`font-black text-lg ${log.signOut || log.date === today ? 'text-indigo-600' : 'text-slate-200'}`}>
                          {formatMinsToHM(log.totalWorkMins)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activityLog.length === 0 && (
                <div className="p-20 text-center">
                  <p className="font-black text-slate-300 uppercase tracking-widest">Log is empty for this period.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Printable View */}
      <div id="printable-report" className={`${isPreparingPrint ? 'block' : 'hidden'} p-10 bg-white text-black`}>
        <h1 className="text-4xl font-black uppercase mb-2">Daily Activity Report</h1>
        <p className="text-xl font-bold mb-8">{userShop.name} • {selectedMonth}</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-slate-50">
              <th className="p-4 text-left font-black uppercase text-xs">Date</th>
              <th className="p-4 text-left font-black uppercase text-xs">Staff</th>
              <th className="p-4 text-center font-black uppercase text-xs">In</th>
              <th className="p-4 text-center font-black uppercase text-xs">Out</th>
              <th className="p-4 text-center font-black uppercase text-xs">OT</th>
              <th className="p-4 text-center font-black uppercase text-xs">Penalty</th>
              <th className="p-4 text-right font-black uppercase text-xs">Total Work</th>
            </tr>
          </thead>
          <tbody>
            {activityLog.map((log, i) => (
              <tr key={i} className="border-b border-slate-200">
                <td className="p-4 font-bold text-xs">{log.date}</td>
                <td className="p-4 font-bold">{log.staffName}</td>
                <td className="p-4 text-center">{formatTimestampToTime(log.signIn)}</td>
                <td className="p-4 text-center">{formatTimestampToTime(log.signOut)}</td>
                <td className="p-4 text-center">+{log.overtimeMinutes}m</td>
                <td className="p-4 text-center">-{log.penaltyMins}m</td>
                <td className="p-4 text-right font-black">{formatMinsToHM(log.totalWorkMins)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

const DailyStaffCard: React.FC<{ 
  staff: Staff, 
  record?: AttendanceRecord, 
  onAction: (a: 'in' | 'out' | 'break_start' | 'break_end' | 'absent', approved?: boolean) => void,
  onSaveOvertime: (mins: number) => void
}> = ({ staff, record, onAction, onSaveOvertime }) => {
  const [otHours, setOtHours] = useState(Math.floor((record?.overtimeMinutes || 0) / 60));
  const [otMinutes, setOtMinutes] = useState((record?.overtimeMinutes || 0) % 60);

  const statusColors: any = {
    'Present': 'bg-green-500',
    'Absent': 'bg-red-500',
    'On Break': 'bg-orange-500',
    'Sign Out': 'bg-slate-400'
  };

  const isResetState = !record || record.status === 'Absent' || record.status === 'Sign Out';

  return (
    <div className="p-8 bg-white border-2 border-transparent rounded-[32px] shadow-sm hover:border-blue-100 transition-all w-full group">
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-center">
        <div className="flex items-start gap-6 w-full md:w-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-xl border shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            {staff.fullName.charAt(0)}
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{staff.fullName}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{staff.phone} • {staff.position}</p>
            <div className="flex items-center gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full ${statusColors[record?.status || ''] || 'bg-slate-200'} shadow-sm`} />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{record?.status || 'INACTIVE'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row items-center gap-6 justify-end w-full md:w-auto">
          {isResetState ? (
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={() => onAction('in')} className="flex-1 md:flex-none px-8 py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"><Check className="h-4 w-4" /> Sign In</button>
              <button onClick={() => onAction('absent')} className="flex-1 md:flex-none px-8 py-4 bg-red-50 text-red-600 border-2 border-red-100 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"><X className="h-4 w-4" /> Absent</button>
            </div>
          ) : (
            <>
              {record.status !== 'Sign Out' && (
                <div className="flex gap-2 w-full md:w-auto">
                  {record.status === 'On Break' ? (
                    <div className="flex gap-2 animate-in fade-in zoom-in w-full md:w-auto">
                       <button onClick={() => onAction('break_end', true)} className="flex-1 md:flex-none px-5 py-4 bg-green-50 text-green-600 border-2 border-green-100 font-black rounded-2xl text-[10px] uppercase active:scale-95 transition-all shadow-sm">Approved End</button>
                       <button onClick={() => onAction('break_end', false)} className="flex-1 md:flex-none px-5 py-4 bg-orange-50 text-orange-600 border-2 border-orange-100 font-black rounded-2xl text-[10px] uppercase active:scale-95 transition-all shadow-sm">Unapproved End</button>
                    </div>
                  ) : (
                    <button onClick={() => onAction('break_start')} className="flex-1 md:flex-none px-8 py-4 bg-orange-50 text-orange-600 font-black rounded-2xl border-2 border-orange-100 text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"><Coffee className="h-4 w-4" /> Went Out</button>
                  )}
                  <button onClick={() => onAction('out')} className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl">Sign Out</button>
                </div>
              )}
              
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl w-full md:w-auto shadow-inner border border-slate-100">
                 <div className="flex gap-2 items-center">
                    <div className="flex flex-col items-center">
                      <input type="number" min="0" className="w-12 p-2 bg-white border rounded-xl font-black text-center text-xs outline-none focus:border-blue-600 transition-all" value={otHours} onChange={e => setOtHours(Math.max(0, parseInt(e.target.value) || 0))} />
                      <span className="text-[7px] font-black text-slate-400 uppercase mt-1">Hours</span>
                    </div>
                    <span className="font-black text-slate-300">:</span>
                    <div className="flex flex-col items-center">
                      <input type="number" min="0" max="59" className="w-12 p-2 bg-white border rounded-xl font-black text-center text-xs outline-none focus:border-blue-600 transition-all" value={otMinutes} onChange={e => setOtMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))} />
                      <span className="text-[7px] font-black text-slate-400 uppercase mt-1">Mins</span>
                    </div>
                 </div>
                 <button onClick={() => onSaveOvertime(otHours * 60 + otMinutes)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 transition-all hover:bg-blue-700">
                   <Save className="h-4 w-4" />
                 </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
