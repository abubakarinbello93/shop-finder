
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lock, Users, Save, X, Plus, Trash2, Calendar, UserPlus, ChevronRight, Check, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import Layout from './Layout';
import { AppState, Shop, BusinessHour, BusinessDay, Staff, StaffPermissions } from './types';
import { DAYS } from './constants';

interface SettingsPageProps {
  state: AppState;
  onLogout: () => void;
  onUpdateShop: (id: string, updates: Partial<Shop>) => void;
  onUpdatePassword: (newPassword: string) => void;
}

const generateStaffCode = () => {
  const nums = Math.floor(1000 + Math.random() * 8999).toString();
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  return `${nums}${letters}`;
};

const SettingsPage: React.FC<SettingsPageProps> = ({ state, onLogout, onUpdateShop, onUpdatePassword }) => {
  const [activeModal, setActiveModal] = useState<'password' | 'staff' | 'addStaff' | 'hours' | null>(null);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, shops } = state;
  const userShop = (shops || []).find(s => s.id === currentUser?.shopId);
  const navigate = useNavigate();

  // Modal specific states
  const [newStaff, setNewStaff] = useState<Partial<Staff>>({ 
    fullName: '', 
    phone: '', 
    password: '', 
    position: '',
    permissions: {
      editInventory: false,
      seeStaffOnDuty: false,
      registerManagement: false,
      statusControl: false
    }
  });

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

  const handleAddStaff = () => {
    if (!newStaff.fullName || !newStaff.phone || !newStaff.password || !userShop) {
      alert("All mandatory fields (*) are required.");
      return;
    }
    if ((newStaff.password?.length || 0) < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    const staff: Staff = { 
      id: editingStaff?.id || Math.random().toString(36).substr(2, 9), 
      fullName: newStaff.fullName!,
      phone: newStaff.phone!,
      password: newStaff.password!,
      code: editingStaff?.code || generateStaffCode(),
      position: newStaff.position || 'Staff',
      permissions: newStaff.permissions!
    };

    let updatedStaffList;
    if (editingStaff) {
      updatedStaffList = (userShop.staff || []).map(s => s.id === editingStaff.id ? staff : s);
    } else {
      updatedStaffList = [...(userShop.staff || []), staff];
    }

    onUpdateShop(userShop.id, { staff: updatedStaffList });
    setNewStaff({ 
      fullName: '', phone: '', password: '', position: '', 
      permissions: { editInventory: false, seeStaffOnDuty: false, registerManagement: false, statusControl: false } 
    });
    setEditingStaff(null);
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
    if (pwdForm.new.length < 6) {
      setError("Password too short (min 6 characters).");
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
    menuItems.unshift({ title: 'Facility Schedule', desc: 'Set your hours & auto-mode', icon: Clock, action: () => { setTempHours(userShop.businessHours || []); setIsAuto(userShop.isAutomatic); setActiveModal('hours'); } });
    if (isOwner) {
      menuItems.push({ title: 'Team Management', desc: 'Staff roles & permissions', icon: Users, action: () => setActiveModal('staff') });
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

      {/* Facility Schedule Modal */}
      {activeModal === 'hours' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Facility Schedule</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              <div className={`p-6 rounded-2xl mb-8 text-white flex items-center justify-between transition-all ${isAuto ? 'bg-blue-600' : 'bg-gray-400'}`}>
                <div>
                  <h4 className="font-black text-xl leading-none">Automatic Control</h4>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-2 text-white/80">Opens/Closes based on hours</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isAuto} onChange={e => setIsAuto(e.target.checked)} />
                  <div className={`w-14 h-8 bg-white/20 rounded-full flex items-center transition-all px-1 ${isAuto ? 'justify-end' : 'justify-start'}`}>
                    <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                      {isAuto ? <Check className="h-3 w-3 text-blue-600" /> : <X className="h-3 w-3 text-gray-400" />}
                    </div>
                  </div>
                </label>
              </div>

              {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r font-bold text-xs flex gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}
              
              <div className="space-y-4">
                {tempHours.map(bh => (
                  <div key={bh.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5 rounded-2xl border bg-gray-50/50 group hover:border-blue-100 transition-all">
                    <span className="font-black text-base text-gray-800 flex-1 uppercase tracking-tight">{bh.day}</span>
                    <div className="flex items-center gap-3">
                      <input type="time" value={bh.open} onChange={e => handleUpdateHours(bh.id, { open: e.target.value })} className="p-3 rounded-xl border-2 font-black text-sm outline-none focus:border-blue-600" />
                      <span className="font-bold text-gray-400 uppercase text-[10px]">TO</span>
                      <input type="time" value={bh.close} onChange={e => handleUpdateHours(bh.id, { close: e.target.value })} className="p-3 rounded-xl border-2 font-black text-sm outline-none focus:border-blue-600" />
                      <button onClick={() => handleRemoveHour(bh.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                
                <div className="flex gap-3 mt-8 p-6 border-4 border-dashed border-gray-100 rounded-[32px] bg-white">
                  <select className="flex-1 p-4 bg-gray-50 border-none rounded-xl font-black text-sm outline-none" value={dayToAdd} onChange={e => setDayToAdd(e.target.value as BusinessDay)}>
                    <option value="">Select a day...</option>
                    {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={handleAddDay} disabled={!dayToAdd} className="px-8 py-4 bg-blue-100 text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-30">Add Day</button>
                </div>
              </div>
            </div>
            <div className="p-8 border-t bg-gray-50 flex justify-end gap-4">
              <button onClick={() => setActiveModal(null)} className="px-6 py-4 font-black text-gray-500 text-sm uppercase tracking-widest">Cancel</button>
              <button onClick={handleSaveHours} className="px-10 py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-md rounded-[32px] shadow-2xl overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Security</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-gray-50 border rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r font-bold text-xs flex gap-2"><AlertCircle className="shrink-0 h-4 w-4" />{error}</div>}
            <div className="space-y-4">
              <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-600 outline-none" placeholder="Current Password" value={pwdForm.current} onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })} />
              <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-600 outline-none" placeholder="New Password" value={pwdForm.new} onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })} />
              <input type={pwdForm.show ? "text" : "password"} className="w-full p-4 bg-gray-50 border-2 rounded-xl font-bold focus:border-blue-600 outline-none" placeholder="Confirm New Password" value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} />
              <div className="flex gap-4 mt-8">
                <button onClick={() => setActiveModal(null)} className="flex-1 py-4 font-black text-gray-500 text-sm uppercase tracking-widest">Cancel</button>
                <button onClick={handlePasswordChange} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">Update Password</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Management Modal */}
      {activeModal === 'staff' && userShop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Team Management</h2>
              <button onClick={() => setActiveModal(null)} className="p-2 bg-white border rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-8 overflow-y-auto flex-1">
              <button onClick={() => { setEditingStaff(null); setNewStaff({ fullName:'', phone:'', password:'', position:'', permissions:{editInventory:false, seeStaffOnDuty:false, registerManagement:false, statusControl:false} }); setActiveModal('addStaff'); }} className="w-full mb-8 p-6 bg-blue-50 border-4 border-dashed border-blue-100 rounded-[32px] text-blue-600 font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-100 transition-all">
                <UserPlus className="h-6 w-6" /> Add Team Member
              </button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(userShop.staff || []).map(member => (
                  <div key={member.id} className="p-6 bg-white border-2 rounded-3xl shadow-sm hover:border-blue-100 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-xl text-slate-900 leading-tight">{member.fullName}</h4>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">CODE: {member.code}</p>
                        </div>
                        <span className="bg-slate-50 px-3 py-1 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border">{member.position}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">Phone: {member.phone}</p>
                    </div>
                    <div className="flex gap-2 mt-6 pt-6 border-t border-slate-50">
                      <button onClick={() => { setEditingStaff(member); setNewStaff(member); setActiveModal('addStaff'); }} className="flex-1 py-3 bg-slate-50 text-slate-600 font-black rounded-xl text-xs uppercase tracking-widest">Edit Profile</button>
                      <button onClick={() => onUpdateShop(userShop.id, { staff: userShop.staff.filter(s => s.id !== member.id) })} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 className="h-5 w-5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Staff Detail Modal */}
      {activeModal === 'addStaff' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingStaff ? 'Update Member' : 'Register Member'}</h2>
              <button onClick={() => setActiveModal('staff')} className="p-2 bg-white border rounded-full"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-10 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2">Identity & Auth</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name *</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-black text-sm outline-none focus:border-blue-600" placeholder="Ex: John Doe" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Number * (Login ID)</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-black text-sm outline-none focus:border-blue-600" placeholder="Ex: 08012345678" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Password * (Min 6)</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-black text-sm outline-none focus:border-blue-600" type="password" placeholder="******" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Position</label>
                      <input className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-xl font-black text-sm outline-none focus:border-blue-600" placeholder="Ex: Sales Manager" value={newStaff.position} onChange={e => setNewStaff({...newStaff, position: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b pb-2 mb-4">Management Permissions</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <PermissionToggle label="Edit Inventory" active={newStaff.permissions?.editInventory || false} onToggle={() => setNewStaff({...newStaff, permissions: {...newStaff.permissions!, editInventory: !newStaff.permissions?.editInventory}})} />
                      <PermissionToggle label="See Staff on Duty" active={newStaff.permissions?.seeStaffOnDuty || false} onToggle={() => setNewStaff({...newStaff, permissions: {...newStaff.permissions!, seeStaffOnDuty: !newStaff.permissions?.seeStaffOnDuty}})} />
                      <PermissionToggle label="Register Management" active={newStaff.permissions?.registerManagement || false} onToggle={() => setNewStaff({...newStaff, permissions: {...newStaff.permissions!, registerManagement: !newStaff.permissions?.registerManagement}})} />
                      <PermissionToggle label="Open / Close Control" active={newStaff.permissions?.statusControl || false} onToggle={() => setNewStaff({...newStaff, permissions: {...newStaff.permissions!, statusControl: !newStaff.permissions?.statusControl}})} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t bg-gray-50 flex gap-4">
              <button onClick={() => setActiveModal('staff')} className="flex-1 py-5 font-black text-slate-400 text-sm uppercase tracking-widest">Cancel</button>
              <button onClick={handleAddStaff} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">{editingStaff ? 'Update Member' : 'Grant Access'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const PermissionToggle: React.FC<{ label: string, active: boolean, onToggle: () => void }> = ({ label, active, onToggle }) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all" onClick={onToggle}>
    <span className="font-black text-[10px] uppercase tracking-widest text-slate-700">{label}</span>
    <div className={`w-10 h-6 rounded-full transition-all relative flex items-center px-1 ${active ? 'bg-green-500' : 'bg-slate-200'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${active ? 'translate-x-4' : 'translate-x-0'}`} />
    </div>
  </div>
);

export default SettingsPage;
