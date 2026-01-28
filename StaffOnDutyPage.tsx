import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, ArrowLeft, ShieldAlert, BadgeCheck } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, AttendanceRecord, Staff } from './types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

interface StaffOnDutyPageProps {
  state: AppState;
  onLogout: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
}

const StaffOnDutyPage: React.FC<StaffOnDutyPageProps> = ({ state, onLogout, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);
  const [dutyList, setDutyList] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userShop) return;

    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'shops', userShop.id, 'attendance'),
      where('date', '==', today),
      where('status', 'in', ['Present', 'On Break'])
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setDutyList(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
      setIsLoading(false);
    });

    return () => unsub();
  }, [userShop?.id]);

  const sortedDuty = useMemo(() => {
    if (!userShop) return [];
    return dutyList.map(rec => {
      const staff = userShop.staff.find(s => s.id === rec.staffId);
      return { rec, staff };
    })
    .filter(item => item.staff)
    .sort((a, b) => {
      const posA = a.staff?.position || '';
      const posB = b.staff?.position || '';
      if (posA !== posB) return posA.localeCompare(posB);
      return (a.staff?.fullName || '').localeCompare(b.staff?.fullName || '');
    });
  }, [dutyList, userShop]);

  if (!userShop) return <Layout user={currentUser!} onLogout={onLogout}>Restricted</Layout>;

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-2 hover:gap-3 transition-all">
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Staff on Duty</h1>
        <p className="text-gray-500 font-bold mt-2">Currently active personnel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedDuty.map(({ rec, staff }) => (
          <div key={rec.id} className="p-8 bg-white border-2 border-transparent rounded-[32px] shadow-sm hover:border-blue-100 transition-all flex flex-col items-center text-center group">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-[28px] bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 transition-transform">
                {staff?.fullName.charAt(0)}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white flex items-center justify-center ${rec.status === 'On Break' ? 'bg-orange-500' : 'bg-green-500'}`}>
                {rec.status === 'On Break' ? <Clock className="h-2.5 w-2.5 text-white" /> : <BadgeCheck className="h-2.5 w-2.5 text-white" />}
              </div>
            </div>
            
            <h3 className="text-xl font-black text-slate-900 leading-tight">{staff?.fullName}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 border-b pb-2 mb-4 w-full">{staff?.position}</p>
            
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Signed In</p>
                <p className="font-black text-xs text-slate-700 mt-1">{new Date(rec.signIn!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Status</p>
                <p className={`font-black text-xs mt-1 ${rec.status === 'On Break' ? 'text-orange-600' : 'text-green-600'}`}>{rec.status.toUpperCase()}</p>
              </div>
            </div>
          </div>
        ))}
        {sortedDuty.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-50">
            <ShieldAlert className="h-16 w-16 text-slate-100 mx-auto mb-4" />
            <p className="font-black text-slate-300 uppercase tracking-widest">No staff currently signed in.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffOnDutyPage;

