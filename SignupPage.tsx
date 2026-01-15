
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, User as UserIcon, Phone, Mail, Lock, Store, MapPin, Navigation, Package, X, Check, Eye, EyeOff } from 'lucide-react';
import { ALL_STATES, NIGERIA_STATES, BUSINESS_CATEGORIES } from './constants';
import { User, Shop } from './types';

interface SignupPageProps {
  onSignup: (user: Partial<User>, shop?: Partial<Shop>) => { success: boolean; message?: string };
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup }) => {
  const [step, setStep] = useState(1);
  const [registerShop, setRegisterShop] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '', phone: '', email: '', password: '', confirmPassword: '',
    shopName: '', shopType: '', otherCategory: '', state: '', lga: '', address: '',
    lat: null as number | null, lng: null as number | null
  });
  const navigate = useNavigate();

  const lgas = formData.state ? NIGERIA_STATES[formData.state] : [];

  const handleCaptureLocation = () => {
    setIsCapturing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({ 
            ...prev, 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude 
          }));
          setIsCapturing(false);
        },
        () => {
          setIsCapturing(false);
          alert("Could not fix GPS. Please enter address manually.");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsCapturing(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleNext = () => {
    if (!formData.username || !formData.phone || !formData.password || !formData.confirmPassword) {
      alert("Please fill in all mandatory fields.");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (registerShop) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    let shop;
    if (registerShop) {
      const finalCategory = formData.shopType === 'Other' ? formData.otherCategory : formData.shopType;
      if (!formData.shopName || !finalCategory || !formData.state || !formData.lga || !formData.address) {
        alert("All Shop Finder facility fields are mandatory.");
        return;
      }
      shop = {
        name: formData.shopName,
        type: finalCategory,
        state: formData.state,
        lga: formData.lga,
        address: formData.address,
        location: (formData.lat !== null && formData.lng !== null) ? { lat: formData.lat, lng: formData.lng } : undefined
      };
    }
    
    const user = { 
      username: formData.username, 
      phone: formData.phone, 
      email: formData.email,
      password: formData.password 
    };

    const result = onSignup(user, shop);
    if (result.success) {
      alert("Account created! Welcome to Shop Finder.");
      navigate('/login', { replace: true });
    } else {
      alert(result.message || "Registration failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">Join Shop Finder</h1>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Step {step} of {registerShop ? 2 : 1}</p>
          </div>
          <Link to="/login" className="p-2 bg-white rounded-full border shadow-sm hover:shadow-md transition-shadow">
            <X className="h-5 w-5 text-gray-400" />
          </Link>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Username *" icon={UserIcon} value={formData.username} onChange={v => setFormData({ ...formData, username: v })} />
                <Input label="Phone Number *" icon={Phone} value={formData.phone} onChange={v => setFormData({ ...formData, phone: v })} />
              </div>
              <Input label="Email (Optional)" icon={Mail} value={formData.email} onChange={v => setFormData({ ...formData, email: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Input 
                    label="Password *" 
                    icon={Lock} 
                    type={showPassword ? "text" : "password"} 
                    value={formData.password} 
                    onChange={v => setFormData({ ...formData, password: v })} 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-blue-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Input 
                  label="Confirm Password *" 
                  icon={Lock} 
                  type={showPassword ? "text" : "password"} 
                  value={formData.confirmPassword} 
                  onChange={v => setFormData({ ...formData, confirmPassword: v })} 
                />
              </div>
              <div className="bg-blue-50 p-6 rounded-2xl border-2 border-dashed border-blue-200 text-center">
                <p className="font-black text-blue-900 mb-4 text-base">Registering a Facility/Shop?</p>
                <div className="flex gap-4">
                  <button onClick={() => setRegisterShop(true)} className={`flex-1 py-3 px-4 rounded-xl font-black transition-all ${registerShop ? 'bg-blue-700 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border-2'}`}>YES</button>
                  <button onClick={() => setRegisterShop(false)} className={`flex-1 py-3 px-4 rounded-xl font-black transition-all ${!registerShop ? 'bg-blue-700 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-500 border-2'}`}>NO</button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <Input label="Facility Name *" icon={Store} value={formData.shopName} onChange={v => setFormData({ ...formData, shopName: v })} />
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Category *</label>
                <select 
                  className="w-full p-3.5 bg-gray-50 border-2 border-transparent rounded-xl font-bold focus:border-blue-700 focus:bg-white outline-none transition-all" 
                  value={formData.shopType} 
                  onChange={e => setFormData({ ...formData, shopType: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {BUSINESS_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {formData.shopType === 'Other' && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <Input label="Specify Category *" icon={Package} value={formData.otherCategory} onChange={v => setFormData({ ...formData, otherCategory: v })} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">State *</label>
                  <select className="w-full p-3.5 bg-gray-50 border-2 border-transparent rounded-xl font-bold focus:border-blue-700 focus:bg-white outline-none transition-all" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value, lga: '' })}>
                    <option value="">Select State</option>
                    {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">LGA *</label>
                  <select className="w-full p-3.5 bg-gray-50 border-2 border-transparent rounded-xl font-bold focus:border-blue-700 focus:bg-white outline-none transition-all disabled:opacity-50" disabled={!formData.state} value={formData.lga} onChange={e => setFormData({ ...formData, lga: e.target.value })}>
                    <option value="">Select LGA</option>
                    {lgas.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Full Address *" icon={MapPin} value={formData.address} onChange={v => setFormData({ ...formData, address: v })} />
              
              <button 
                onClick={handleCaptureLocation}
                disabled={isCapturing}
                type="button"
                className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl font-black transition-all ${formData.lat ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {isCapturing ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" /> : (formData.lat ? <Check className="h-4 w-4" /> : <Navigation className="h-4 w-4" />)}
                {isCapturing ? 'Locating...' : (formData.lat ? 'GPS Active' : 'Link Facility GPS')}
              </button>
            </div>
          )}

          <div className="flex gap-4 mt-8">
            {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 p-4 border-2 border-gray-100 rounded-xl font-black text-gray-500 hover:bg-gray-50 transition-colors uppercase tracking-widest text-xs">Back</button>}
            <button onClick={step === 2 || (step === 1 && !registerShop) ? handleSubmit : handleNext} className="flex-[2] p-4 bg-blue-700 text-white rounded-xl font-black hover:bg-blue-800 flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-sm">
              {step === 2 || (step === 1 && !registerShop) ? 'Finish Registration' : 'Continue'} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Input: React.FC<{ label: string, icon: any, type?: string, value: string, onChange: (v: string) => void }> = ({ label, icon: Icon, type = 'text', value, onChange }) => (
  <div className="space-y-1 flex-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
    <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors"><Icon className="h-4 w-4 text-gray-400 group-focus-within:text-blue-700" /></div>
      <input type={type} className="block w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-700 focus:bg-white outline-none font-bold transition-all text-sm" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  </div>
);

export default SignupPage;
