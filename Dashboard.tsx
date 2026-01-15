
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, Package, CheckCircle, Heart, History, ChevronRight, Clock, Navigation, Check, Plus, X } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop } from './types';
import ShopDetailModal from './ShopDetailModal';
import { ALL_STATES, NIGERIA_STATES, BUSINESS_CATEGORIES } from './constants';

interface DashboardProps {
  state: AppState;
  onLogout: () => void;
  onToggleFavorite: (id: string) => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
  onRegisterShop: (shopData: Partial<Shop>) => void;
  onAddComment: (shopId: string, text: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onLogout, onToggleFavorite, onUpdateShop, onRegisterShop, onAddComment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const navigate = useNavigate();
  const { currentUser, shops, comments } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    let results: any[] = [];
    shops.forEach(s => {
      const shopMatches = s.name.toLowerCase().includes(term) || s.type.toLowerCase().includes(term) || s.code.toLowerCase().includes(term);
      if (shopMatches) results.push({ type: 'shop', shop: s });
    });
    return results;
  }, [searchTerm, shops]);

  const blockItems = useMemo(() => {
    const items = [
      { title: 'Discover', icon: CheckCircle, value: shops.filter(s => s.isOpen).length, path: '/available', color: 'bg-indigo-600' },
      { title: 'Favorites', icon: Heart, value: currentUser?.favorites.length || 0, path: '/favorites', color: 'bg-slate-900' },
      { title: 'History', icon: History, value: '', path: '/history', color: 'bg-slate-800' },
    ];
    if (userShop) {
        items.splice(1, 0, { title: 'Inventory', icon: Package, value: userShop.items.length, path: '/services', color: 'bg-blue-600' });
    }
    return items;
  }, [userShop, shops, currentUser]);

  return (
    <Layout user={currentUser!} shop={userShop} allShops={shops} onLogout={onLogout} onUpdateShop={onUpdateShop} onAddComment={onAddComment}>
      <header className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        {/* Welcome Message */}
        <div className="bg-blue-50 py-4 px-6 rounded-3xl mb-6 inline-block border border-blue-100 shadow-sm">
           <h2 className="text-lg font-bold text-blue-800 uppercase tracking-tight">Hello, {currentUser?.username}! 👋</h2>
           <p className="text-xs font-medium text-blue-600">Welcome back to Shop Finder. We are happy to have you back!</p>
        </div>
        
        {userShop ? (
          <div className="flex flex-col items-center gap-1 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight leading-tight uppercase">
              {userShop.name}
            </h1>
            <p className="text-sm font-bold text-slate-400 tracking-wide mt-1">
              Managing Facility <span className="text-blue-600 font-black">{userShop.code}</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 mb-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight leading-none mb-2 uppercase">
              Shop Finder Explorer
            </h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Find anything, anywhere. Discovery real-time facility availability.
            </p>
          </div>
        )}
      </header>

      <section className="relative mb-12 max-w-2xl mx-auto group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors">
          <Search className="h-5 w-5 text-slate-300 group-focus-within:text-blue-600" />
        </div>
        <input 
          type="text"
          className="w-full pl-12 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-lg shadow-blue-50 focus:border-blue-600 outline-none font-bold text-base transition-all"
          placeholder="Search facilities or services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {searchTerm.trim() && (
          <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl border border-slate-100 z-20 overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
            {searchResults.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {searchResults.map((res, idx) => (
                  <div key={idx} onClick={() => setSelectedShop(res.shop)} className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors">
                    <div>
                      <h4 className="font-bold text-[#0f172a] text-sm uppercase">{res.shop.name}</h4>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{res.shop.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${res.shop.isOpen ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                            {res.shop.isOpen ? 'Open' : 'Closed'}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-black text-[10px] uppercase tracking-widest">No results found</div>
            )}
          </div>
        )}
      </section>

      {userShop && (
        <section className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
          <div className={`p-6 rounded-3xl text-white shadow-xl flex items-center justify-between transition-all duration-500 ${userShop.isOpen ? 'bg-blue-600 shadow-blue-200' : 'bg-red-600 shadow-red-200'}`}>
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                <Store className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Facility Control</h3>
                <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest mt-0.5 text-white">
                  Status is {userShop.isOpen ? 'Open' : 'Closed'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => onUpdateShop(userShop.id, { isOpen: !userShop.isOpen })}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner ${userShop.isOpen ? 'bg-blue-400' : 'bg-red-400'}`}
              aria-label={userShop.isOpen ? "Close Shop" : "Open Shop"}
            >
              <span className={`inline-block h-8 w-8 transform rounded-full bg-white shadow transition-all duration-300 flex items-center justify-center ${userShop.isOpen ? 'translate-x-11' : 'translate-x-1'}`}>
                <div className={`w-2 h-2 rounded-full ${userShop.isOpen ? 'bg-blue-600' : 'bg-red-600'}`} />
              </span>
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {blockItems.map((item, idx) => (
          <div key={idx} onClick={() => navigate(item.path)} className={`cursor-pointer relative p-6 rounded-3xl text-white shadow-lg transition-all hover:-translate-y-1 active:scale-95 overflow-hidden ${item.color} group h-32 md:h-40`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="p-2 bg-white/20 rounded-lg w-fit mb-2 group-hover:bg-white group-hover:text-slate-900 transition-colors">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{item.title}</h3>
                {item.value !== '' && <p className="text-xl md:text-3xl font-black mt-1 leading-none">{item.value}</p>}
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-[0.05] group-hover:opacity-[0.15] transition-opacity"><item.icon className="h-24 w-24 md:h-32 md:w-32" /></div>
          </div>
        ))}
      </section>

      {selectedShop && (
        <ShopDetailModal 
          shop={selectedShop} 
          isFavorite={currentUser?.favorites.includes(selectedShop.id) || false}
          onClose={() => setSelectedShop(null)} 
          onToggleFavorite={onToggleFavorite}
          comments={comments}
          onAddComment={onAddComment}
        />
      )}
    </Layout>
  );
};

export default Dashboard;
