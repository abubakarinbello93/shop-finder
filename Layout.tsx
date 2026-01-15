
import React, { ReactNode, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  CheckCircle, 
  Heart, 
  Settings, 
  History, 
  LogOut,
  Menu,
  X,
  MessageSquarePlus,
  Send,
  Bell
} from 'lucide-react';
import { User, Shop } from './types';

interface LayoutProps {
  children: ReactNode;
  user: User;
  shop?: Shop;
  allShops?: Shop[];
  onLogout: () => void;
  onUpdateShop?: (id: string, updates: Partial<Shop>) => void;
  onAddComment?: (shopId: string, text: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, shop, onLogout, onAddComment }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const location = useLocation();

  const handlePostComment = () => {
    if (commentText.trim() && shop && onAddComment) {
      onAddComment(shop.id, commentText.trim());
      setCommentText('');
      setShowCommentModal(false);
    }
  };

  const menuItems = useMemo(() => {
    const items = [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Discover', icon: CheckCircle, path: '/available' },
      { name: 'Favorites', icon: Heart, path: '/favorites' },
    ];
    if (user.shopId) items.splice(1, 0, { name: 'Inventory', icon: Package, path: '/services' });
    items.push({ name: 'History', icon: History, path: '/history' });
    return items;
  }, [user.shopId]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
      <div className="md:hidden bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-blue-600 font-black text-xl uppercase tracking-tighter">Shop Finder</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle menu">{isSidebarOpen ? <X /> : <Menu />}</button>
      </div>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="hidden md:flex items-center gap-3 mb-10">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-100">S</div>
             <h1 className="text-blue-600 font-black text-2xl uppercase tracking-tighter">Shop Finder</h1>
          </div>
          <div className="mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Active Session</p>
            <p className="font-bold text-[#0f172a] truncate">{user.username}</p>
            {shop && <p className="text-[10px] font-black text-blue-600 uppercase truncate mt-1">{shop.name}</p>}
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={`flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${location.pathname === item.path ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                <item.icon className={`mr-3 h-5 w-5 ${location.pathname === item.path ? 'text-blue-600' : 'text-slate-400'}`} /> {item.name}
              </Link>
            ))}
            {shop && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button onClick={() => setShowCommentModal(true)} className="w-full flex items-center px-4 py-3 text-sm font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                  <MessageSquarePlus className="mr-3 h-5 w-5" /> Post Update
                </button>
              </div>
            )}
          </nav>
          <div className="pt-6 border-t border-slate-100">
            <button onClick={onLogout} className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"><LogOut className="mr-3 h-5 w-5" /> Sign Out</button>
          </div>
        </div>
      </aside>

      {showCommentModal && shop && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight">Post Status Update</h2>
              <button onClick={() => setShowCommentModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="h-6 w-6 text-slate-400" /></button>
            </div>
            <textarea className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold outline-none resize-none min-h-[140px] focus:border-blue-600 focus:bg-white transition-all" placeholder="e.g., We are now stocking fresh supplies!" maxLength={200} value={commentText} onChange={(e) => setCommentText(e.target.value)} />
            <button onClick={handlePostComment} disabled={!commentText.trim()} className="w-full mt-4 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-sm shadow-xl shadow-blue-100 transition-all">
              <Send className="h-5 w-5" /> Send Update
            </button>
          </div>
        </div>
      )}

      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      <main className="flex-1 overflow-y-auto p-4 md:p-8"><div className="max-w-6xl mx-auto">{children}</div></main>
    </div>
  );
};

export default Layout;
