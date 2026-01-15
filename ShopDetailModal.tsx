import React, { useState, useMemo } from 'react';
import { X, Phone, Mail, MapPin, Clock, CheckCircle, Package, Info, Heart, Search, Bell } from 'lucide-react';
import { Shop, Comment } from './types';

interface ShopDetailModalProps {
  shop: Shop;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  comments?: Comment[]; 
  onAddComment?: (shopId: string, text: string) => void;
}

const ShopDetailModal: React.FC<ShopDetailModalProps> = ({ shop, isFavorite, onClose, onToggleFavorite, comments = [] }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const shopComments = useMemo(() => comments.filter(c => c.shopId === shop.id).sort((a, b) => b.timestamp - a.timestamp), [comments, shop.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b flex justify-between items-start bg-gray-50">
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight uppercase tracking-tight">{shop.name}</h2>
            <div className="flex items-center gap-2 mt-2">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${shop.isOpen ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                Status is {shop.isOpen ? 'Open' : 'Closed'}
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{shop.type}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onToggleFavorite(shop.id)} className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`} aria-label="Toggle Favorite">
              <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-slate-100 bg-white rounded-full border shadow-sm transition-colors" aria-label="Close Modal"><X className="h-6 w-6" /></button>
          </div>
        </div>

        <div className="flex border-b text-[10px] font-black uppercase tracking-widest bg-white">
          <button onClick={() => setActiveTab('details')} className={`flex-1 py-4 border-b-2 transition-all ${activeTab === 'details' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Facility Details</button>
          <button onClick={() => setActiveTab('comments')} className={`flex-1 py-4 border-b-2 transition-all ${activeTab === 'comments' ? 'border-blue-600 text-blue-600 bg-blue-50/20' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Updates Feed</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          {activeTab === 'details' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Location & Contact</h3>
                <div className="flex items-center text-gray-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <Phone className="h-5 w-5 mr-4 text-blue-600" /> 
                    <span className="font-bold text-sm tracking-tight">{shop.contact}</span>
                </div>
                <div className="flex items-start text-gray-700 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <MapPin className="h-5 w-5 mr-4 mt-0.5 text-blue-600" /> 
                    <div>
                        <p className="font-bold text-sm leading-tight">{shop.address}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{shop.lga}, {shop.state}</p>
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Catalog Snapshot</h3>
                 <div className="grid grid-cols-2 gap-2">
                    {shop.items.slice(0, 4).map(item => (
                        <div key={item.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-700 truncate">{item.name}</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>
                    ))}
                    {shop.items.length > 4 && (
                        <div className="col-span-2 text-center text-[10px] font-black text-blue-600 uppercase tracking-widest pt-1">
                            + {shop.items.length - 4} more in catalog
                        </div>
                    )}
                 </div>
              </div>
            </div>
          )}
          {activeTab === 'comments' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {shopComments.length > 0 ? shopComments.map(c => (
                <div key={c.id} className="p-5 bg-blue-50 border border-blue-100 rounded-[24px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Bell className="h-10 w-10 text-blue-900" />
                  </div>
                  <p className="text-sm font-bold text-blue-900 leading-relaxed italic relative z-10">"{c.text}"</p>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-3 flex items-center gap-2">
                      <Clock className="h-3 w-3" /> Posted {new Date(c.timestamp).toLocaleDateString()}
                  </p>
                </div>
              )) : (
                <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                    <Bell className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No active updates</p>
                    <p className="text-slate-300 text-[10px] mt-1 italic">Check back later for news from this facility.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-gray-50 flex justify-end">
            <button onClick={onClose} className="px-8 py-3 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ShopDetailModal;