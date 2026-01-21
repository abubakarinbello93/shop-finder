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
  Navigation,
  Check,
  Eye,
  EyeOff,
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

const Layout: React.FC<LayoutProps> = ({ children, user, shop, allShops = [], onLogout, onUpdateShop, onAddComment }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const location = useLocation();

  const handleCaptureShopLocation = () => {
    if (!shop || !onUpdateShop) return;
    setIsCapturing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onUpdateShop(shop.id, { 
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            locationVisible: true
          });
          setIsCapturing(false);
          alert(`Facility GPS fixed! Customers can now find you.`);
        },
        () => {
          setIsCapturing(false);
          alert("Failed to capture location. Please check browser permissions.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsCapturing(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const toggleVisibility = () => {
    if (!shop || !onUpdateShop) return;
    onUpdateShop(shop.id, { locationVisible: !shop.locationVisible });
  };

  const handlePostComment = () => {
    if (commentText.trim() && shop && onUpdateShop) {
      // Overwrite currentStatus in the shop document
      onUpdateShop(shop.id, { currentStatus: commentText.trim() });
      setCommentText('');
      setShowCommentModal(false);
      alert("Status news broadcasted! All users will see this update instantly.");
    }
  };

  const menuItems = useMemo(() => {
    const baseItems = [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'Discover', icon: CheckCircle, path: '/available' },
      { name: 'Favorites', icon: Heart, path: '/favorites' },
    ];

    if (user.shopId) {
      baseItems.splice(1, 0, 
        { name: 'Inventory', icon: Package, path: '/services' }
      );
      baseItems.push({ name: 'Settings', icon: Settings, path: '/settings' });
    }

    baseItems.push({ name: 'History', icon: History, path: '/history' });
    return baseItems;
  }, [user.shopId]);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-blue-600 font-black text-xl tracking-tighter uppercase">OPENSHOP</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-8 hidden md:flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
                <span className="text-white font-black text-2xl">O</span>
             </div>
             <h1 className="text-blue-600 font-black text-2xl tracking-tighter uppercase leading-none">OPENSHOP</h1>
          </div>

          <div className="px-8 py-2 mb-8">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest leading-none mb-2">User Session</p>
            <p className="font-black text-lg text-slate-900 truncate leading-none">{user.username}</p>
            {shop && <p className="text-[11px] font-black text-blue-600 mt-2 uppercase truncate tracking-tight bg-blue-50 px-3 py-1.5 rounded-lg w-fit">{shop.name}</p>}
          </div>

          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center px-5 py-4 text-sm font-black rounded-2xl transition-all uppercase tracking-tight
                  ${location.pathname === item.path 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                <item.icon className={`mr-4 h-5 w-5 ${location.pathname === item.path ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            ))}

            {shop && (
              <div className="mt-10 pt-8 border-t border-slate-100 space-y-5 px-2">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-3">Manager Controls</p>
                
                <button 
                  onClick={() => setShowCommentModal(true)}
                  className="w-full flex items-center px-5 py-4 text-xs font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 uppercase tracking-widest"
                >
                  <MessageSquarePlus className="mr-4 h-5 w-5" />
                  Post Update
                </button>

                <button
                  onClick={handleCaptureShopLocation}
                  disabled={isCapturing}
                  className={`flex items-center w-full px-5 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm ${shop.location ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700 animate-pulse border border-orange-200'}`}
                >
                  {isCapturing ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-3" />
                  ) : (
                    shop.location ? <Check className="mr-3 h-4 w-4" /> : <Navigation className="mr-3 h-4 w-4" />
                  )}
                  {isCapturing ? 'Locating...' : (shop.location ? 'Update GPS' : 'Fix Shop GPS')}
                </button>

                <div 
                   onClick={toggleVisibility}
                   className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                >
                   <div className="flex items-center gap-3">
                      {shop.locationVisible ? <Eye className="h-5 w-5 text-green-600" /> : <EyeOff className="h-5 w-5 text-slate-400" />}
                      <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Public Discoverable</span>
                   </div>
                   <div className={`w-10 h-5 rounded-full transition-all relative ${shop.locationVisible ? 'bg-green-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${shop.locationVisible ? 'right-1' : 'left-1'}`} />
                   </div>
                </div>
              </div>
            )}
          </nav>

          <div className="p-6 border-t mt-auto">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-6 py-4 text-xs font-black text-red-600 hover:bg-red-50 rounded-2xl transition-all uppercase tracking-widest"
            >
              <LogOut className="mr-4 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Status Update Modal */}
      {showCommentModal && shop && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-[#0f172a] tracking-tighter uppercase leading-none">Status News</h2>
              <button onClick={() => setShowCommentModal(false)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-5 bg-indigo-50 border-2 border-indigo-100 rounded-3xl flex items-start gap-4 shadow-sm">
                 <Bell className="h-6 w-6 text-indigo-600 shrink-0 mt-1" />
                 <p className="text-xs font-bold text-indigo-800 leading-tight uppercase tracking-tight">
                   Broadcast special hours, stock updates, or local news to your customers.
                 </p>
              </div>

              <div className="relative group">
                <textarea 
                  className="w-full p-6 bg-slate-50 border-2 border-transparent rounded-3xl font-black text-[#0f172a] focus:border-indigo-600 focus:bg-white outline-none resize-none min-h-[160px] transition-all text-lg shadow-inner"
                  placeholder="e.g. New fresh stock arrived this morning! Open for deliveries."
                  maxLength={200}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className={`absolute bottom-4 right-6 text-[10px] font-black tracking-widest ${commentText.length >= 190 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
                  {commentText.length}/200
                </div>
              </div>
              <button 
                onClick={handlePostComment}
                disabled={!commentText.trim()}
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-indigo-100 flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-sm"
              >
                <Send className="h-6 w-6" /> Broadcast News
              </button>
            </div>
          </div>
        </div>
      )}

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
