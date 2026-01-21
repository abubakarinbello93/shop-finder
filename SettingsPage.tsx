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
    { title: 'Security', desc: 'Manage your password', icon: Lock, action: () => { setError(null); setActiveModal('password'); } },
  ];

  if (userShop) {
    menuItems.unshift({ 
      title: 'Facility Schedule', 
      desc: 'Set your hours & auto-mode', 
      icon: Clock, 
      action: () => { 
        setTempHours(userShop.businessHours || []); 
        setIsAuto(userShop.isAutomatic); 
        setActiveModal('hours'); 
      } 
    });
    if (isOwner) {
      menuItems.push({ 
        title: 'Team Management', 
        desc: 'Staff permissions & access', 
        icon: Users, 
        action: () => setActiveModal('staff') 
      });
    }
  }

  return (
    <Layout user={currentUser!} shop={userShop} onLogout={onLogout}>
      <div className="mb-8">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-blue-600 font-black mb-2 hover:gap-3 transition-all">
          <ArrowLeft className="h-5 w-5" /> Back to Dashboard
        </button>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">App Settings</h1>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border overflow-hidden">
        {menuItems.map((item, idx) => (
          <button key={idx} onClick={item.action} className="w-full flex items-center p-8 hover:bg-gray-50 transition-colors border-b last:border-0 group">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl mr-6 group-hover:scale-110 transition-transform">
              <item.icon className="h-6 w-6" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-black text-gray-900 text-xl tracking-tight leading-tight">{item.title}</h3>
              <p className="text-gray-500 font-bold text-sm mt-1">{item.desc}</p>
            </div>
            <ChevronRight className="h-6 w-6 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-2 transition-all" />
          </button>
        ))}
      </div>

      {/* Password Modal */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Security</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-gray-50 border rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r font-bold text-xs flex gap-2"><AlertCircle className="shrink-0 h-4 w-4" />{error}</div>}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-600 outline-none" value={pwdForm.current} onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-600 outline-none" value={pwdForm.new} onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-600 outline-none" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-4 font-black text-gray-500 text-sm uppercase tracking-widest">Cancel</button>
                <button onClick={handlePasswordChange} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">Update Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Hours Modal */}
      {activeModal === 'hours' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Facility Schedule</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
               <div className={`p-6 rounded-2xl mb-8 text-white flex items-center justify-between transition-all duration-500 ${isAuto ? 'bg-blue-600 shadow-xl shadow-blue-100' : 'bg-slate-400'}`}>
                <div>
                  <h4 className="font-black text-xl uppercase tracking-tight">Automatic Mode</h4>
                  <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">Status toggles Open/Closed based on schedule</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isAuto} onChange={e => setIsAuto(e.target.checked)} />
                  <div className={`w-16 h-10 bg-white/20 rounded-full flex items-center transition-all px-1.5 ${isAuto ? 'justify-end' : 'justify-start'}`}>
                    <div className="h-7 w-7 rounded-full bg-white flex items-center justify-center shadow-lg">
                      <Check className={`h-4 w-4 ${isAuto ? 'text-blue-600' : 'text-slate-300'}`} />
                    </div>
                  </div>
                </label>
              </div>

              <div className="space-y-4">
                {tempHours.map(bh => (
                  <div key={bh.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border bg-gray-50/50 group hover:bg-white hover:border-blue-100 transition-all">
                    <span className="font-black text-lg text-slate-800 flex-1 uppercase tracking-tight">{bh.day}</span>
                    <div className="flex items-center gap-3">
                      <input type="time" value={bh.open} onChange={e => handleUpdateHours(bh.id, { open: e.target.value })} className="p-3 rounded-xl border-2 border-transparent focus:border-blue-600 bg-white font-black text-sm outline-none" />
                      <span className="font-black text-slate-300 uppercase text-[10px] tracking-widest">TO</span>
                      <input type="time" value={bh.close} onChange={e => handleUpdateHours(bh.id, { close: e.target.value })} className="p-3 rounded-xl border-2 border-transparent focus:border-blue-600 bg-white font-black text-sm outline-none" />
                      <button onClick={() => handleRemoveHour(bh.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-5 w-5" /></button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 mt-6 p-6 border-4 border-dashed border-slate-100 rounded-[32px] bg-slate-50/50 items-center">
                  <Calendar className="h-6 w-6 text-slate-300 shrink-0" />
                  <select className="flex-1 p-4 bg-white border-2 border-transparent rounded-2xl font-black text-sm outline-none focus:border-blue-600 shadow-sm" value={dayToAdd} onChange={e => setDayToAdd(e.target.value as BusinessDay)}>
                    <option value="">Add schedule for...</option>
                    {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={handleAddDay} disabled={!dayToAdd} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs disabled:opacity-50 shadow-xl shadow-blue-100 uppercase tracking-widest">Add</button>
                </div>
              </div>
            </div>
            <div className="p-8 border-t bg-gray-50 flex justify-end gap-4">
              <button onClick={() => setActiveModal(null)} className="px-8 py-4 font-black text-slate-500 text-sm uppercase tracking-widest">Discard</button>
              <button onClick={handleSaveHours} className="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Management Modal */}
      {activeModal === 'staff' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Team Access</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              <button onClick={() => setActiveModal('addStaff')} className="w-full mb-8 p-6 bg-blue-50 border-4 border-dashed border-blue-100 rounded-[32px] text-blue-600 font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-100 hover:border-blue-200 transition-all group">
                <UserPlus className="h-6 w-6 group-hover:scale-110 transition-transform" /> Add New Member
              </button>
              
              <div className="space-y-4">
                {(userShop.staff || []).map(member => (
                  <div key={member.id} className="flex items-center justify-between p-6 bg-white border-2 border-transparent rounded-3xl shadow-sm hover:border-blue-100 transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-xl text-slate-900 leading-none">{member.username}</span>
                        {member.canAddItems && <span className="text-[9px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-black uppercase tracking-widest">Editor</span>}
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                        <Lock className="h-3 w-3" /> PWD: <span className="text-slate-600">{member.password}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-center">
                        <label className="text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Edit Inventory</label>
                        <button 
                          onClick={() => handleUpdateStaff(member.id, { canAddItems: !member.canAddItems })}
                          className={`w-12 h-7 rounded-full transition-all relative flex items-center px-1 ${member.canAddItems ? 'bg-blue-600' : 'bg-slate-200'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${member.canAddItems ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      <button 
                        onClick={() => onUpdateShop(userShop.id, { staff: userShop.staff.filter(s => s.id !== member.id) })} 
                        className="p-4 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
                      >
                        <Trash2 className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                ))}

                {(!userShop.staff || userShop.staff.length === 0) && (
                  <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-sm flex flex-col items-center gap-4">
                    <Users className="h-16 w-16 opacity-20" />
                    No staff members registered.
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
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10 animate-in zoom-in-95">
            <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter leading-none">Register Team</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Staff Username</label>
                <input className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600 transition-all" placeholder="e.g. Ade2024" value={newStaff.username} onChange={e => setNewStaff({ ...newStaff, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Staff Password</label>
                <input className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-base outline-none focus:border-blue-600 transition-all" placeholder="Secret Key" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
              </div>
              <div className="flex items-center gap-5 p-6 bg-blue-50/50 border-2 border-blue-100 rounded-3xl cursor-pointer" onClick={() => setNewStaff({ ...newStaff, canAddItems: !newStaff.canAddItems })}>
                 <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${newStaff.canAddItems ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100' : 'bg-white border-slate-300'}`}>
                   {newStaff.canAddItems && <Check className="h-4 w-4 text-white" />}
                 </div>
                 <label className="font-black text-sm text-slate-700 cursor-pointer uppercase tracking-tight">Allow inventory updates</label>
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setActiveModal('staff')} className="flex-1 py-5 font-black text-slate-400 text-sm uppercase tracking-widest hover:text-slate-600 transition-colors">Back</button>
                <button onClick={handleAddStaff} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm hover:bg-blue-700 transition-all">Grant Access</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SettingsPage;
