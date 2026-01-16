
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, Users, Save, X, Plus, Trash2, Calendar, UserPlus, ChevronRight, Check, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, BusinessHour, BusinessDay, Staff } from './types';
import { DAYS } from './constants';

interface SettingsPageProps {
  state: AppState;
  onLogout: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
  onUpdatePassword: (newPassword: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ state, onLogout, onUpdateShop, onUpdatePassword }) => {
  const [activeModal, setActiveModal] = useState<'password' | 'staff' | 'addStaff' | 'hours' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, shops } = state;
  const userShop = (shops || []).find(s => s.id === currentUser?.shopId);
  const navigate = useNavigate();

  const [newStaff, setNewStaff] = useState({ username: '', password: '', canAddItems: true });
  const [tempHours, setTempHours] = useState<BusinessHour[]>(userShop?.businessHours || []);
  const [isAuto, setIsAuto] = useState(userShop?.isAutomatic || false);
  const [dayToAdd, setDayToAdd] = useState<BusinessDay | ''>('');

  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '', show: false });

  const isOwner = userShop && userShop.ownerId === currentUser?.id;

  const availableDays = useMemo(() => {
    return (DAYS as BusinessDay[]).filter(d => !tempHours.some(h => h.day === d));
  }, [tempHours]);

  const handleUpdateHours = (id: string, updates: Partial<BusinessHour>) => {
    setTempHours(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    setError(null);
  };

  const handleAddDay = () => {
    if (!dayToAdd) return;
    const newSlot: BusinessHour = { 
      id: Math.random().toString(36).substr(2, 9), 
      day: dayToAdd as BusinessDay, 
      open: '09:00', 
      close: '17:00', 
      enabled: true 
    };
    setTempHours([...tempHours, newSlot]);
    setDayToAdd('');
  };

  const handleRemoveHour = (id: string) => {
    setTempHours(prev => prev.filter(h => h.id !== id));
  };

  const handleSaveHours = () => {
    if (!userShop) return;
    onUpdateShop(userShop.id, { businessHours: tempHours, isAutomatic: isAuto });
    setActiveModal(null);
  };

  const handleUpdateStaff = (id: string, updates: Partial<Staff>) => {
    if (!userShop) return;
    const staff = userShop.staff.map(s => s.id === id ? { ...s, ...updates } : s);
    onUpdateShop(userShop.id, { staff });
  };

  const handleAddStaff = () => {
    if (!newStaff.username || !newStaff.password || !userShop) return;
    const staff: Staff = { 
      id: Math.random().toString(36).substr(2, 9), 
      username: newStaff.username, 
      password: newStaff.password,
      canAddItems: newStaff.canAddItems
    };
    onUpdateShop(userShop.id, { staff: [...(userShop.staff || []), staff] });
    setNewStaff({ username: '', password: '', canAddItems: true });
    setActiveModal('staff');
  };

  const handlePasswordChange = () => {
    if (pwdForm.new !== pwdForm.confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (pwdForm.current !== currentUser?.password) {
      setError("Incorrect current password.");
      return;
    }
    if (pwdForm.new.length < 4) {
      setError("Password too short (min 4 characters).");
      return;
    }
    onUpdatePassword(pwdForm.new);
    alert("Password updated successfully!");
    setPwdForm({ current: '', new: '', confirm: '', show: false });
    setActiveModal(null);
    setError(null);
  };

  const menuItems = [
    { title: 'Change Password', desc: 'Update account security', icon: Lock, action: () => { setError(null); setActiveModal('password'); } },
  ];

  if (userShop) {
    menuItems.unshift({ title: 'Business Hour', desc: 'Opening/Closing schedule', icon: Clock, action: () => { setTempHours(userShop.businessHours || []); setIsAuto(userShop.isAutomatic); setActiveModal('hours'); } });
    if (isOwner) {
      menuItems.push({ title: 'Staff Management', desc: 'Permissions and accounts', icon: Users, action: () => setActiveModal('staff') });
    }
  }

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-2 hover:gap-3 transition-all"><ArrowLeft className="h-5 w-5" /> Back</button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {menuItems.map((item, idx) => (
          <button key={idx} onClick={item.action} className="w-full flex items-center p-6 hover:bg-gray-50 transition-colors border-b last:border-0 group">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4 group-hover:scale-105 transition-transform"><item.icon className="h-6 w-6" /></div>
            <div className="text-left flex-1">
              <h3 className="font-black text-gray-900 text-lg tracking-tight">{item.title}</h3>
              <p className="text-gray-500 font-bold text-sm">{item.desc}</p>
            </div>
            <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>

      {activeModal === 'password' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Password</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-gray-50 border rounded-full"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r font-bold text-xs flex gap-2"><AlertCircle className="shrink-0 h-4 w-4" />{error}</div>}
            <div className="space-y-4">
              <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold" placeholder="Current Password" value={pwdForm.current} onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })} />
              <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold" placeholder="New Password" value={pwdForm.new} onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })} />
              <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold" placeholder="Confirm New Password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
              <div className="flex gap-4 mt-6">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-3 font-black text-gray-500">Cancel</button>
                <button onClick={handlePasswordChange} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl">Update</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SettingsPage;
