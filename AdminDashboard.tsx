
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
import { AppState } from './types';

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

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return state.allUsers.filter(u => 
      u.username.toLowerCase().includes(term) || 
      u.phone.includes(term)
    );
  }, [state.allUsers, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-72 bg-gray-900 text-white flex flex-col sticky top-0 h-auto md:h-screen">
        <div className="p-8">
           <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/50"><ShieldCheck className="text-white h-7 w-7" /></div>
              <div><h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Shop Finder</h1><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Platform Admin</p></div>
           </div>
           <nav className="space-y-1.5">
             <SidebarLink active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="User Database" />
             <SidebarLink active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={Activity} label="Operational Logs" />
             <SidebarLink active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} icon={BarChart3} label="Metrics" />
           </nav>
        </div>
        <div className="mt-auto p-8 border-t border-gray-800">
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-black text-sm text-red-400 hover:bg-red-950/50 transition-all uppercase tracking-widest"><LogOut className="h-4 w-4" /> Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none uppercase mb-8">Admin Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} color="blue" trend="+12% month" />
          <StatCard label="Live Shops" value={stats.totalShops} icon={Store} color="indigo" trend="Global units" />
          <StatCard label="Open Now" value={stats.openShops} icon={TrendingUp} color="green" trend="Active status" />
          <StatCard label="Log Events" value={stats.totalEvents} icon={Activity} color="orange" trend="Total updates" />
        </div>
      </main>
    </div>
  );
};

const SidebarLink: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-black text-sm transition-all border-2 border-transparent ${active ? 'bg-blue-600 text-white shadow-lg border-blue-500' : 'text-gray-500 hover:bg-gray-800/50 hover:text-white'}`}><Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-gray-500'}`} /> {label}</button>
);

const StatCard: React.FC<{ label: string, value: number | string, icon: any, color: string, trend: string }> = ({ label, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-7 rounded-[40px] shadow-sm border border-gray-100 transition-all group">
    <div className={`p-4 ${color === 'blue' ? 'bg-blue-600' : color === 'indigo' ? 'bg-indigo-600' : color === 'green' ? 'bg-green-600' : 'bg-orange-600'} text-white rounded-2xl w-fit mb-6`}><Icon className="h-7 w-7" /></div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">{label}</p><p className="text-3xl font-black text-gray-900 leading-none">{value}</p>
  </div>
);

export default AdminDashboard;
