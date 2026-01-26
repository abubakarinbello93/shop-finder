
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, Check, Package, Clock, ArrowLeft, Search, Lock, Calendar, Hourglass } from 'lucide-react';
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
  const [restockModalItem, setRestockModalItem] = useState<ServiceItem | null>(null);
  const navigate = useNavigate();

  const { currentUser, shops } = state;
  const userShop = shops.find(s => s.id === currentUser?.shopId);

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

  const handleUpdateItem = (id: string, updates: Partial<ServiceItem>) => {
    const items = userShop.items.map(item => item.id === id ? { ...item, ...updates } : item);
    onUpdateShop(userShop.id, { items });
  };

  const handleDelete = (id: string) => {
    const items = userShop.items.filter(item => item.id !== id);
    onUpdateShop(userShop.id, { items });
  };

  const onToggleAvailability = (item: ServiceItem) => {
    if (item.available) {
      // Opening modal for marking as Out of Stock
      setRestockModalItem(item);
    } else {
      // Marking as Available (Manual Override)
      handleUpdateItem(item.id, { available: true, restockDate: undefined });
    }
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
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Inventory Catalog</h1>
            <p className="text-gray-500 font-bold mt-1">Manage product availability & timers.</p>
          </div>
          {canAdd ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-xs"
            >
              <Plus className="h-5 w-5" /> Add New
            </button>
          ) : (
            <div className="px-6 py-3 bg-gray-100 text-gray-400 font-black rounded-2xl flex items-center gap-2 uppercase tracking-widest text-xs">
              <Lock className="h-4 w-4" /> Restricted
            </div>
          )}
        </div>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input 
          type="text"
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-sm focus:border-blue-600 outline-none font-bold"
          placeholder="Search items in your catalog..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl mb-8 animate-in zoom-in-95 duration-300">
          <h3 className="text-xl font-black mb-6 uppercase tracking-tight text-blue-600">New Inventory Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Item Name</label>
              <input 
                autoFocus
                className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all"
                placeholder="e.g. Paracetamol 500mg"
                value={newItem.name}
                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description/Time</label>
              <input 
                className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold outline-none focus:border-blue-600 transition-all"
                placeholder="e.g. 10 packs left / 15 mins wait"
                value={newItem.time}
                onChange={e => setNewItem({ ...newItem, time: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 font-black text-gray-500 uppercase tracking-widest text-xs hover:text-slate-800">Discard</button>
            <button onClick={handleSaveNew} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100 uppercase tracking-widest text-xs hover:bg-blue-700">Add to List</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map(item => (
          <InventoryCard 
            key={item.id} 
            item={item} 
            onToggle={() => onToggleAvailability(item)}
            onDelete={() => handleDelete(item.id)}
          />
        ))}
        {filteredItems.length === 0 && (
          <div className="py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-[40px]">
            <Package className="h-16 w-16 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest">Catalog is empty or no results</p>
          </div>
        )}
      </div>

      {restockModalItem && (
        <RestockModal 
          item={restockModalItem} 
          onClose={() => setRestockModalItem(null)} 
          onSave={(restockDate) => {
            handleUpdateItem(restockModalItem.id, { available: false, restockDate });
            setRestockModalItem(null);
          }}
          onNoTimer={() => {
            handleUpdateItem(restockModalItem.id, { available: false, restockDate: undefined });
            setRestockModalItem(null);
          }}
        />
      )}
    </Layout>
  );
};

const InventoryCard: React.FC<{ item: ServiceItem, onToggle: () => void, onDelete: () => void }> = ({ item, onToggle, onDelete }) => {
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!item.restockDate) {
      setCountdown(null);
      return;
    }

    const update = () => {
      const diff = item.restockDate! - Date.now();
      if (diff <= 0) {
        setCountdown(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      let str = "";
      if (days > 0) str += `${days}d `;
      if (hours > 0) str += `${hours}h `;
      str += `${mins}m`;
      setCountdown(str);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [item.restockDate]);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-col md:flex-row md:items-center justify-between group hover:border-blue-100 transition-all hover:shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-5 mb-4 md:mb-0">
        <div className={`p-4 rounded-2xl shadow-sm transition-colors ${item.available ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
          <Package className="h-7 w-7" />
        </div>
        <div>
          <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">{item.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            {item.time && <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.time}</div>}
            {!item.available && (
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase border border-red-100">Out of Stock</span>
            )}
          </div>
          {countdown && (
            <div className="flex items-center gap-1.5 mt-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit border border-indigo-100 animate-pulse">
              <Hourglass className="h-3 w-3" /> Available in: {countdown}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
        <button 
          onClick={onToggle}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${item.available ? 'bg-green-600 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {item.available ? 'Mark Out of Stock' : (item.restockDate ? 'Available Now' : 'Mark Available')}
        </button>
        <button onClick={onDelete} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const RestockModal: React.FC<{ item: ServiceItem, onClose: () => void, onSave: (date: number) => void, onNoTimer: () => void }> = ({ item, onClose, onSave, onNoTimer }) => {
  const [view, setView] = useState<'options' | 'timer'>('options');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');

  const handleFinishTimer = () => {
    const d = new Date(date);
    d.setHours(parseInt(hour), parseInt(minute), 0, 0);
    if (d.getTime() <= Date.now()) {
      alert("Please select a future time.");
      return;
    }
    onSave(d.getTime());
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-[#0f172a] tracking-tighter uppercase leading-none">Restock Logic</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{item.name}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-2xl hover:text-red-500"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-10">
          {view === 'options' ? (
            <div className="space-y-4">
              <button 
                onClick={() => setView('timer')}
                className="w-full p-6 bg-blue-600 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-4 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase tracking-tighter"
              >
                <Calendar className="h-6 w-6" /> Set Restock Time
              </button>
              <button 
                onClick={onNoTimer}
                className="w-full p-6 bg-slate-50 text-slate-500 border-2 border-slate-100 rounded-3xl font-black text-lg flex items-center justify-center gap-4 hover:bg-slate-100 transition-all uppercase tracking-tighter"
              >
                <X className="h-6 w-6" /> No Timer
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Restock Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hour (0-23)</label>
                  <input type="number" min="0" max="23" value={hour} onChange={e => setHour(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minute (0-59)</label>
                  <input type="number" min="0" max="59" value={minute} onChange={e => setMinute(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600 transition-all" />
                </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setView('options')} className="flex-1 py-5 font-black text-slate-400 text-sm uppercase tracking-widest hover:text-slate-600 transition-colors">Back</button>
                <button onClick={handleFinishTimer} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all">Start Timer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
