import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, ArrowLeft, Clock, Save, User, 
  Calendar, Check, X, Coffee, AlertCircle, RefreshCw, 
  UserMinus, TrendingUp, Calculator 
} from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, AttendanceRecord, Staff, Shift } from './types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
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
  
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    if (!userShop) return;
    
    // Listener for today's daily register
    const qDaily = query(collection(db, 'shops', userShop.id, 'attendance'), where('date', '==', today));
    const unsubDaily = onSnapshot(qDaily, (snapshot) => {
      setAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
      setLoading(false);
    });

    // Listener for selected month's records
    const startOfMonth = `${selectedMonth}-01`;
    const endOfMonth = `${selectedMonth}-31`;
    const qMonthly = query(collection(db, 'shops', userShop.id, 'attendance'), where('date', '>=', startOfMonth), where('date', '<=', endOfMonth));
    const unsubMonthly = onSnapshot(qMonthly, (snapshot) => {
      setMonthlyAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    });

    return () => { unsubDaily(); unsubMonthly(); };
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
          staffId, date: today, signIn: Date.now(), status: 'Present', breaks: [], overtimeMinutes: 0
        });
      } else if (action === 'out') {
        await updateDoc(recordRef, { signOut: Date.now(), status: 'Sign Out' });
      } else if (action === 'break_start') {
        const breaks = [...(existing?.breaks || []), { start: Date.now(), approved: false }];
        await updateDoc(recordRef, { breaks, status: 'On Break' });
      } else if (action === 'break_end') {
        const breaks = [...(existing?.breaks || [])];
        const last = breaks[breaks.length - 1];
        if (last) {
          last.end = Date.now();
          last.approved = breakApproved || false;
        }
        await updateDoc(recordRef, { breaks, status: 'Present' });
      } else if (action === 'absent') {
        await setDoc(recordRef, { staffId, date: today, status: 'Absent', breaks: [], overtimeMinutes: 0 });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveOvertime = async (staffId: string, minutes: number) => {
    if (!userShop) return;
    const recordRef = doc(db, 'shops', userShop.id, 'attendance', `${staffId}_${today}`);
    await updateDoc(recordRef, { overtimeMinutes: minutes });
    alert("Overtime recorded!");
  };

  const clearRecordsForMonth = async () => {
    if (!userShop || !window.confirm("ARE YOU SURE? This will permanently delete all attendance records for THIS MONTH.")) return;
    const batch = writeBatch(db);
    const startOfMonth = `${selectedMonth}-01`;
    const endOfMonth = `${selectedMonth}-31`;
    const q = query(collection(db, 'shops', userShop.id, 'attendance'), where('date', '>=', startOfMonth), where('date', '<=', endOfMonth));
    const snap = await getDocs(q);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    alert("Fresh Start: Records Cleared.");
  };

  // Performance Math
  const monthlyStats = useMemo(() => {
    if (!userShop) return [];
    return eligibleStaff.map(staff => {
      const records = monthlyAttendance.filter(r => r.staffId === staff.id);
      
      let He = 0; // Expected Hours
      let Ha = 0; // Actual Hours
      let P = 0;  // Penalties (minutes)

      records.forEach(rec => {
        // Calculate Expected hours from eligible shifts for days present or absent
        // Assuming we take the average duration of assigned shifts for that staff
        const totalEligibleDuration = (staff.eligibleShifts || []).reduce((acc, shiftId) => {
          const shift = userShop.shifts.find(s => s.id === shiftId);
          if (shift) {
            const [sh, sm] = shift.start.split(':').map(Number);
            const [eh, em] = shift.end.split(':').map(Number);
            let duration = (eh * 60 + em) - (sh * 60 + sm);
            if (duration < 0) duration += 24 * 60; // Overnight
            return acc + duration;
          }
          return acc;
        }, 0);
        
        const dayHe = totalEligibleDuration / (staff.eligibleShifts.length || 1);
        He += dayHe;

        if (rec.status === 'Absent') {
          P += dayHe; // Penalty for absent day is the whole expected duration
        } else if (rec.signIn && rec.signOut) {
          // Ha = (Out - In) - UnapprovedBreaks + Overtime
          const totalInMins = (rec.signOut - rec.signIn) / (1000 * 60);
          const unapprovedBreakMins = rec.breaks.filter(b => !b.approved).reduce((acc, b) => {
            if (b.end && b.start) return acc + (b.end - b.start) / (1000 * 60);
            return acc;
          }, 0);
          
          Ha += (totalInMins - unapprovedBreakMins + rec.overtimeMinutes);
          
          // Late Penalty
          const firstShift = userShop.shifts.find(s => s.id === staff.eligibleShifts[0]);
          if (firstShift) {
            const [sh, sm] = firstShift.start.split(':').map(Number);
            const inDate = new Date(rec.signIn);
            const shiftStart = new Date(rec.signIn);
            shiftStart.setHours(sh, sm, 0, 0);
            if (inDate.getTime() > shiftStart.getTime()) {
              P += (inDate.getTime() - shiftStart.getTime()) / (1000 * 60);
            }
          }
          
          // Unapproved Break Penalty
          P += unapprovedBreakMins;
        }
      });

      return {
        staff,
        expectedHours: (He / 60).toFixed(1),
        actualHours: (Ha / 60).toFixed(1),
        penaltyMinutes: Math.round(P)
      };
    });
  }, [eligibleStaff, monthlyAttendance, userShop]);

  if (!userShop) return <Layout user={currentUser!} onLogout={onLogout}>Restricted</Layout>;

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all"><ArrowLeft className="h-5 w-5" /> Workspace</button>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Register Management</h1>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setActiveTab('daily')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'daily' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-white border text-slate-400'}`}>Daily Call</button>
            <button onClick={() => setActiveTab('monthly')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'monthly' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border text-slate-400'}`}>Monthly Records</button>
          </div>
        </div>
        
        {activeTab === 'monthly' && (
          <div className="flex gap-3">
             <input type="month" className="p-4 bg-white border-2 rounded-2xl font-black text-sm" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
             <button onClick={clearRecordsForMonth} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border-2 border-red-100"><RefreshCw className="h-5 w-5" /></button>
          </div>
        )}
      </div>

      {activeTab === 'daily' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
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
        </div>
      ) : (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-8 py-6">Staff Member</th>
                  <th className="px-8 py-6">Contact</th>
                  <th className="px-8 py-6 text-center">Expected (Hr)</th>
                  <th className="px-8 py-6 text-center">Actual (Hr)</th>
                  <th className="px-8 py-6 text-center">Penalty (Min)</th>
                  <th className="px-8 py-6 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthlyStats.map(({ staff, expectedHours, actualHours, penaltyMinutes }) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">{staff.fullName.charAt(0)}</div>
                        <span className="font-black text-slate-900">{staff.fullName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-500 font-bold text-sm">{staff.phone}</td>
                    <td className="px-8 py-6 text-center font-black text-slate-700">{expectedHours}</td>
                    <td className="px-8 py-6 text-center font-black text-indigo-600">{actualHours}</td>
                    <td className="px-8 py-6 text-center font-black text-red-500">{penaltyMinutes}</td>
                    <td className="px-8 py-6 text-right">
                       <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${Number(actualHours) >= Number(expectedHours) ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                         {Number(actualHours) >= Number(expectedHours) ? 'Excellent' : 'Deficit'}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
  const [showBreakDialog, setShowBreakDialog] = useState(false);

  const statusColors: any = {
    'Present': 'bg-green-500',
    'Absent': 'bg-red-500',
    'On Break': 'bg-orange-500',
    'Sign Out': 'bg-slate-400'
  };

  return (
    <div className="p-8 bg-white border-2 border-transparent rounded-[32px] shadow-sm hover:border-blue-100 transition-all">
      <div className="flex flex-col xl:flex-row gap-8 justify-between">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-xl border">
            {staff.fullName.charAt(0)}
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{staff.fullName}</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{staff.phone} • {staff.position}</p>
            <div className="flex items-center gap-2 mt-4">
              <div className={`w-2 h-2 rounded-full ${statusColors[record?.status || ''] || 'bg-slate-200'}`} />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{record?.status || 'NOT SIGNED IN'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row items-center gap-6 justify-end">
          {!record || record.status === 'Absent' ? (
            <div className="flex gap-2">
              <button onClick={() => onAction('in')} className="px-6 py-4 bg-green-600 text-white font-black rounded-2xl shadow-lg shadow-green-100 text-xs uppercase tracking-widest flex items-center gap-2"><Check className="h-4 w-4" /> Sign In</button>
              <button onClick={() => onAction('absent')} className="px-6 py-4 bg-red-50 text-red-600 border-2 border-red-100 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2"><X className="h-4 w-4" /> Absent</button>
            </div>
          ) : (
            <>
              {record.status !== 'Sign Out' && (
                <div className="flex gap-2">
                  {record.status === 'On Break' ? (
                    <div className="flex gap-2 animate-in fade-in zoom-in">
                       <button onClick={() => onAction('break_end', true)} className="px-4 py-3 bg-green-50 text-green-600 border-2 border-green-100 font-black rounded-xl text-[10px] uppercase">Approved End</button>
                       <button onClick={() => onAction('break_end', false)} className="px-4 py-3 bg-orange-50 text-orange-600 border-2 border-orange-100 font-black rounded-xl text-[10px] uppercase">Unapproved End</button>
                    </div>
                  ) : (
                    <button onClick={() => onAction('break_start')} className="px-6 py-4 bg-orange-50 text-orange-600 font-black rounded-2xl border-2 border-orange-100 text-xs uppercase tracking-widest flex items-center gap-2"><Coffee className="h-4 w-4" /> Went Out</button>
                  )}
                  <button onClick={() => onAction('out')} className="px-6 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2">Sign Out</button>
                </div>
              )}
              
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
                 <input type="number" className="w-16 p-3 bg-white border-2 rounded-xl font-black text-center text-xs outline-none" value={ot} onChange={e => setOt(Number(e.target.value))} />
                 <p className="text-[10px] font-black text-slate-400 uppercase">Min OT</p>
                 <button onClick={() => onSaveOvertime(ot)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg"><Save className="h-4 w-4" /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
