import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, Package, Store, ArrowLeft, Navigation, MapPin, X } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop } from './types';
import ShopDetailModal from './ShopDetailModal';
import { BUSINESS_CATEGORIES } from './constants';

interface AvailablePageProps {
  state: AppState;
  onLogout: () => void;
  onToggleFavorite: (id: string) => void;
  onAddComment: (shopId: string, text: string) => void;
}

const AvailablePage: React.FC<AvailablePageProps> = ({ state, onLogout, onToggleFavorite, onAddComment }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const navigate = useNavigate();
  const { currentUser, shops } = state;

  const discoverList = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return shops.filter(s => s.isOpen && (
        s.name.toLowerCase().includes(term) || 
        s.type.toLowerCase().includes(term) ||
        s.items.some(i => i.available && i.name.toLowerCase().includes(term))
    ));
  }, [shops, searchTerm]);

  return (
    <Layout user={currentUser!} onLogout={onLogout}>
      <div className="mb-8 animate-in fade-in slide-in-from-left-4 duration-500">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-700 font-black mb-4 hover:gap-3 transition-all"><ArrowLeft className="h-5 w-5" /> Dashboard</button>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Discover</h1>
        <p className="text-gray-500 font-bold">Find facilities open right now on Shop Finder.</p>
      </div>
      <div className="relative mb-10 max-w-xl group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
        <input type="text" className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-lg shadow-blue-50 focus:border-blue-700 outline-none font-bold transition-all" placeholder="Search open facilities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discoverList.map(shop => (
          <div key={shop.id} onClick={() => setSelectedShop(shop)} className="bg-white p-6 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-100 hover:shadow-xl transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Store className="h-6 w-6" />
              </div>
              <div className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-full tracking-widest">Active Now</div>
            </div>
            <h4 className="font-black text-gray-900 text-lg uppercase mb-1 truncate">{shop.name}</h4>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">{shop.type}</p>
            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><MapPin className="h-3 w-3 text-blue-600" /> {shop.lga}, {shop.state}</div>
          </div>
        ))}
        {discoverList.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100">
            <Search className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="font-black text-gray-400 uppercase tracking-widest">No matching open facilities</p>
          </div>
        )}
      </div>
      {selectedShop && <ShopDetailModal shop={selectedShop} isFavorite={currentUser?.favorites.includes(selectedShop.id) || false} onClose={() => setSelectedShop(null)} onToggleFavorite={onToggleFavorite} comments={state.comments} onAddComment={onAddComment} />}
    </Layout>
  );
};
export default AvailablePage;