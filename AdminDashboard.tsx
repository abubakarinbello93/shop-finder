
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Store, 
  Activity, 
  LogOut, 
  Search, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  BarChart3,
  PieChart,
  Map,
  Layers,
  Calendar,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { AppState } from '../types';

interface AdminDashboardProps {
  state: AppState;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'metrics'>('users');

  const stats = useMemo(() => {
    return {
      totalUsers: state.allUsers.length,
      totalShops: state.shops.length,
      openShops: state.shops.filter(s => s.isOpen).length,
      totalEvents: state.history.length
    };
  }, [state]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.shops.forEach(s => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [state.shops]);

  const stateData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.shops.forEach(s => {
      counts[s.state] = (counts[s.state] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [state.shops]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return state.allUsers.filter(u => 
      u.username.toLowerCase().includes(term) || 
      u.phone.includes(term) ||
      (u.shopId && state.shops.find(s => s.id === u.shopId)?.name.toLowerCase().includes(term))
    );
  }, [state.allUsers, state.shops, searchTerm]);

  const recentActivity = useMemo(() => {
    return [...state.history].sort((a, b) => b.timestamp - a.timestamp);
  }, [state.history]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-72 bg-gray-900 text-white flex flex-col sticky top-0 h-auto md:h-screen">
        <div className="p-8">
           <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50">
                <ShieldCheck className="text-white h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Shop Finder</h1>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Platform Admin</p>
              </div>
           </div>

           <nav className="space-y-1.5">
             <SidebarLink 
               active={activeTab === 'users'} 
               onClick={() => setActiveTab('users')} 
               icon={Users} 
               label="User Database" 
             />
             <SidebarLink 
               active={activeTab === 'activity'} 
               onClick={() => setActiveTab('activity')} 
               icon={Activity} 
               label="Operational Logs" 
             />
             <SidebarLink 
               active={activeTab === 'metrics'} 
               onClick={() => setActiveTab('metrics')} 
               icon={BarChart3} 
               label="Metrics" 
             />
           </nav>
        </div>

        <div className="mt-auto p-8 border-t border-gray-800">
           <div className="flex items-center gap-3 mb-6 p-4 bg-gray-800/50 rounded-2xl">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Admin Profile</p>
                <p className="text-sm font-bold truncate">{state.currentUser?.username}</p>
              </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-black text-sm text-red-400 hover:bg-red-950/50 border border-transparent hover:border-red-900/50 transition-all uppercase tracking-widest"
           >
             <LogOut className="h-4 w-4" /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <header className="mb-10 animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none uppercase">
                {activeTab === 'users' && 'Account Management'}
                {activeTab === 'activity' && 'Operational Pulse'}
                {activeTab === 'metrics' && 'Market Analysis'}
              </h2>
            </div>
            <div className="hidden lg:flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest border border-blue-100">
              <Clock className="h-4 w-4" /> Live Tracking
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="blue" trend="+12% month" />
          <StatCard label="Live Shops" value={stats.totalShops} icon={Store} color="indigo" trend="Global units" />
          <StatCard label="Open Now" value={stats.openShops} icon={TrendingUp} color="green" trend="Active status" />
          <StatCard label="Log Events" value={stats.totalEvents} icon={Activity} color="orange" trend="Total updates" />
        </section>

        {activeTab === 'users' && (
          <section className="bg-white rounded-[40px] shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <Users className="text-blue-600 h-6 w-6" />
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Users</h3>
              </div>
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search accounts..." 
                  className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-sm focus:border-blue-600 outline-none shadow-inner"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    <th className="px-8 py-5">User Profile</th>
                    <th className="px-8 py-5">Contact</th>
                    <th className="px-8 py-5">Role</th>
                    <th className="px-8 py-5">Facility</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => {
                    const shop = state.shops.find(s => s.id === u.shopId);
                    return (
                      <tr key={u.id} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-black text-lg shadow-sm">
                              {u.username.charAt(0)}
                            </div>
                            <div>
                              <p className="font-black text-gray-900 text-base">{u.username}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {u.id.substring(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-700">{u.phone || 'N/A'}</span>
                              <span className="text-[10px] font-black text-gray-400 truncate max-w-[150px]">{u.email || 'No email'}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm ${u.isAdmin ? 'bg-purple-600 text-white' : (u.shopId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600')}`}>
                             {u.isAdmin ? 'Admin' : (u.shopId ? 'Owner' : 'User')}
                           </span>
                        </td>
                        <td className="px-8 py-6">
                           {shop ? (
                             <div className="flex items-center gap-2">
                               <div className={`w-2 h-2 rounded-full ${shop.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                               <p className="text-sm font-black text-gray-900 leading-none">{shop.name}</p>
                             </div>
                           ) : <p className="text-xs text-gray-300 font-bold uppercase">None</p>}
                        </td>
                        <td className="px-8 py-6 text-right">
                           <button className="p-3 hover:bg-blue-600 hover:text-white rounded-xl text-blue-600 transition-all border border-blue-100">
                             <ArrowUpRight className="h-4 w-4" />
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'activity' && (
          <section className="bg-white rounded-[40px] shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">System Feed</h3>
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
            <div className="p-8 space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((event) => {
                const shop = state.shops.find(s => s.id === event.shopId);
                const isAuto = event.username.includes('Auto');
                return (
                  <div key={event.id} className="flex items-center gap-6 p-6 rounded-3xl border-2 border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all group">
                     <div className={`p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${event.action.includes('Opened') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {event.action.includes('Opened') ? <CheckCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                     </div>
                     <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-gray-900 text-lg uppercase tracking-tight leading-tight">{event.action}</p>
                            <p className="text-sm font-bold text-blue-600 flex items-center gap-1 mt-0.5"><Store className="h-3 w-3" /> {shop?.name || 'Deleted Facility'}</p>
                          </div>
                          <span className="text-[10px] font-black text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm uppercase tracking-widest">{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </div>
                     </div>
                  </div>
                );
              }) : (
                <div className="p-24 text-center">
                  <Activity className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-xl font-black text-gray-400 uppercase">No events</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[40px] shadow-sm border">
                <div className="flex items-center gap-3 mb-8">
                  <PieChart className="text-indigo-600 h-6 w-6" />
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Categories</h3>
                </div>
                <div className="space-y-6">
                  {categoryData.map(([cat, count]) => {
                    const percentage = Math.round((count / stats.totalShops) * 100);
                    return (
                      <div key={cat} className="space-y-2">
                        <div className="flex justify-between text-sm font-black uppercase tracking-widest">
                          <span className="text-gray-600">{cat}</span>
                          <span className="text-indigo-600">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-sm border">
                <div className="flex items-center gap-3 mb-8">
                  <Map className="text-green-600 h-6 w-6" />
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Geo Distribution</h3>
                </div>
                <div className="space-y-6">
                  {stateData.map(([st, count]) => {
                    const percentage = Math.round((count / stats.totalShops) * 100);
                    return (
                      <div key={st} className="space-y-2">
                        <div className="flex justify-between text-sm font-black uppercase tracking-widest">
                          <span className="text-gray-600">{st}</span>
                          <span className="text-green-600">{count}</span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const SidebarLink: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all border-2 border-transparent ${active ? 'bg-blue-600 text-white shadow-lg border-blue-500' : 'text-gray-500 hover:bg-gray-800/50 hover:text-white'}`}
  >
    <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-500'}`} /> {label}
  </button>
);

const StatCard: React.FC<{ label: string, value: number | string, icon: any, color: string, trend: string }> = ({ label, value, icon: Icon, color, trend }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    green: 'bg-green-600',
    orange: 'bg-orange-600'
  };

  return (
    <div className="bg-white p-7 rounded-[40px] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
      <div className={`p-4 ${colorMap[color]} text-white rounded-[24px] w-fit mb-6 shadow-lg group-hover:rotate-6 transition-transform`}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">{label}</p>
        <p className="text-3xl font-black text-gray-900 leading-none">{value}</p>
        <div className="mt-4 flex items-center gap-1.5">
           <TrendingUp className="h-3 w-3 text-green-500" />
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{trend}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
