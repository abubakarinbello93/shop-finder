import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, Package, CheckCircle, Heart, History, ChevronRight, Clock, Navigation, Check, Plus, X, Bell } from 'lucide-react';
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
  const [showRegModal, setShowRegModal] = useState(false);
  const navigate = useNavigate();

  const { currentUser, shops, comments } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  const getCountdown = (shop: Shop) => {
    if (!shop.isAutomatic || !shop.isOpen) return null;

    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const schedules = (shop.businessHours || []).filter(bh => bh.day === currentDay && bh.enabled);
    if (schedules.length === 0) return null;

    let closestDiffMs = Infinity;
    for (const schedule of schedules) {
      const [cH, cM] = schedule.close.split(':').map(Number);
      const closeDate = new Date();
      closeDate.setHours(cH, cM, 0, 0);
      const diffMs = closeDate.getTime() - now.getTime();
      if (diffMs > 0 && diffMs < closestDiffMs) closestDiffMs = diffMs;
    }

    if (closestDiffMs > 0 && closestDiffMs <= 30 * 60 * 1000) {
      const minutes = Math.floor(closestDiffMs / (60 * 1000));
      const seconds = Math.floor((closestDiffMs % (60 * 1000)) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return null;
  };

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    let results: any[] = [];

    shops.forEach(s => {
      const shopMatches = s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term) || s.type.toLowerCase().includes(term);
      const matchingItems = (s.items || []).filter(i => i.name.toLowerCase().includes(term) && i.available);
      
      if (matchingItems.length > 0) {
        matchingItems.forEach(item => results.push({ type: 'item', shop: s, item }));
      } else if (shopMatches) {
        results.push({ type: 'shop', shop: s });
      }
    });

    return results;
  }, [searchTerm, shops]);

  const blockItems = useMemo(() => {
    const items: { title: string, icon: any, value: string | number, path: string, color: string }[] = [
      { title: 'Discover', icon: CheckCircle, value: shops.filter(s => s.isOpen).length, path: '/available', color: 'bg-indigo-600' },
      { title: 'Favorites', icon: Heart, value: currentUser?.favorites.length || 0, path: '/favorites', color: 'bg-slate-900' },
    ];
    if (userShop) {
      items.splice(1, 0, { title: 'Inventory', icon: Package, value: (userShop.items || []).length, path: '/services', color: 'bg-blue-600' });
    }
    items.push({ title: 'History', icon: History, value: '', path: '/history', color: 'bg-slate-800' });
    return items;
  }, [userShop, shops, currentUser]);

  return (
    <Layout user={currentUser!} shop={userShop} allShops={shops} onLogout={onLogout} onUpdateShop={onUpdateShop} onAddComment={onAddComment}>
      <header className="mb-8 text-center animate-in fade-in duration-700">
        <div className="bg-blue-50 py-4 px-6 rounded-3xl mb-6 inline-block border border-blue-100 shadow-sm">
           <h2 className="text-lg font-bold text-blue-800">Hello, {currentUser?.username}! 👋</h2>
           <p className="text-xs font-medium text-blue-600">Find anything, anywhere in real-time.</p>
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
              How can we help?
            </h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Discover local services and products instantly.
            </p>
          </div>
        )}
      </header>

      <section className="relative mb-12 max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-300" />
        </div>
        <input 
          type="text"
          className="w-full pl-12 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-lg shadow-blue-50 focus:border-blue-600 outline-none font-bold text-base transition-all"
          placeholder="Search products, services, or places..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {searchTerm.trim() && (
          <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl border border-slate-100 z-20 overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {searchResults.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {searchResults.map((res, idx) => {
                  const shop = res.shop;
                  const item = res.item;
                  const countdown = getCountdown(shop);

                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedShop(shop)}
                      className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {item && <h3 className="font-black text-blue-600 text-sm uppercase truncate">{item.name}</h3>}
                        </div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-[#0f172a] truncate ${item ? 'text-[10px] opacity-60' : 'text-sm uppercase'}`}>{shop.name}</h4>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest shrink-0">{shop.type}</span>
                        </div>
                        {shop.currentStatus && (
                          <p className="text-[10px] font-bold text-indigo-600 mt-1 truncate italic">
                            <Bell className="inline h-3 w-3 mr-1" /> {shop.currentStatus}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-2">
                        <div className="text-right shrink-0">
                          <div className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${shop.isOpen ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {shop.isOpen ? 'OPEN' : 'CLOSED'}
                          </div>
                          {countdown && (
                            <div className="mt-0.5 flex items-center gap-1 text-[8px] font-black text-red-500 animate-pulse justify-end">
                              <Clock className="h-2.5 w-2.5" /> {countdown}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">No results found</p>
              </div>
            )}
          </div>
        )}
      </section>

      {!userShop && (
        <section className="mb-10 animate-in slide-in-from-top-4 duration-500">
          <div 
            onClick={() => setShowRegModal(true)}
            className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-3xl cursor-pointer hover:border-blue-600 hover:bg-blue-50/30 transition-all group flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-6">
              <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg">
                <Store className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#0f172a] tracking-tight uppercase">Add your facility to Openshop</h3>
                <p className="text-slate-500 font-bold mt-0.5 text-base">Let customers find your inventory in real-time.</p>
              </div>
            </div>
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow group-hover:translate-x-1 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
          </div>
        </section>
      )}

      {userShop && (
        <section className="mb-10 animate-in slide-in-from-top-4 duration-500">
          <div className={`p-6 rounded-3xl text-white shadow-xl flex items-center justify-between transition-all duration-500 ${userShop.isOpen ? 'bg-blue-600' : 'bg-red-600'}`}>
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
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white shadow transition-all duration-300 flex items-center justify-center ${
                  userShop.isOpen ? 'translate-x-11' : 'translate-x-1'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${userShop.isOpen ? 'bg-blue-600' : 'bg-red-600'}`} />
              </span>
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {blockItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => navigate(item.path)}
            className={`cursor-pointer relative p-6 rounded-3xl text-white shadow-lg transition-all hover:-translate-y-1 active:scale-95 overflow-hidden ${item.color} group h-32 md:h-40`}
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="p-2 bg-white/20 rounded-lg w-fit mb-2 group-hover:bg-white group-hover:text-slate-900 transition-colors">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{item.title}</h3>
                {(item.value as string | number) !== '' && <p className="text-xl md:text-3xl font-black mt-1 leading-none">{item.value}</p>}
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-[0.05] group-hover:opacity-[0.15] transition-opacity">
              <item.icon className="h-24 w-24 md:h-32 md:w-32" />
            </div>
          </div>
        ))}
      </section>

      {showRegModal && (
        <RegisterShopModal 
          onClose={() => setShowRegModal(false)} 
          onSave={(data) => {
            onRegisterShop(data);
            setShowRegModal(false);
          }}
        />
      )}

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

const RegisterShopModal: React.FC<{ onClose: () => void, onSave: (data: Partial<Shop>) => void }> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '', type: '', otherCategory: '', state: '', lga: '', address: '',
    lat: null as number | null, lng: null as number | null
  });
  const [isCapturing, setIsCapturing] = useState(false);

  const lgas = formData.state ? NIGERIA_STATES[formData.state] : [];

  const handleCapture = () => {
    setIsCapturing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
          setIsCapturing(false);
          alert("GPS Location Linked!");
        },
        (error) => {
          setIsCapturing(false);
          alert(`GPS fix failed: ${error.message}. Ensure location services are enabled.`);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleSave = () => {
    const finalType = formData.type === 'Other' ? formData.otherCategory : formData.type;
    if (!formData.name || !finalType || !formData.state || !formData.lga || !formData.address) {
      alert("Please fill all required fields.");
      return;
    }
    onSave({
      name: formData.name,
      type: finalType,
      state: formData.state,
      lga: formData.lga,
      address: formData.address,
      location: (formData.lat !== null && formData.lng !== null) ? { lat: formData.lat, lng: formData.lng } : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-[#0f172a] tracking-tighter uppercase">List Facility</h2>
          <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><X className="h-5 w-5" /></button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Name of Facility</label>
            <input 
              className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-base focus:border-blue-600 focus:bg-white transition-all outline-none" 
              placeholder="e.g. HealthFirst Hub"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Primary Category</label>
            <select 
              className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-base focus:border-blue-600 focus:bg-white transition-all outline-none" 
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="">Select Category</option>
              {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">State</label>
              <select className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-base focus:border-blue-600 focus:bg-white transition-all outline-none" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value, lga: '' })}>
                <option value="">Select State</option>
                {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">LGA</label>
              <select className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-base focus:border-blue-600 focus:bg-white transition-all outline-none" value={formData.lga} onChange={e => setFormData({ ...formData, lga: e.target.value })}>
                <option value="">Select LGA</option>
                {lgas.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Street Address</label>
            <input 
              className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-base focus:border-blue-600 focus:bg-white transition-all outline-none" 
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <button 
            onClick={handleCapture}
            disabled={isCapturing}
            className={`w-full flex items-center justify-center gap-3 p-4 rounded-xl font-black transition-all ${formData.lat ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
          >
            {isCapturing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" /> : (formData.lat ? <Check className="h-5 w-5" /> : <Navigation className="h-5 w-5" />)}
            {isCapturing ? 'Locating...' : (formData.lat ? 'GPS Fixed' : 'Anchor GPS Location')}
          </button>
        </div>

        <div className="p-8 border-t bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4 font-black text-slate-500 uppercase tracking-widest hover:text-slate-700">Discard</button>
          <button onClick={handleSave} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest hover:bg-blue-700 transition-all">List on Openshop</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
