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

  // Modal specific states
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
    if (!newStaff.username || !newStaff.password || !userShop) {
      alert("Username and password are required.");
      return;
    }
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
    menuItems.unshift({ 
      title: 'Business Hour', 
      desc: 'Opening/Closing schedule', 
      icon: Clock, 
      action: () => { 
        setTempHours(userShop.businessHours || []); 
        setIsAuto(userShop.isAutomatic); 
        setActiveModal('hours'); 
      } 
    });
    if (isOwner) {
      menuItems.push({ 
        title: 'Staff Management', 
        desc: 'Permissions and accounts', 
        icon: Users, 
        action: () => setActiveModal('staff') 
      });
    }
  }

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-2 hover:gap-3 transition-all">
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        {menuItems.map((item, idx) => (
          <button key={idx} onClick={item.action} className="w-full flex items-center p-6 hover:bg-gray-50 transition-colors border-b last:border-0 group">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl mr-4 group-hover:scale-105 transition-transform">
              <item.icon className="h-6 w-6" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-black text-gray-900 text-lg tracking-tight">{item.title}</h3>
              <p className="text-gray-500 font-bold text-sm">{item.desc}</p>
            </div>
            <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>

      {/* Password Modal */}
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

      {/* Business Hours Modal */}
      {activeModal === 'hours' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Manage Hours</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
               <div className={`p-4 rounded-2xl mb-6 text-white flex items-center justify-between transition-colors ${isAuto ? 'bg-blue-600' : 'bg-gray-400'}`}>
                <div>
                  <h4 className="font-black text-lg">Automatic Mode</h4>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Shop flips Open/Closed based on schedule</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isAuto} onChange={e => setIsAuto(e.target.checked)} />
                  <div className={`w-14 h-8 bg-white/20 rounded-full flex items-center transition-all px-1 ${isAuto ? 'justify-end' : 'justify-start'}`}>
                    <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center">
                      <Check className={`h-3 w-3 ${isAuto ? 'text-blue-600' : 'text-gray-300'}`} />
                    </div>
                  </div>
                </label>
              </div>

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

                <div className="flex gap-2 mt-4 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-slate-50">
                  <select className="flex-1 p-3 bg-white border rounded-lg font-bold text-sm outline-none" value={dayToAdd} onChange={e => setDayToAdd(e.target.value as BusinessDay)}>
                    <option value="">Add schedule for...</option>
                    {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={handleAddDay} disabled={!dayToAdd} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-black text-xs disabled:opacity-50 shadow-md shadow-blue-100">Add Day</button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setActiveModal(null)} className="px-6 py-3 font-black text-gray-500 text-sm">Cancel</button>
              <button onClick={handleSaveHours} className="px-10 py-3 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Management Modal */}
      {activeModal === 'staff' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Staff Management</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <button onClick={() => setActiveModal('addStaff')} className="w-full mb-6 p-4 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-black text-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-all">
                <Plus className="h-5 w-5" /> Add New Staff Member
              </button>
              
              <div className="space-y-3">
                {(userShop.staff || []).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-5 bg-white border-2 rounded-2xl hover:border-blue-100 transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-gray-800 block">{member.username}</span>
                        {member.canAddItems && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Editor</span>}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">PWD: {member.password}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <label className="text-[8px] font-black uppercase text-gray-400 mb-1">Items</label>
                        <button 
                          onClick={() => handleUpdateStaff(member.id, { canAddItems: !member.canAddItems })}
                          className={`w-10 h-6 rounded-full transition-all relative flex items-center px-1 ${member.canAddItems ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${member.canAddItems ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <button 
                        onClick={() => onUpdateShop(userShop.id, { staff: userShop.staff.filter(s => s.id !== member.id) })} 
                        className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!userShop.staff || userShop.staff.length === 0) && (
                  <div className="py-12 text-center text-gray-300 font-black uppercase tracking-widest text-sm">
                    No staff members yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Detail Modal */}
      {activeModal === 'addStaff' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 animate-in zoom-in-95">
            <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">Add New Staff</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Staff Username</label>
                <input className="w-full p-4 bg-gray-50 border-2 rounded-xl font-black text-sm outline-none focus:border-blue-600 transition-all" placeholder="Enter username" value={newStaff.username} onChange={e => setNewStaff({ ...newStaff, username: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Staff Password</label>
                <input className="w-full p-4 bg-gray-50 border-2 rounded-xl font-black text-sm outline-none focus:border-blue-600 transition-all" placeholder="Enter password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
              </div>
              <div className="flex items-center gap-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                 <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={newStaff.canAddItems} onChange={e => setNewStaff({ ...newStaff, canAddItems: e.target.checked })} id="canAdd" />
                 <label htmlFor="canAdd" className="font-black text-sm text-gray-700 cursor-pointer">Allow this member to add items</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setActiveModal('staff')} className="flex-1 py-4 font-black text-gray-500 text-sm uppercase tracking-widest">Cancel</button>
                <button onClick={handleAddStaff} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">Register Staff</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SettingsPage;
