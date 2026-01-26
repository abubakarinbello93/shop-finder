import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Package, Search, Lock, ArrowLeft, Clock, Calendar, X, Check, Timer } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, ServiceItem } from './types';

interface ServicesPageProps {
  state: AppState;
  onLogout: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
}

const ServicesPage: React.FC<ServicesPageProps> = ({ state, onLogout, onUpdateShop }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', time: '', available: true });
  const [timerModalItem, setTimerModalItem] = useState<ServiceItem | null>(null);
  const [restockDetails, setRestockDetails] = useState({ date: '', hour: '00', minute: '00' });
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

  // Update current time for countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-Update Logic: Check if any items should be restocked automatically
  useEffect(() => {
    if (!userShop || !userShop.items) return;
    const itemsToUpdate = userShop.items.filter(item => 
      !item.available && item.restockDate && item.restockDate <= Date.now()
    );

    if (itemsToUpdate.length > 0) {
      const updatedItems = userShop.items.map(item => {
        if (!item.available && item.restockDate && item.restockDate <= Date.now()) {
          const { restockDate, ...rest } = item;
          return { ...rest, available: true };
        }
        return item;
      });
      onUpdateShop(userShop.id, { items: updatedItems });
    }
  }, [now, userShop, onUpdateShop]);

  const filteredItems = useMemo(() => {
    if (!userShop) return [];
    const term = searchTerm.toLowerCase();
    return (userShop.items || [])
      .filter(item => item.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [userShop, searchTerm]);

  if (!userShop) return (
    <Layout user={currentUser!} onLogout={onLogout}>
      <div className="bg-white p-12 rounded-3xl text-center border">
        <h2 className="text-xl font-black text-gray-400">Facility Not Linked</h2>
      </div>
    </Layout>
  );

  const canAdd = currentUser?.isStaff ? currentUser.canAddItems : true;

  const handleSaveNew = () => {
    if (!newItem.name || !canAdd) return;
    const items = [...(userShop.items || []), { ...newItem, id: Math.random().toString(36).substr(2, 9) }];
    onUpdateShop(userShop.id, { items });
    setIsAdding(false);
    setNewItem({ name: '', time: '', available: true });
  };

  const handleToggleStock = (item: ServiceItem) => {
    if (item.available) {
      // Show Restock Modal when moving from In Stock to Out of Stock
      setTimerModalItem(item);
    } else {
      // MANUAL OVERRIDE: Set back to In Stock immediately
      const updatedItems = userShop.items.map(i => {
        if (i.id === item.id) {
          // Remove restockDate completely and set available to true
          const { restockDate, ...rest } = i;
          return { ...rest, available: true };
        }
        return i;
      });
      onUpdateShop(userShop.id, { items: updatedItems });
    }
  };

  const saveRestockTime = () => {
    if (!timerModalItem || !restockDetails.date) return;
    const restockDateStr = `${restockDetails.date}T${restockDetails.hour}:${restockDetails.minute}:00`;
    const restockTimestamp = new Date(restockDateStr).getTime();

    if (isNaN(restockTimestamp)) {
      alert("Invalid date or time selected.");
      return;
    }

    const updatedItems = userShop.items.map(i => 
      i.id === timerModalItem.id ? { ...i, available: false, restockDate: restockTimestamp } : i
    );
    onUpdateShop(userShop.id, { items: updatedItems });
    setTimerModalItem(null);
    setRestockDetails({ date: '', hour: '00', minute: '00' });
  };

  const saveNoTimer = () => {
    if (!timerModalItem) return;
    const updatedItems = userShop.items.map(i => {
      if (i.id === timerModalItem.id) {
        // Remove restockDate completely
        const { restockDate, ...rest } = i;
        return { ...rest, available: false };
      }
      return i;
    });
    onUpdateShop(userShop.id, { items: updatedItems });
    setTimerModalItem(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Delete this item from your catalog?")) return;
    const items = userShop.items.filter(item => item.id !== id);
    onUpdateShop(userShop.id, { items });
  };

  const formatCountdown = (target: number) => {
    const diff = target - now;
    if (diff <= 0) return "Arriving now...";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
    
    return `Restocking in: ${parts.join(', ')}`;
  };

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-10">
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all"
        >
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Catalog Management</h1>
            <p className="text-gray-500 font-bold mt-2">Manage your inventory and stock timers.</p>
          </div>
          {canAdd && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
            >
              <Plus className="h-5 w-5" /> Add Item
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input 
          type="text"
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-sm focus:border-blue-500 outline-none font-bold"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl mb-8 animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black uppercase">New Catalog Entry</h3>
            <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400 hover:text-red-500"><X /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Name</label>
              <input 
                autoFocus
                className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold outline-none focus:border-blue-600"
                placeholder="Product or Service Name"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description/Time</label>
              <input 
                className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold outline-none focus:border-blue-600"
                placeholder="e.g. 30 mins, 5kg bag, etc."
                value={newItem.time}
                onChange={e => setNewItem({ ...newItem, time: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button onClick={() => setIsAdding(false)} className="px-8 py-3 font-black text-gray-500 uppercase tracking-widest text-sm">Cancel</button>
            <button onClick={handleSaveNew} className="px-12 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">Save Entry</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className={`bg-white p-6 rounded-[24px] shadow-sm border-2 transition-all flex items-center justify-between group ${item.available ? 'border-transparent' : 'border-red-50 bg-red-50/10'}`}>
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl transition-colors ${item.available ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                <Package className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-gray-900 text-lg leading-tight truncate uppercase tracking-tight">{item.name}</h4>
                {item.time && <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{item.time}</div>}
                
                {!item.available && item.restockDate && (
                  <div className="mt-2 flex items-center gap-2 text-indigo-600 font-black text-[11px] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 w-fit uppercase tracking-tighter">
                    <Timer className="h-3 w-3 animate-pulse" />
                    {formatCountdown(item.restockDate)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleToggleStock(item)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${item.available ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {item.available ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {item.available ? 'In Stock' : 'Available Now'}
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 p-3 bg-slate-50 rounded-xl transition-colors">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
             <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
             <p className="font-black text-slate-400 uppercase tracking-widest">No items found</p>
          </div>
        )}
      </div>

      {/* Restock Timer Modal */}
      {timerModalItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Smart Restock</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{timerModalItem.name}</p>
              </div>
              <button onClick={() => setTimerModalItem(null)} className="p-3 bg-white border rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-3">
                 <Timer className="h-5 w-5 text-indigo-600 shrink-0 mt-1" />
                 <p className="text-[11px] font-bold text-indigo-800 leading-tight uppercase tracking-tight">
                   When will this item be available again? A countdown will be shown to customers.
                 </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Restock Date</label>
                  <input 
                    type="date" 
                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:border-indigo-600 outline-none"
                    value={restockDetails.date}
                    onChange={e => setRestockDetails({...restockDetails, date: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hour (24h)</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:border-indigo-600 outline-none"
                        value={restockDetails.hour}
                        onChange={e => setRestockDetails({...restockDetails, hour: e.target.value})}
                      >
                        {Array.from({length: 24}).map((_, i) => (
                          <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minute</label>
                      <select 
                        className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-bold text-slate-900 focus:border-indigo-600 outline-none"
                        value={restockDetails.minute}
                        onChange={e => setRestockDetails({...restockDetails, minute: e.target.value})}
                      >
                        {['00', '15', '30', '45'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                 <button 
                  onClick={saveRestockTime}
                  disabled={!restockDetails.date}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm disabled:opacity-30"
                 >
                   <Timer className="h-5 w-5" /> Set Restock Timer
                 </button>
                 <button 
                  onClick={saveNoTimer}
                  className="w-full py-5 bg-slate-100 text-slate-600 font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-slate-200 transition-all uppercase tracking-widest text-sm"
                 >
                   No Timer (Hidden)
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ServicesPage;
