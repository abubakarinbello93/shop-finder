
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Store, ChevronRight, ArrowLeft, Search } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop } from './types';
import ShopDetailModal from './ShopDetailModal';

interface FavoritesPageProps {
  state: AppState;
  onLogout: () => void;
  onToggleFavorite: (id: string) => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ state, onLogout, onToggleFavorite, onUpdateShop }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const navigate = useNavigate();
  const { currentUser, shops } = state;
  const userShop = (shops || []).find(s => s.id === currentUser?.shopId);

  const favoriteShops = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (shops || [])
      .filter(s => (currentUser?.favorites || []).includes(s.id))
      .filter(s => s.name.toLowerCase().includes(term) || s.type.toLowerCase().includes(term));
  }, [shops, currentUser?.favorites, searchTerm]);

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-10">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all"><ArrowLeft className="h-5 w-5" /> Back to Dashboard</button>
        <h1 className="text-3xl font-black text-gray-900 leading-none">My Favorites</h1>
        <p className="text-gray-500 font-bold mt-2">Find anything, anywhere</p>
      </div>
      <div className="relative mb-8 max-w-xl">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
        <input type="text" className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-sm focus:border-blue-500 outline-none font-bold" placeholder="Search favorite facility..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6">
        {favoriteShops.map(shop => (
          <div key={shop.id} onClick={() => setSelectedShop(shop)} className="bg-white rounded-3xl shadow-sm border p-6 flex flex-col gap-4 relative hover:shadow-md transition-shadow cursor-pointer group">
            <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(shop.id); }} className="absolute top-4 right-4 p-2 text-red-500 bg-red-50 rounded-full z-10"><Heart className="h-5 w-5 fill-current" /></button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0"><Store className="h-7 w-7" /></div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-gray-900 text-sm md:text-xl leading-tight truncate">{shop.name}</h3>
                <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest truncate">{shop.code}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
              <div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${shop.isOpen ? 'bg-blue-600' : 'bg-red-600'}`}></div><span className={`text-[8px] md:text-sm font-black uppercase tracking-wider ${shop.isOpen ? 'text-blue-600' : 'text-red-600'}`}>{shop.isOpen ? 'OPEN' : 'CLOSED'}</span></div>
              <ChevronRight className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        ))}
        {favoriteShops.length === 0 && <div className="col-span-full py-16 md:py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-gray-100"><Heart className="h-10 w-10 md:h-16 md:w-16 text-gray-200 mx-auto mb-4" /><p className="font-black text-gray-400 text-sm md:text-xl">No favorites found.</p></div>}
      </div>
      {selectedShop && <ShopDetailModal shop={selectedShop} isFavorite={true} onClose={() => setSelectedShop(null)} onToggleFavorite={onToggleFavorite} />}
    </Layout>
  );
};

export default FavoritesPage;
