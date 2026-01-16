
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, Check, Package, Clock, ArrowLeft, Search, Lock } from 'lucide-react';
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
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Services & Product</h1>
            <p className="text-gray-500 font-bold">Manage your catalog.</p>
          </div>
          {canAdd ? (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-lg"
            >
              <Plus className="h-5 w-5" /> Add New
            </button>
          ) : (
            <div className="px-6 py-3 bg-gray-100 text-gray-400 font-black rounded-2xl flex items-center gap-2">
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
          className="w-full pl-14 pr-6 py-4 bg-white border-2 border-transparent rounded-2xl shadow-sm focus:border-blue-500 outline-none font-bold"
          placeholder="Search items in your catalog..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-3xl border-2 border-blue-100 shadow-xl mb-8 animate-in zoom-in-95">
          <h3 className="text-xl font-black mb-6">New Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <input 
              autoFocus
              className="p-4 bg-gray-50 border-2 rounded-2xl font-bold"
              placeholder="Item/Service Name"
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
            />
            <input 
              className="p-4 bg-gray-50 border-2 rounded-2xl font-bold"
              placeholder="Time/Details (Optional)"
              value={newItem.time}
              onChange={e => setNewItem({ ...newItem, time: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 font-black text-gray-500">Cancel</button>
            <button onClick={handleSaveNew} className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl">Save</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-between group hover:border-blue-100 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-black text-gray-900">{item.name}</h4>
                {item.time && <div className="text-xs font-bold text-gray-400">{item.time}</div>}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => handleUpdateItem(item.id, { available: !item.available })}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {item.available ? 'In Stock' : 'Out of Stock'}
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default ServicesPage;
