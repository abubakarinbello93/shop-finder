
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
import { User, Shop } from '../types';

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
          alert(`Shop GPS fixed! Customers can now find you.`);
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
    if (commentText.trim() && shop && onAddComment) {
      onAddComment(shop.id, commentText.trim());
      setCommentText('');
      setShowCommentModal(false);
      alert("Status update posted!");
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
      <div className="md:hidden bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-indigo-600 font-black text-xl tracking-tighter uppercase">SHOP FINDER</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-8 hidden md:flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <span className="text-white font-black text-xl">S</span>
             </div>
             <h1 className="text-indigo-600 font-black text-2xl tracking-tighter uppercase leading-none">SHOP FINDER</h1>
          </div>

          <div className="px-8 py-2 mb-6">
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Active Session</p>
            <p className="font-bold text-[#0f172a] truncate">{user.username}</p>
            {shop && <p className="text-xs font-black text-indigo-600 mt-1 uppercase truncate tracking-tight">{shop.name}</p>}
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all
                  ${location.pathname === item.path 
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                <item.icon className={`mr-3 h-5 w-5 ${location.pathname === item.path ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            ))}

            {shop && (
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-4 px-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2">Manager Tools</p>
                
                <button 
                  onClick={() => setShowCommentModal(true)}
                  className="w-full flex items-center px-4 py-3 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                >
                  <MessageSquarePlus className="mr-3 h-5 w-5" />
                  Post Status
                </button>

                <button
                  onClick={handleCaptureShopLocation}
                  disabled={isCapturing}
                  className={`flex items-center w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${shop.location ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-700 animate-pulse'}`}
                >
                  {isCapturing ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-2" />
                  ) : (
                    shop.location ? <Check className="mr-2 h-4 w-4" /> : <Navigation className="mr-2 h-4 w-4" />
                  )}
                  {isCapturing ? 'Locating...' : (shop.location ? 'Refresh GPS' : 'Fix Shop GPS')}
                </button>

                <div 
                   onClick={toggleVisibility}
                   className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all"
                >
                   <div className="flex items-center gap-2">
                      {shop.locationVisible ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                      <span className="text-[9px] font-black uppercase text-slate-600">Visible on Map</span>
                   </div>
                   <div className={`w-8 h-4 rounded-full transition-all relative ${shop.locationVisible ? 'bg-green-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${shop.locationVisible ? 'right-0.5' : 'left-0.5'}`} />
                   </div>
                </div>
              </div>
            )}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Status Update Modal */}
      {showCommentModal && shop && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-md:max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xl font-black text-[#0f172a] tracking-tight uppercase">Facility Status</h2>
              <button onClick={() => setShowCommentModal(false)} className="p-2 bg-white border rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                 <Bell className="h-5 w-5 text-indigo-600 shrink-0 mt-1" />
                 <p className="text-[11px] font-bold text-indigo-800 leading-tight">
                   Notify users of special hours, closures, or new products.
                 </p>
              </div>

              <div className="relative">
                <textarea 
                  className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-[#0f172a] focus:border-indigo-600 focus:bg-white outline-none resize-none min-h-[140px] transition-all"
                  placeholder="e.g., We are now stocking fresh medical equipment!"
                  maxLength={200}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className={`absolute bottom-3 right-4 text-xs font-black ${commentText.length >= 190 ? 'text-red-500' : 'text-slate-400'}`}>
                  {commentText.length}/200
                </div>
              </div>
              <button 
                onClick={handlePostComment}
                disabled={!commentText.trim()}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:shadow-none uppercase tracking-widest text-sm"
              >
                <Send className="h-5 w-5" /> Update Status
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
