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
  onAddComment: (shopId: string, text: string) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ state, onLogout, onToggleFavorite, onUpdateShop, onAddComment }) => {
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
      <div className="mb-10 animate-in fade-in slide-in-from-left-4 duration-500">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
        <h1 className="text-3xl font-black text-gray-900 leading-none uppercase tracking-tight">My Favorites</h1>
        <p className="text-gray-500 font-bold mt-2 italic">Quick access to your preferred Shop Finder facilities.</p>
      </div>

      <div className="relative mb-8 max-w-xl group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600" />
        </div>
        <input 
          type="text"
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-lg shadow-blue-50 focus:border-blue-600 outline-none font-bold transition-all"
          placeholder="Search favorite facility..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteShops.map(shop => (
          <div 
            key={shop.id}
            onClick={() => setSelectedShop(shop)}
            className="bg-white rounded-3xl shadow-sm border p-6 flex flex-col gap-4 relative hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(shop.id); }}
              className="absolute top-4 right-4 p-2 text-red-500 bg-red-50 rounded-full z-10 hover:scale-110 transition-transform shadow-sm"
              aria-label="Remove from favorites"
            >
              <Heart className="h-5 w-5 fill-current" />
            </button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                <Store className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-gray-900 text-lg leading-tight truncate uppercase tracking-tight">{shop.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{shop.code}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${shop.isOpen ? 'bg-blue-600' : 'bg-red-600'}`}></div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${shop.isOpen ? 'text-blue-600' : 'text-red-600'}`}>
                   Status is {shop.isOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {selectedShop && (
        <ShopDetailModal 
          shop={selectedShop} 
          isFavorite={true}
          onClose={() => setSelectedShop(null)} 
          onToggleFavorite={onToggleFavorite}
          comments={state.comments}
          onAddComment={onAddComment}
        />
      )}
    </Layout>
  );
};

export default FavoritesPage;