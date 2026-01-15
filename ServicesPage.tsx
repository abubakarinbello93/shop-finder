import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Added Store to the imports
import { Plus, Edit2, Trash2, X, Save, Check, Package, Clock, ArrowLeft, Search, Lock, Store } from 'lucide-react';
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
      <div className="bg-white p-16 rounded-[40px] text-center border-2 border-dashed border-slate-100 animate-in zoom-in-95 duration-500">
        <Store className="h-16 w-16 text-slate-100 mx-auto mb-6" />
        <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Facility Linked</h2>
        <p className="text-slate-300 font-bold mt-2">Create a facility to manage your catalog on Shop Finder.</p>
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
    if (!confirm("Are you sure you want to remove this item?")) return;
    const items = userShop.items.filter(item => item.id !== id);
    onUpdateShop(userShop.id, { items });
  };

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-10 animate-in fade-in slide-in-from-left-4 duration-500">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-4 hover:gap-3 transition-all"><ArrowLeft className="h-5 w-5" /> Dashboard</button>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Catalog Management</h1>
            <p className="text-gray-500 font-bold mt-1">Manage items and services for <span className="text-blue-600">{userShop.name}</span>.</p>
          </div>
          {canAdd ? (
            <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"><Plus className="h-5 w-5" /> Add New Item</button>
          ) : (
            <div className="px-6 py-3 bg-slate-50 text-slate-400 font-black rounded-xl flex items-center gap-2 border border-slate-100"><Lock className="h-4 w-4" /> View Only Access</div>
          )}
        </div>
      </div>

      <div className="relative mb-8 group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors"><Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600" /></div>
        <input type="text" className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-lg shadow-blue-50 focus:border-blue-600 outline-none font-bold transition-all" placeholder="Filter your catalog..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[32px] border-2 border-blue-100 shadow-2xl mb-8 animate-in zoom-in-95 duration-300">
          <h3 className="text-xl font-black mb-6 uppercase tracking-tight text-blue-600">New Entry Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Item/Service Name</label>
                <input autoFocus className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder="e.g. Full Body Checkup" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Description (Optional)</label>
                <input className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold focus:bg-white focus:border-blue-600 outline-none transition-all" placeholder="e.g. 15-20 minutes duration" value={newItem.time} onChange={e => setNewItem({ ...newItem, time: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-4 border-t pt-6">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 font-black text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-widest text-xs">Cancel</button>
            <button onClick={handleSaveNew} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest text-xs">Save to Catalog</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-black text-gray-900 uppercase tracking-tight text-lg">{item.name}</h4>
                {item.time && <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.time}</div>}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => handleUpdateItem(item.id, { available: !item.available })} 
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${item.available ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
              >
                {item.available ? 'In Stock' : 'Out of Stock'}
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors" aria-label="Delete item"><Trash2 className="h-5 w-5" /></button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && !isAdding && (
            <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                <Package className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                <p className="font-black text-slate-400 uppercase tracking-widest">No items found in catalog</p>
            </div>
        )}
      </div>
    </Layout>
  );
};
export default ServicesPage;