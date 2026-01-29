import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, ArrowLeft, Clock, Save, User, 
  Calendar, Check, X, Coffee, AlertCircle, RefreshCw, 
  UserMinus, TrendingUp, Calculator, Printer, FileText
} from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, AttendanceRecord, Staff, Shift } from './types';
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

const RegisterPage: React.FC<RegisterPageProps> = ({ state, onLogout, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = (shops || []).find(s => s.id === currentUser?.shopId);
  
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Audit useEffect query for monthly records
  // Added real-time listener for the entire attendance sub-collection for the month
  useEffect(() => {
    if (!userShop) {
      setLoading(false);
      return;
    }
    
    // Daily listener for today
    const qDaily = query(
      collection(db, 'shops', userShop.id, 'attendance'), 
      where('date', '==', today)
    );
    
    const unsubDaily = onSnapshot(qDaily, (snapshot) => {
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setAttendance(records);
      setLoading(false);
    }, (error) => {
      console.error("Daily register sync error:", error);
      setLoading(false);
    });

    // Monthly listener - cover 01 to 31 to ensure today's completions are included
    const startOfMonth = `${selectedMonth}-01`;
    const endOfMonth = `${selectedMonth}-31`; 
    
    const qMonthly = query(
      collection(db, 'shops', userShop.id, 'attendance'), 
      where('date', '>=', startOfMonth), 
      where('date', '<=', endOfMonth),
      orderBy('date', 'desc')
    );

    const unsubMonthly = onSnapshot(qMonthly, (snapshot) => {
      setIsSyncing(true);
      const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
      setMonthlyAttendance(records);
      // Small timeout to ensure state transitions don't flicker
      setTimeout(() => setIsSyncing(false), 300);
    }, (error) => {
      console.error("Monthly records sync error:", error);
      setIsSyncing(false);
    });

    return () => { 
      unsubDaily(); 
      unsubMonthly(); 
    };
  }, [userShop?.id, selectedMonth, today]);

  // Filter staff who have at least one eligible shift
  const eligibleStaff = useMemo(() => {
    if (!userShop) return [];
    return (userShop.staff || []).filter(s => (s.eligibleShifts || []).length > 0);
  }, [userShop]);

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
    if (!userShop || !window.confirm("ARE YOU SURE? This will permanently delete all attendance records for THIS MONTH.")) return;
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

  // 3. Fix 'Print' functionality to ensure data is fully loaded
  const handlePrint = useCallback(() => {
    setIsPreparingPrint(true);
    // Use a double frame timeout to ensure the printable DOM component has rendered fully
    setTimeout(() => {
      window.print();
      setIsPreparingPrint(false);
    }, 800);
  }, []);

  // Performance Math
  const monthlyStats = useMemo(() => {
    if (!userShop) return [];
    try {
      const currentDateStr = new Date().toISOString().split('T')[0];
      
      // Use eligibleStaff as base so everyone appears even with 0 hours
      return eligibleStaff.map(staff => {
        const records = monthlyAttendance.filter(r => r.staffId === staff.id);
        
        let totalHeMins = 0; // Total Expected Mins
        let totalHaMins = 0; // Total Actual Mins
        let totalPenaltyMins = 0; // Total Penalty Mins

        records.forEach(rec => {
          // Priority 1: Use specific Shift ID from the record if it exists
          // Priority 2: Use the first Assigned Shift snapshot from the staff profile (synchronized via Firebase)
          // Priority 3: Fallback to lookup from global shop shifts
          const shift = (staff.assignedShifts || []).find(s => s.id === (rec.assignedShiftId || staff.eligibleShifts?.[0]))
                        || (userShop.shifts || []).find(s => s.id === (rec.assignedShiftId || staff.eligibleShifts?.[0]));
          
          if (!shift) return;

          const [sh, sm] = (shift.start || "09:00").split(':').map(Number);
          const [eh, em] = (shift.end || "17:00").split(':').map(Number);
          
          const getDayMins = (h: number, m: number) => h * 60 + m;
          const shiftStartMins = getDayMins(sh, sm);
          let shiftEndMins = getDayMins(eh, em);
          if (shiftEndMins < shiftStartMins) shiftEndMins += 24 * 60; // Overnight

          // Fix: Ensure Absent status shows full shift Expected Hours
          if (rec.status === 'Absent') {
            const shiftDuration = shiftEndMins - shiftStartMins;
            totalHeMins += shiftDuration;
            totalPenaltyMins += shiftDuration;
          } 
          // Fix: Ensure Sign In (Present) status calculates remaining shift time
          else if (rec.signIn) {
            const signInDate = new Date(rec.signIn);
            const signInMins = getDayMins(signInDate.getHours(), signInDate.getMinutes());
            
            // Expected Hours Calculation: starting from Sign In time until Shift End (capped at shift limits)
            const effectiveStartMins = Math.max(signInMins, shiftStartMins);
            const dailyHeMins = Math.max(0, shiftEndMins - effectiveStartMins);
            totalHeMins += dailyHeMins;

            // Actual Hours Calculation: calculate progress for active shifts
            let endToUseMins: number | null = null;
            if (rec.signOut) {
              const signOutDate = new Date(rec.signOut);
              endToUseMins = getDayMins(signOutDate.getHours(), signOutDate.getMinutes());
              // Handle overnight sign out
              if (endToUseMins < shiftStartMins && shiftEndMins > 1440) endToUseMins += 1440;
            } else if (rec.date === currentDateStr) {
              const now = new Date();
              endToUseMins = getDayMins(now.getHours(), now.getMinutes());
              // Handle overnight current work
              if (endToUseMins < shiftStartMins && shiftEndMins > 1440) endToUseMins += 1440;
            }

            if (endToUseMins !== null) {
              const actualStartMins = Math.max(signInMins, shiftStartMins);
              const actualEndMins = Math.min(endToUseMins, shiftEndMins);
              const dailyHaMins = Math.max(0, actualEndMins - actualStartMins);
              totalHaMins += dailyHaMins;

              // Penalty: Unapproved breaks
              const unapprovedBreakMins = (rec.breaks || []).filter(b => !b.approved).reduce((acc, b) => {
                if (b.end && b.start) return acc + (b.end - b.start) / (1000 * 60);
                return acc;
              }, 0);
              totalPenaltyMins += unapprovedBreakMins;

              // Penalty: Lateness (Sign in after shift start)
              if (signInMins > shiftStartMins) {
                totalPenaltyMins += (signInMins - shiftStartMins);
              }
            }
          }
        });

        return {
          staff,
          expectedMins: totalHeMins,
          actualMins: totalHaMins,
          penaltyMins: Math.round(totalPenaltyMins)
        };
      });
    } catch (err) {
      console.error("Monthly calculation error:", err);
      return [];
    }
  }, [eligibleStaff, monthlyAttendance, userShop, today]);

  const totals = useMemo(() => {
    return monthlyStats.reduce((acc, curr) => ({
      expected: acc.expected + curr.expectedMins,
      actual: acc.actual + curr.actualMins,
      penalty: acc.penalty + curr.penaltyMins
    }), { expected: 0, actual: 0, penalty: 0 });
  }, [monthlyStats]);

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

  if (!userShop) {
    return (
      <Layout user={currentUser!} onLogout={onLogout}>
        <div className="flex flex-col items-center justify-center h-64 text-center w-full">
           <AlertCircle className="h-12 w-12 text-slate-200 mb-4" />
           <h2 className="text-xl font-black text-slate-900 uppercase">Restricted Access</h2>
           <p className="text-sm font-bold text-slate-400 mt-2">Only facility managers and authorized staff can access the register.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            #printable-report, #printable-report * { visibility: visible !important; }
            #printable-report { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              display: block !important; 
              background: white;
            }
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
              <button onClick={() => setActiveTab('monthly')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'monthly' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border text-slate-400'}`}>Monthly Records</button>
            </div>
          </div>
          
          <div className="flex gap-3">
            {activeTab === 'monthly' && (
              <>
                <div className="relative group">
                  <input type="month" className="p-4 bg-white border-2 rounded-2xl font-black text-sm outline-none focus:border-indigo-600 transition-all shadow-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                  {isSyncing && (
                    <div className="absolute -top-2 -right-2 bg-indigo-600 text-white p-1 rounded-full animate-bounce shadow-md">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={handlePrint} 
                  disabled={isPreparingPrint}
                  className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all border-2 border-blue-100 flex items-center gap-2 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" /> {isPreparingPrint ? 'Preparing...' : 'Print Report'}
                </button>
              </>
            )}
            <button onClick={clearRecordsForMonth} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border-2 border-red-100 shadow-sm"><RefreshCw className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 w-full">
          {activeTab === 'daily' ? (
            <div className="space-y-4 w-full">
              {eligibleStaff.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 w-full">
                  {eligibleStaff.map(staff => {
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
                <div className="p-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-50 w-full shadow-sm">
                  <UserMinus className="h-16 w-16 text-slate-100 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-slate-300 uppercase">No eligible staff found</h3>
                  <p className="text-sm font-bold text-slate-400 mt-2">Assign staff shifts in Settings to enable the daily call register.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden w-full animate-in fade-in duration-500">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <tr>
                      <th className="px-8 py-6">Staff Member</th>
                      <th className="px-8 py-6">Contact Info</th>
                      <th className="px-8 py-6 text-center">Expected Hours</th>
                      <th className="px-8 py-6 text-center">Actual Hours</th>
                      <th className="px-8 py-6 text-center">Penalty</th>
                      <th className="px-8 py-6 text-right">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {monthlyStats.map(({ staff, expectedMins, actualMins, penaltyMins }) => (
                      <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shadow-sm">{staff.fullName.charAt(0)}</div>
                            <span className="font-black text-slate-900">{staff.fullName}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-slate-500 font-bold text-sm">{staff.phone}</td>
                        <td className="px-8 py-6 text-center font-black text-slate-700">{formatMinsToHM(expectedMins)}</td>
                        <td className="px-8 py-6 text-center font-black text-indigo-600">{formatMinsToHM(actualMins)}</td>
                        <td className="px-8 py-6 text-center font-black text-red-500">{formatMinsToHM(penaltyMins)}</td>
                        <td className="px-8 py-6 text-right">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${actualMins >= expectedMins && expectedMins > 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {actualMins >= expectedMins && expectedMins > 0 ? 'Excellent' : 'Deficit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black">
                      <td colSpan={2} className="px-8 py-6 uppercase tracking-widest text-xs">Aggregate Summary</td>
                      <td className="px-8 py-6 text-center">{formatMinsToHM(totals.expected)}</td>
                      <td className="px-8 py-6 text-center">{formatMinsToHM(totals.actual)}</td>
                      <td className="px-8 py-6 text-center text-red-400">{formatMinsToHM(totals.penalty)}</td>
                      <td className="px-8 py-6 text-right">
                         <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Shop Finder Smart Report</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printer Friendly View - Enhanced robustness for print state */}
      <div id="printable-report" className={`${isPreparingPrint ? 'block' : 'hidden'} p-10 bg-white text-black font-sans`}>
        <div className="border-b-4 border-black pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Staff Attendance Report</h1>
            <p className="text-xl font-bold mt-1">{userShop.name} • {selectedMonth}</p>
          </div>
          <p className="text-sm font-black uppercase">Date Generated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th className="py-4 text-left px-4 font-black uppercase text-sm">Staff Name</th>
              <th className="py-4 text-center px-4 font-black uppercase text-sm">Expected</th>
              <th className="py-4 text-center px-4 font-black uppercase text-sm">Actual</th>
              <th className="py-4 text-center px-4 font-black uppercase text-sm">Penalty</th>
              <th className="py-4 text-right px-4 font-black uppercase text-sm">Status</th>
            </tr>
          </thead>
          <tbody>
            {monthlyStats.map(({ staff, expectedMins, actualMins, penaltyMins }) => (
              <tr key={staff.id} className="border-b border-gray-200">
                <td className="py-4 px-4 font-bold">{staff.fullName}</td>
                <td className="py-4 px-4 text-center">{formatMinsToHM(expectedMins)}</td>
                <td className="py-4 px-4 text-center">{formatMinsToHM(actualMins)}</td>
                <td className="py-4 px-4 text-center">{formatMinsToHM(penaltyMins)}</td>
                <td className="py-4 px-4 text-right font-black">
                  {actualMins >= expectedMins && expectedMins > 0 ? 'EXCELLENT' : 'DEFICIT'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-black">
              <td className="py-6 px-4 font-black uppercase">Month Totals</td>
              <td className="py-6 px-4 text-center font-black">{formatMinsToHM(totals.expected)}</td>
              <td className="py-6 px-4 text-center font-black">{formatMinsToHM(totals.actual)}</td>
              <td className="py-6 px-4 text-center font-black">{formatMinsToHM(totals.penalty)}</td>
              <td className="py-6 px-4"></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-20 flex justify-between items-start">
          <div className="w-64 border-t-2 border-black pt-2">
            <p className="text-xs font-black uppercase">Manager Signature</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400">Generated via Shop Finder Smart Register Platform</p>
          </div>
        </div>
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
  const [ot, setOt] = useState(record?.overtimeMinutes || 0);

  const statusColors: any = {
    'Present': 'bg-green-500',
    'Absent': 'bg-red-500',
    'On Break': 'bg-orange-500',
    'Sign Out': 'bg-slate-400'
  };

  // Logic: Reset button state if 'Sign Out' occurred to allow another 'Sign In'
  const isResetState = !record || record.status === 'Absent' || record.status === 'Sign Out';

  return (
    <div className="p-8 bg-white border-2 border-transparent rounded-[32px] shadow-sm hover:border-blue-100 transition-all w-full group">
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-center md:items-start">
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
              <button onClick={() => onAction('in')} className="flex-1 md:flex-none px-8 py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"><Check className="h-4 w-4" /> Sign In</button>
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
                    <button onClick={() => onAction('break_start')} className="flex-1 md:flex-none px-8 py-4 bg-orange-50 text-orange-600 font-black rounded-2xl border-2 border-orange-100 text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"><Coffee className="h-4 w-4" /> Go Out</button>
                  )}
                  <button onClick={() => onAction('out')} className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl">Sign Out</button>
                </div>
              )}
              
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl w-full md:w-auto shadow-inner">
                 <input type="number" className="w-16 p-3 bg-white border-2 rounded-xl font-black text-center text-xs outline-none focus:border-blue-600 transition-all" value={ot} onChange={e => setOt(Number(e.target.value))} />
                 <p className="text-[10px] font-black text-slate-400 uppercase flex-1 md:flex-none text-center">Overtime</p>
                 <button onClick={() => onSaveOvertime(ot)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 transition-all"><Save className="h-4 w-4" /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
