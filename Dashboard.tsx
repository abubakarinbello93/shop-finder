
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Added missing 'X' and 'Navigation' icons to the lucide-react import
import { Search, Store, Package, CheckCircle, Heart, History, ChevronRight, Clock, MapPin, Check, Plus, Loader2, X, Navigation } from 'lucide-react';
import Layout from '../components/Layout';
import { AppState, Shop } from '../types';
import ShopDetailModal from '../components/ShopDetailModal';
import { NIGERIA_STATES, BUSINESS_CATEGORIES, ALL_STATES } from '../constants';

interface DashboardProps {
  state: AppState;
  onLogout: () => void;
  onToggleFavorite: (id: string) => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
  onRegisterShop: (shopData: Partial<Shop>) => void;
  onAddComment: (shopId: string, text: string) => void;
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const Dashboard: React.FC<DashboardProps> = ({ state, onLogout, onToggleFavorite, onUpdateShop, onRegisterShop, onAddComment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [showRegModal, setShowRegModal] = useState(false);
  
  const navigate = useNavigate();

  const { currentUser, shops, comments } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  // Auto-capture location on mount
  useEffect(() => {
    handleCaptureMyLocation();
  }, []);

  const handleCaptureMyLocation = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    setLocError(null);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(newLoc);
          setIsCapturing(false);
          console.log("Shop Finder: Location fixed", newLoc);
        },
        (error) => {
          setIsCapturing(false);
          let msg = "Failed to fix location.";
          if (error.code === error.PERMISSION_DENIED) msg = "Permission denied. Enable location in browser.";
          else if (error.code === error.POSITION_UNAVAILABLE) msg = "Location info unavailable.";
          else if (error.code === error.TIMEOUT) msg = "Location request timed out.";
          setLocError(msg);
          console.warn("Shop Finder: Geolocation error", error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000, // Increased timeout
          maximumAge: 0   // Force fresh location
        }
      );
    } else {
      setIsCapturing(false);
      setLocError("Geolocation not supported.");
    }
  };

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
    if (userLocation) {
      results.sort((a, b) => {
        const distA = (a.shop.location && a.shop.locationVisible) ? getDistance(userLocation.lat, userLocation.lng, a.shop.location.lat, a.shop.location.lng) : 999999;
        const distB = (b.shop.location && b.shop.locationVisible) ? getDistance(userLocation.lat, userLocation.lng, b.shop.location.lat, b.shop.location.lng) : 999999;
        return distA - distB;
      });
    }
    return results;
  }, [searchTerm, shops, userLocation]);

  const blockItems = useMemo(() => {
    const items: Array<{ title: string, icon: any, value: number | string, path: string, color: string }> = [
      { title: 'Discover', icon: CheckCircle, value: shops.filter(s => s.isOpen).length, path: '/available', color: 'bg-indigo-600' },
      { title: 'Favorites', icon: Heart, value: currentUser?.favorites.length || 0, path: '/favorites', color: 'bg-slate-900' },
    ];
    if (userShop) {
      items.splice(1, 0, { title: 'Inventory', icon: Package, value: (userShop.items || []).length, path: '/services', color: 'bg-indigo-500' });
    }
    items.push({ title: 'History', icon: History, value: '', path: '/history', color: 'bg-slate-800' });
    return items;
  }, [userShop, shops, currentUser]);

  return (
    <Layout user={currentUser!} shop={userShop} allShops={shops} onLogout={onLogout} onUpdateShop={onUpdateShop} onAddComment={onAddComment}>
      <header className="mb-10 text-center animate-in fade-in duration-700">
        <div className="bg-indigo-50 py-4 px-8 rounded-3xl mb-8 inline-block border border-indigo-100 shadow-sm">
           <h2 className="text-lg font-bold text-indigo-800">Hello, {currentUser?.username}! 👋</h2>
           <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mt-1">Shop Finder Active</p>
           
           <div className="mt-2 flex items-center justify-center gap-2">
              {isCapturing ? (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-400 animate-pulse uppercase">
                  <Loader2 className="h-3 w-3 animate-spin" /> Fixing GPS...
                </div>
              ) : userLocation ? (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-green-600 uppercase">
                  <Check className="h-3 w-3" /> Proximity Active
                </div>
              ) : (
                <button onClick={handleCaptureMyLocation} className="text-[9px] font-black text-orange-600 uppercase underline underline-offset-2">
                   {locError || "GPS Offline - Retry?"}
                </button>
              )}
           </div>
        </div>
        
        {userShop ? (
          <div className="flex flex-col items-center gap-2 mb-2">
            <h1 className="text-4xl md:text-5xl font-black text-[#0f172a] tracking-tighter leading-tight uppercase">
              {userShop.name}
            </h1>
            <p className="text-sm font-black text-slate-400 tracking-widest mt-1 uppercase">
              Facility Code: <span className="text-indigo-600">{userShop.code}</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 mb-2">
            <h1 className="text-4xl md:text-5xl font-black text-[#0f172a] tracking-tighter leading-none mb-3 uppercase">
              Find a Shop
            </h1>
            <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
              Discover services and products available in real-time.
            </p>
          </div>
        )}
      </header>

      <section className="relative mb-12 max-w-3xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-slate-300" />
        </div>
        <input 
          type="text"
          className="w-full pl-14 pr-8 py-5 bg-white border-2 border-transparent rounded-[2.5rem] shadow-xl shadow-indigo-100/50 focus:border-indigo-600 outline-none font-bold text-lg transition-all"
          placeholder="Search products, services, or places..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        {searchTerm.trim() && (
          <div className="absolute top-full left-0 right-0 mt-6 bg-white rounded-3xl shadow-2xl border border-slate-100 z-20 overflow-hidden max-h-[450px] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-200">
            {searchResults.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {searchResults.map((res, idx) => {
                  const shop = res.shop;
                  const item = res.item;
                  const countdown = getCountdown(shop);
                  const distance = (userLocation && shop.location && shop.locationVisible) ? getDistance(userLocation.lat, userLocation.lng, shop.location.lat, shop.location.lng).toFixed(1) : null;

                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedShop(shop)}
                      className="p-5 hover:bg-indigo-50/30 cursor-pointer flex justify-between items-center group transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          {item && <h3 className="font-black text-indigo-600 text-sm uppercase truncate tracking-tight">{item.name}</h3>}
                          {distance && (
                            <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0 flex items-center gap-1">
                              <MapPin className="h-2 w-2" /> {distance} KM
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <h4 className={`font-bold text-[#0f172a] truncate ${item ? 'text-[11px] opacity-60' : 'text-base uppercase tracking-tight'}`}>{shop.name}</h4>
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest shrink-0">{shop.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-2">
                        <div className="text-right shrink-0">
                          <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${shop.isOpen ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {shop.isOpen ? 'OPEN' : 'CLOSED'}
                          </div>
                          {countdown && (
                            <div className="mt-1 flex items-center gap-1 text-[9px] font-black text-red-500 animate-pulse justify-end uppercase">
                              <Clock className="h-3 w-3" /> {countdown}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-200 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-16 text-center">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">No results found</p>
              </div>
            )}
          </div>
        )}
      </section>

      {!userShop && (
        <section className="mb-12 animate-in slide-in-from-top-4 duration-500">
          <div 
            onClick={() => setShowRegModal(true)}
            className="p-10 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] cursor-pointer hover:border-indigo-600 hover:bg-indigo-50/30 transition-all group flex flex-col md:flex-row items-center justify-between shadow-sm gap-6"
          >
            <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              <div className="p-5 bg-indigo-600 text-white rounded-[2rem] shadow-xl group-hover:rotate-6 transition-transform">
                <Store className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-[#0f172a] tracking-tight uppercase">List your facility on Shop Finder</h3>
                <p className="text-slate-500 font-bold mt-1 text-lg">Help customers find your services in real-time.</p>
              </div>
            </div>
            <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl group-hover:translate-x-2 transition-transform">
              <Plus className="h-6 w-6" />
            </div>
          </div>
        </section>
      )}

      {userShop && (
        <section className="mb-12 animate-in slide-in-from-top-4 duration-500">
          <div className={`p-8 rounded-[3rem] text-white shadow-2xl flex items-center justify-between transition-all duration-500 ${userShop.isOpen ? 'bg-indigo-600 shadow-indigo-200' : 'bg-red-600 shadow-red-200'}`}>
            <div className="flex items-center gap-8">
              <div className="p-5 bg-white/20 rounded-[2rem] backdrop-blur-md">
                <Store className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Facility Control</h3>
                <p className="text-xs font-black opacity-90 uppercase tracking-[0.2em] mt-1 text-white">
                  Current Status: {userShop.isOpen ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => onUpdateShop(userShop.id, { isOpen: !userShop.isOpen })}
              className={`relative inline-flex h-12 w-24 items-center rounded-full transition-all duration-300 focus:outline-none shadow-inner ${userShop.isOpen ? 'bg-indigo-400' : 'bg-red-400'}`}
            >
              <span
                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-xl transition-all duration-300 flex items-center justify-center ${
                  userShop.isOpen ? 'translate-x-13' : 'translate-x-1'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${userShop.isOpen ? 'bg-indigo-600' : 'bg-red-600'}`} />
              </span>
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {blockItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => navigate(item.path)}
            className={`cursor-pointer relative p-8 rounded-[2.5rem] text-white shadow-xl transition-all hover:-translate-y-2 active:scale-95 overflow-hidden ${item.color} group h-36 md:h-48`}
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="p-3 bg-white/20 rounded-xl w-fit mb-3 group-hover:bg-white group-hover:text-slate-900 transition-all">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] opacity-60">{item.title}</h3>
                {String(item.value) !== '' && <p className="text-2xl md:text-4xl font-black mt-2 leading-none">{item.value}</p>}
              </div>
            </div>
            <div className="absolute top-0 right-0 -mr-6 -mt-6 opacity-[0.05] group-hover:opacity-[0.2] transition-opacity duration-500">
              <item.icon className="h-28 w-28 md:h-40 md:w-40" />
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
        },
        () => {
          setIsCapturing(false);
          alert("GPS fix failed. Ensure location services are enabled.");
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
      location: formData.lat ? { lat: formData.lat, lng: formData.lng! } : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-[#0f172a] tracking-tighter uppercase">List Facility</h2>
          <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"><X className="h-6 w-6" /></button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Name of Facility</label>
            <input 
              className="w-full p-4.5 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-base focus:border-indigo-600 focus:bg-white transition-all outline-none shadow-inner" 
              placeholder="e.g. HealthFirst Hub"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Primary Category</label>
            <select 
              className="w-full p-4.5 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-base focus:border-indigo-600 focus:bg-white transition-all outline-none shadow-inner" 
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="">Select Category</option>
              {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">State</label>
              <select className="w-full p-4.5 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-base focus:border-indigo-600 focus:bg-white transition-all outline-none shadow-inner" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value, lga: '' })}>
                <option value="">Select State</option>
                {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">LGA</label>
              <select className="w-full p-4.5 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-base focus:border-indigo-600 focus:bg-white transition-all outline-none shadow-inner" value={formData.lga} onChange={e => setFormData({ ...formData, lga: e.target.value })}>
                <option value="">Select LGA</option>
                {lgas.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Street Address</label>
            <input 
              className="w-full p-4.5 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-base focus:border-indigo-600 focus:bg-white transition-all outline-none shadow-inner" 
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <button 
            onClick={handleCapture}
            disabled={isCapturing}
            className={`w-full flex items-center justify-center gap-4 p-5 rounded-2xl font-black transition-all ${formData.lat ? 'bg-green-600 text-white shadow-xl shadow-green-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
          >
            {isCapturing ? <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" /> : (formData.lat ? <Check className="h-6 w-6" /> : <Navigation className="h-6 w-6" />)}
            {isCapturing ? 'Locating...' : (formData.lat ? 'GPS Linked Successfully' : 'Anchor GPS Location')}
          </button>
        </div>

        <div className="p-8 border-t bg-slate-50 flex gap-4">
          <button onClick={onClose} className="flex-1 py-4.5 font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors">Discard</button>
          <button onClick={handleSave} className="flex-[2] py-4.5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 uppercase tracking-widest hover:bg-indigo-700 transition-all">List on Shop Finder</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
