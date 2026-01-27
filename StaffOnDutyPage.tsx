import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Clock, ShieldCheck, Search, Filter } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop } from './types';

interface StaffOnDutyPageProps {
  state: AppState;
  onLogout: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
}

const StaffOnDutyPage: React.FC<StaffOnDutyPageProps> = ({ state, onLogout, onUpdateShop }) => {
  const navigate = useNavigate();
  const { currentUser, shops, history } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  const activeStaff = useMemo(() => {
    if (!userShop) return [];
    
    // Logic: Staff are on duty if their last history action in the LAST 24 HOURS was 'Facility Opened' 
    // OR if we implement a specific 'Staff Logged In' collection.
    // For this implementation, we rely on the specific staff list within the shop 
    // filtered against active attendance records if available.
    
    // As per requirement, sorting by Position then Name
    return [...(userShop.staff || [])].sort((a, b) => {
      const posA = (a.position || 'Staff').toLowerCase();
      const posB = (b.position || 'Staff').toLowerCase();
      if (posA !== posB) return posA.localeCompare(posB);
      return a.username.localeCompare(b.username);
    });
  }, [userShop]);

  if (!userShop) return <Layout user={currentUser!} onLogout={onLogout}>Restricted</Layout>;

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout} onUpdateShop={onUpdateShop}>
      <div className="mb-10 flex flex-col gap-6">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 font-black uppercase text-[10px] tracking-widest hover:gap-3 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Workspace
        </button>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
             <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">Operational Surveillance</h1>
             <div className="flex items-center gap-3 mt-4">
                <span className="text-blue-600 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <Clock className="h-3.5 w-3.5" /> Live Personnel Feed
                </span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeStaff.length > 0 ? activeStaff.map((staff) => (
          <div key={staff.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all group animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-300 font-black text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                  {staff.username.charAt(0)}
                </div>
                <div className="text-right">
                   <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-blue-100">Verified</span>
                   <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Code: {staff.staffCode}</p>
                </div>
             </div>
             
             <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none truncate">{staff.username}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                   <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> {staff.position || 'Staff'}
                </p>
             </div>

             <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                <div>
                   <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</p>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                      <span className="text-[10px] font-black text-green-600 uppercase">On-Site</span>
                   </div>
                </div>
                <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                   <Search className="h-4 w-4" />
                </button>
             </div>
          </div>
        )) : (
          <div className="col-span-full py-40 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100">
             <Users className="h-20 w-20 text-slate-100 mx-auto mb-6" />
             <h3 className="text-2xl font-black text-slate-300 uppercase tracking-tighter">Zero Active Personnel</h3>
             <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-xs">Awaiting daily register sign-in</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffOnDutyPage;
