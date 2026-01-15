import React, { useState, useMemo } from 'react';
import { Users, Store, Activity, LogOut, Search, ShieldCheck, UserCheck, Clock, ArrowUpRight, TrendingUp, BarChart3, PieChart, Map } from 'lucide-react';
import { AppState } from './types';

interface AdminDashboardProps {
  state: AppState;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ state, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'activity' | 'metrics'>('users');
  const stats = useMemo(() => ({ totalUsers: state.allUsers.length, totalShops: state.shops.length, openShops: state.shops.filter(s => s.isOpen).length, totalEvents: state.history.length }), [state]);
  const filteredUsers = useMemo(() => { const term = searchTerm.toLowerCase(); return state.allUsers.filter(u => u.username.toLowerCase().includes(term) || u.phone.includes(term)); }, [state.allUsers, searchTerm]);
  const recentActivity = useMemo(() => [...state.history].sort((a, b) => b.timestamp - a.timestamp), [state.history]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-72 bg-gray-900 text-white flex flex-col sticky top-0 h-auto md:h-screen"><div className="p-8"><div className="flex items-center gap-3 mb-10"><div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheck className="text-white h-7 w-7" /></div><div><h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Shop Finder</h1><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Platform Admin</p></div></div><nav className="space-y-1.5"><SidebarLink active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="User Database" /><SidebarLink active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={Activity} label="Logs" /><SidebarLink active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} icon={BarChart3} label="Metrics" /></nav></div><div className="mt-auto p-8 border-t border-gray-800"><button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-black text-sm text-red-400 hover:bg-red-950 transition-all uppercase tracking-widest"><LogOut className="h-4 w-4" /> Sign Out</button></div></aside>
      <main className="flex-1 p-4 md:p-10 overflow-y-auto"><header className="mb-10"><h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none uppercase">{activeTab === 'users' ? 'Users' : activeTab === 'activity' ? 'Activity' : 'Metrics'}</h2></header>
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10"><StatCard label="Users" value={stats.totalUsers} icon={Users} color="blue" /><StatCard label="Shops" value={stats.totalShops} icon={Store} color="indigo" /><StatCard label="Open" value={stats.openShops} icon={TrendingUp} color="green" /><StatCard label="Events" value={stats.totalEvents} icon={Activity} color="orange" /></section>
        {activeTab === 'users' && (
          <section className="bg-white rounded-[40px] shadow-sm border overflow-hidden"><div className="p-8 border-b bg-gray-50 flex justify-between items-center gap-4"><div className="flex items-center gap-3"><Users className="text-blue-600 h-6 w-6" /><h3 className="text-xl font-black text-gray-900 uppercase">Users</h3></div><input type="text" placeholder="Search..." className="pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-sm focus:border-blue-600 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div><div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-[10px] font-black uppercase text-gray-400 tracking-widest"><th className="px-8 py-5">Profile</th><th className="px-8 py-5">Role</th><th className="px-8 py-5">Facility</th></tr></thead><tbody className="divide-y divide-gray-100">{filteredUsers.map(u => <tr key={u.id} className="hover:bg-blue-50/30 transition-all"><td className="px-8 py-6"><p className="font-black text-gray-900">{u.username}</p><p className="text-[10px] text-gray-400">{u.phone}</p></td><td className="px-8 py-6"><span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${u.isAdmin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>{u.isAdmin ? 'Admin' : (u.shopId ? 'Owner' : 'User')}</span></td><td className="px-8 py-6"><p className="text-sm font-black">{state.shops.find(s => s.id === u.shopId)?.name || 'None'}</p></td></tr>)}</tbody></table></div></section>
        )}
      </main>
    </div>
  );
};
const SidebarLink = ({ active, onClick, icon: Icon, label }: any) => <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800 hover:text-white'}`}><Icon className="h-5 w-5" /> {label}</button>;
const StatCard = ({ label, value, icon: Icon, color }: any) => { const colorMap: any = { blue: 'bg-blue-600', indigo: 'bg-indigo-600', green: 'bg-green-600', orange: 'bg-orange-600' }; return <div className="bg-white p-7 rounded-[40px] shadow-sm border border-gray-100"><div className={`p-4 ${colorMap[color]} text-white rounded-[24px] w-fit mb-6 shadow-lg`}><Icon className="h-7 w-7" /></div><div><p className="text-[10px] font-black text-gray-400 uppercase mb-2">{label}</p><p className="text-3xl font-black text-gray-900">{value}</p></div></div>; };
export default AdminDashboard;