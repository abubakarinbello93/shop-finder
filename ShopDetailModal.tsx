
import React, { useState, useMemo, useEffect } from 'react';
import { X, Phone, Mail, MapPin, Clock, CheckCircle, Package, Info, Heart, Search, MessageSquare, Send, Plus, Bell, Hourglass } from 'lucide-react';
import { Shop, Comment, ServiceItem } from './types';

interface ShopDetailModalProps {
  shop: Shop;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  comments?: Comment[]; 
  onAddComment?: (shopId: string, text: string) => void;
}

const ShopDetailModal: React.FC<ShopDetailModalProps> = ({ shop, isFavorite, onClose, onToggleFavorite, comments = [], onAddComment }) => {
  const [activeTab, setActiveTab] = useState<'available' | 'services' | 'details' | 'comments'>('details');
  const [itemSearch, setItemSearch] = useState('');

  const filteredItems = useMemo(() => {
    const term = itemSearch.toLowerCase().trim();
    if (!term) return shop.items;
    return shop.items.filter(item => item.name.toLowerCase().includes(term));
  }, [shop.items, itemSearch]);

  const availableFiltered = useMemo(() => {
    return filteredItems.filter(i => i.available);
  }, [filteredItems]);

  const shopComments = useMemo(() => {
    return comments.filter(c => c.shopId === shop.id).sort((a, b) => b.timestamp - a.timestamp);
  }, [comments, shop.id]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-start bg-gray-50">
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">{shop.name}</h2>
            <p className="text-sm text-gray-500 font-medium">{shop.type}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${shop.isOpen ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                {shop.isOpen ? 'Shop/Facility is Open' : 'Shop/Facility is Closed'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onToggleFavorite(shop.id)}
              className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
            >
              <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b text-[10px] font-black uppercase tracking-widest bg-white sticky top-0 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-4 px-4 border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'available' ? 'border-green-600 text-green-600 bg-green-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <CheckCircle className="h-4 w-4" /> Available
          </button>
          <button 
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-4 px-4 border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'services' ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Package className="h-4 w-4" /> Catalog
          </button>
          <button 
            onClick={() => setActiveTab('comments')}
            className={`flex-1 py-4 px-4 border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'comments' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Bell className="h-4 w-4" /> Facility News
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-4 px-4 border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'details' ? 'border-gray-600 text-gray-900 bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Info className="h-4 w-4" /> Details
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {shop.currentStatus && (
            <div className="mb-6 p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[32px] shadow-sm animate-in fade-in duration-500">
               <div className="flex items-center gap-3 mb-2">
                 <Bell className="h-5 w-5 text-indigo-600" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">Official Broadcast</span>
               </div>
               <p className="text-lg font-black text-indigo-900 italic leading-tight">
                 "{shop.currentStatus}"
               </p>
            </div>
          )}

          {(activeTab === 'available' || activeTab === 'services') && (
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold text-sm focus:border-blue-600 focus:bg-white outline-none transition-all"
                placeholder={`Search items in ${shop.name}...`}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
          )}

          {activeTab === 'available' && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Items Available Now</h3>
              {availableFiltered.length > 0 ? (
                availableFiltered.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-4 rounded-xl border bg-green-50/30 border-green-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="font-bold text-gray-800">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded uppercase tracking-tighter">Available</span>
                      {item.time && <span className="text-xs font-bold text-gray-400 bg-white px-2 py-1 rounded-full border">{item.time}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-6">
                  <Package className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold">No available items match your search.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Complete Catalog</h3>
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <CatalogItemRow key={item.id} item={item} />
                ))
              ) : (
                <div className="text-center py-12 px-6">
                  <Search className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold">No items found matching "{itemSearch}"</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Facility News Feed</h3>
              
              <div className="space-y-4">
                 {shop.currentStatus ? (
                    <div className="p-6 bg-blue-600 rounded-[32px] text-white shadow-xl shadow-blue-100 animate-in slide-in-from-top-4">
                       <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Latest Announcement</span>
                       </div>
                       <p className="text-xl font-black leading-tight">"{shop.currentStatus}"</p>
                    </div>
                 ) : (
                  <div className="text-center py-16 px-6 bg-gray-50 rounded-[32px] border-2 border-dashed">
                    <Bell className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-black uppercase tracking-widest">No recent broadcasts</p>
                  </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <Phone className="h-5 w-5 mr-3 text-blue-600" />
                    <span className="font-bold">{shop.contact}</span>
                  </div>
                  {shop.email && (
                    <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-xl">
                      <Mail className="h-5 w-5 mr-3 text-blue-600" />
                      <span className="font-bold">{shop.email}</span>
                    </div>
                  )}
                  <div className="flex items-start text-gray-700 bg-gray-50 p-3 rounded-xl">
                    <MapPin className="h-5 w-5 mr-3 mt-0.5 text-blue-600" />
                    <div>
                      <p className="font-bold">{shop.address}</p>
                      <p className="text-xs font-medium text-gray-500">{shop.lga}, {shop.state}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Business Hours</h3>
                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                  {shop.businessHours.map(bh => (
                    <div key={bh.day} className={`flex justify-between text-sm py-1 border-b border-gray-100 last:border-0 ${bh.enabled ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                      <span className="font-bold">{bh.day}</span>
                      <span className="font-medium">{bh.enabled ? `${bh.open} - ${bh.close}` : 'Closed'}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all uppercase tracking-widest text-[10px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const CatalogItemRow: React.FC<{ item: ServiceItem }> = ({ item }) => {
  const [countdownStr, setCountdownStr] = useState<string | null>(null);

  useEffect(() => {
    if (!item.restockDate) {
      setCountdownStr(null);
      return;
    }

    const update = () => {
      const diff = item.restockDate! - Date.now();
      if (diff <= 0) {
        setCountdownStr(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      const parts = [];
      if (days > 0) parts.push(`${days} Days`);
      if (hours > 0) parts.push(`${hours} Hours`);
      if (days === 0 && hours === 0) parts.push(`${mins} Mins`);
      
      setCountdownStr(parts.join(', '));
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [item.restockDate]);

  return (
    <div className="flex flex-col p-4 rounded-xl border bg-white shadow-sm hover:border-blue-200 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-700">{item.name}</span>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {item.available ? 'Available' : 'Out of stock'}
        </span>
      </div>
      {countdownStr && (
        <div className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit border border-indigo-100">
          <Hourglass className="h-2.5 w-2.5" /> Available in: {countdownStr}
        </div>
      )}
    </div>
  );
};

export default ShopDetailModal;
