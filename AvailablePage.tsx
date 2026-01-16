
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, Package, Store, ArrowLeft, Navigation, MapPin, Filter, X } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop } from './types';
import ShopDetailModal from './ShopDetailModal';
import { BUSINESS_CATEGORIES } from './constants';

interface AvailablePageProps {
  state: AppState;
  onLogout: () => void;
  onToggleFavorite: (id: string) => void;
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

const AvailablePage: React.FC<AvailablePageProps> = ({ state, onLogout, onToggleFavorite }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  const handleCaptureLocation = () => {
    if (isCapturing) return;
    setIsCapturing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsCapturing(false);
        },
        () => {
          setIsCapturing(false);
          alert("Could not access location. Please check browser permissions.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsCapturing(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const discoverList = useMemo(() => {
    let list: { shop: Shop; item: any; distance: number | null }[] = [];
    const term = searchTerm.toLowerCase();

    shops.forEach(s => {
      if (!s.isOpen) return;
      
      // Category filter
      if (selectedCategory && s.type !== selectedCategory) return;

      (s.items || []).forEach(item => {
        if (item.available && (item.name.toLowerCase().includes(term) || s.name.toLowerCase().includes(term))) {
          let dist = null;
          if (userLocation && s.location && s.locationVisible) {
            dist = getDistance(userLocation.lat, userLocation.lng, s.location.lat, s.location.lng);
          }
          list.push({ shop: s, item, distance: dist });
        }
      });
    });

    if (userLocation) {
      list.sort((a, b) => {
        const dA = a.distance ?? 999999;
        const dB = b.distance ?? 999999;
        return dA - dB;
      });
    }

    return list;
  }, [shops, searchTerm, userLocation, selectedCategory]);

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-8">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-700 font-black mb-4 hover:gap-3 transition-all"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Discover</h1>
            <p className="text-gray-500 font-bold mt-2 italic text-sm">Find anything, anywhere</p>
          </div>
          <button 
            onClick={handleCaptureLocation}
            disabled={isCapturing}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all shadow-md ${userLocation ? 'bg-green-600 text-white' : 'bg-white text-blue-700 border border-blue-100 hover:bg-blue-50'}`}
          >
            {isCapturing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" /> : <Navigation className="h-4 w-4" />}
            {isCapturing ? 'Locating...' : (userLocation ? 'Proximity Sorted' : 'Sort by Distance')}
          </button>
        </div>
      </div>

      <div className="space-y-6 mb-10">
        <div className="relative max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input 
            type="text"
            className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-sm focus:border-blue-700 outline-none font-bold text-lg"
            placeholder="What are you looking for?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">Quick Filters</h3>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 hover:text-red-700 transition-colors"
              >
                Clear <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:-mx-0 md:px-0">
            {BUSINESS_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`
                  px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-2
                  ${selectedCategory === cat 
                    ? 'bg-blue-700 text-white border-blue-700 shadow-lg shadow-blue-100' 
                    : 'bg-white text-gray-500 border-gray-100 hover:border-blue-200'}
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {discoverList.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {discoverList.map((res, idx) => (
            <div 
              key={idx}
              onClick={() => setSelectedShop(res.shop)}
              className="group bg-white p-3 md:p-6 rounded-[24px] md:rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-100 hover:shadow-xl transition-all flex flex-col cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex items-start gap-2 md:gap-4 mb-3 md:mb-4">
                <div className="p-2 md:p-3 bg-green-50 text-green-600 rounded-xl md:rounded-2xl shrink-0">
                  <CheckCircle className="h-4 w-4 md:h-6 md:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-black text-gray-900 text-xs md:text-lg leading-tight uppercase tracking-tight truncate">{res.item.name}</h4>
                    <div className="flex items-center flex-wrap gap-1">
                      {res.distance !== null && (
                        <span className="text-[7px] md:text-[8px] w-fit font-black bg-blue-700 text-white px-1.5 md:py-0.5 rounded-full uppercase tracking-tighter">
                          {res.distance.toFixed(1)} KM
                        </span>
                      )}
                      <span className="text-[7px] md:text-[8px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                        {res.shop.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-[8px] md:text-[10px] font-black text-blue-700 uppercase tracking-widest mt-1 italic truncate">{res.shop.name}</p>
                </div>
              </div>
              <div className="mt-auto pt-2 md:pt-4 border-t border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
                <div className="flex items-center gap-1 text-[7px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-full">
                  <MapPin className="h-2 w-2 md:h-3 md:w-3 shrink-0" /> {res.shop.lga}
                </div>
                <div className="text-[7px] md:text-[10px] font-black text-green-600 uppercase tracking-widest">
                  {res.item.time || 'NOW'}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-10 md:p-20 rounded-[40px] text-center border-2 border-dashed border-gray-100 animate-in zoom-in-95 duration-500">
           <Package className="h-10 w-10 md:h-16 md:w-16 text-gray-200 mx-auto mb-4" />
           <p className="text-sm md:text-xl font-black text-gray-400 uppercase tracking-widest">No matching items</p>
           <p className="text-gray-400 font-bold mt-2 text-xs md:text-sm">Try searching for products or adjusting your category filter.</p>
        </div>
      )}

      {selectedShop && (
        <ShopDetailModal 
          shop={selectedShop} 
          isFavorite={currentUser?.favorites.includes(selectedShop.id) || false}
          onClose={() => setSelectedShop(null)} 
          onToggleFavorite={onToggleFavorite}
          comments={state.comments}
        />
      )}
    </Layout>
  );
};

export default AvailablePage;
