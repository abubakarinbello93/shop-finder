import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, Users, Save, X, Plus, Trash2, Calendar, UserPlus, ChevronRight, Check, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Layout from '../components/Layout';
import { AppState, Shop, BusinessHour, BusinessDay, Staff } from '../types';
import { DAYS } from '../constants';

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

  // Changed 'username' to 'fullName' and added 'phone' to match Staff interface
  const [newStaff, setNewStaff] = useState({ fullName: '', phone: '', password: '', canAddItems: true });
  const [tempHours, setTempHours] = useState<BusinessHour[]>(userShop?.businessHours || []);
  const [isAuto, setIsAuto] = useState(userShop?.isAutomatic || false);
  const [dayToAdd, setDayToAdd] = useState<BusinessDay | ''>('');

  // Password change state
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '', show: false });

  const isOwner = userShop && userShop.ownerId === currentUser?.id;

  const availableDays = useMemo(() => {
    return (DAYS as BusinessDay[]).filter(d => !tempHours.some(h => h.day === d));
  }, [tempHours]);

  const validateOverlaps = (hours: BusinessHour[]): string | null => {
    for (const day of DAYS as BusinessDay[]) {
      const daySlots = hours.filter(h => h.day === day && h.enabled);
      if (daySlots.length < 2) continue;
      const sorted = [...daySlots].sort((a, b) => a.open.localeCompare(b.open));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].close > sorted[i + 1].open) {
          return `Overlap on ${day}! ${sorted[i].open}-${sorted[i].close} overlaps ${sorted[i+1].open}.`;
        }
      }
    }
    return null;
  };

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
    const overlapErr = validateOverlaps(tempHours);
    if (overlapErr) { setError(overlapErr); return; }
    onUpdateShop(userShop.id, { businessHours: tempHours, isAutomatic: isAuto });
    setActiveModal(null);
  };

  const handleUpdateStaff = (id: string, updates: Partial<Staff>) => {
    if (!userShop) return;
    const staff = userShop.staff.map(s => s.id === id ? { ...s, ...updates } : s);
    onUpdateShop(userShop.id, { staff });
  };

  const handleAddStaff = () => {
    // Corrected check and Staff object literal to use 'fullName' and include required properties
    if (!newStaff.fullName || !newStaff.password || !userShop) return;
    const staff: Staff = { 
      id: Math.random().toString(36).substr(2, 9), 
      fullName: newStaff.fullName, 
      phone: newStaff.phone || '',
      password: newStaff.password,
      code: Math.random().toString(36).substr(2, 6).toUpperCase(),
      position: 'Staff',
      eligibleShifts: [],
      permissions: {
        editInventory: newStaff.canAddItems,
        seeStaffOnDuty: false,
        registerManagement: false,
        statusControl: false
      },
      canAddItems: newStaff.canAddItems
    };
    onUpdateShop(userShop.id, { staff: [...(userShop.staff || []), staff] });
    setNewStaff({ fullName: '', phone: '', password: '', canAddItems: true });
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
              <div className="relative group">
                <input 
                  type={pwdForm.show ? "text" : "password"}
                  className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-500 outline-none pr-12 text-sm" 
                  placeholder="Current Password" 
                  value={pwdForm.current} 
                  onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })} 
                />
                <button 
                  onClick={() => setPwdForm({ ...pwdForm, show: !pwdForm.show })}
                  className="absolute right-4 top-4 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {pwdForm.show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <input 
                type={pwdForm.show ? "text" : "password"}
                className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-500 outline-none text-sm" 
                placeholder="New Password" 
                value={pwdForm.new} 
                onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })} 
              />

              <input 
                type={pwdForm.show ? "text" : "password"}
                className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-500 outline-none text-sm" 
                placeholder="Confirm New Password" 
                value={pwdForm.confirm} 
                onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} 
              />

              <div className="flex gap-4 mt-6">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-3 font-black text-gray-500 text-sm">Cancel</button>
                <button onClick={handlePasswordChange} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg text-sm shadow-blue-100">Update</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'hours' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Business Hour</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className={`p-4 rounded-xl mb-6 text-white flex items-center justify-between transition-colors ${isAuto ? 'bg-blue-600' : 'bg-gray-400'}`}>
                <div><h4 className="font-black text-lg">Automatic Mode</h4></div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isAuto} onChange={e => setIsAuto(e.target.checked)} />
                  <div className={`w-14 h-8 bg-white/20 rounded-full flex items-center transition-all px-1 ${isAuto ? 'justify-end' : 'justify-start'}`}>
                    <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center">
                      {!isAuto && <span className="text-[8px] font-black text-gray-400 uppercase">off</span>}
                    </div>
                  </div>
                </label>
              </div>
              {error && <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r font-bold text-xs flex gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
              <div className="space-y-3">
                {tempHours.map(bh => (
                  <div key={bh.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-xl border bg-gray-50/50">
                    <span className="font-black text-base text-gray-800 flex-1">{bh.day}</span>
                    <div className="flex items-center gap-2">
                      <input type="time" value={bh.open} onChange={e => handleUpdateHours(bh.id, { open: e.target.value })} className="p-2 rounded-lg border font-bold text-sm" />
                      <span className="font-bold text-gray-400">to</span>
                      <input type="time" value={bh.close} onChange={e => handleUpdateHours(bh.id, { close: e.target.value })} className="p-2 rounded-lg border font-bold text-sm" />
                      <button onClick={() => handleRemoveHour(bh.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 mt-4 p-4 border-2 border-dashed border-gray-200 rounded-xl">
                  <select className="flex-1 p-2 bg-gray-50 border-none rounded-lg font-bold text-sm" value={dayToAdd} onChange={e => setDayToAdd(e.target.value as BusinessDay)}>
                    <option value="">Select a day...</option>
                    {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={handleAddDay} disabled={!dayToAdd} className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-black text-xs disabled:opacity-50">Add</button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 font-black text-gray-500 text-sm">Cancel</button>
              <button onClick={handleSaveHours} className="px-8 py-2 bg-blue-600 text-white font-black rounded-xl shadow-lg text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'staff' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Staff Management</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <button onClick={() => setActiveModal('addStaff')} className="w-full mb-6 p-4 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-black text-lg flex items-center justify-center gap-2"><Plus className="h-5 w-5" /> Add Staff</button>
              <div className="space-y-3">
                {(userShop.staff || []).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-white border rounded-xl">
                    <div className="flex-1">
                      {/* Fixed: Use 'fullName' instead of 'username' */}
                      <span className="font-bold text-base text-gray-800 block">{member.fullName}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">PWD: {member.password}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <label className="text-[8px] font-black uppercase mb-1">Items</label>
                        <button 
                          onClick={() => handleUpdateStaff(member.id, { canAddItems: !member.canAddItems })}
                          className={`w-8 h-5 rounded-full transition-colors flex items-center px-1 ${member.canAddItems ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}
                        >
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </button>
                      </div>
                      <button onClick={() => onUpdateShop(userShop.id, { staff: userShop.staff.filter(s => s.id !== member.id) })} className="p-2 text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'addStaff' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Add New Staff</h2>
            <div className="space-y-4">
              {/* Corrected: Using 'fullName' and 'phone' fields */}
              <input className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold text-sm" placeholder="Full Name" value={newStaff.fullName} onChange={e => setNewStaff({ ...newStaff, fullName: e.target.value })} />
              <input className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold text-sm" placeholder="Phone Number" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />
              <input className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold text-sm" placeholder="Password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                 <input type="checkbox" className="w-4 h-4" checked={newStaff.canAddItems} onChange={e => setNewStaff({ ...newStaff, canAddItems: e.target.checked })} />
                 <span className="font-bold text-sm text-gray-700">Allow Adding Items</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setActiveModal('staff')} className="flex-1 py-3 font-black text-gray-500 text-sm">Cancel</button>
                <button onClick={handleAddStaff} className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SettingsPage;
