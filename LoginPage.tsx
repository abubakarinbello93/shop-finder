import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Lock, Store, ArrowRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface LoginPageProps {
  onLogin: (identifier: string, password: string, isStaff: boolean, shopCode?: string) => boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [isStaff, setIsStaff] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(identifier, password, isStaff, shopCode)) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Invalid credentials. Please check your identifier or password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden p-8 md:p-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-xl mb-4 shadow-sm border border-blue-100">
            <span className="text-3xl font-black text-[#2563eb]">S</span>
          </div>
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tighter uppercase leading-none">Shop Finder</h1>
          <p className="text-slate-400 font-bold mt-2 text-xs tracking-widest uppercase italic">Find anything, anywhere</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black rounded-r flex items-center gap-2 animate-in shake">
            <ShieldAlert className="h-4 w-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 mb-1 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsStaff(!isStaff)}>
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isStaff ? 'bg-[#2563eb] border-[#2563eb]' : 'bg-white border-slate-300'}`}>
              {isStaff && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
            </div>
            <label className="text-[10px] font-black text-[#0f172a] cursor-pointer select-none uppercase tracking-widest">
              Login as Facility Staff
            </label>
          </div>

          {isStaff && (
            <div className="relative group animate-in slide-in-from-top-2 duration-200">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Store className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input
                type="text"
                required
                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-[#2563eb] focus:bg-white focus:outline-none transition-all font-bold text-[#0f172a]"
                placeholder="Facility Code"
                value={shopCode}
                onChange={(e) => setShopCode(e.target.value)}
              />
            </div>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              required
              className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-[#2563eb] focus:bg-white focus:outline-none transition-all font-bold text-[#0f172a]"
              placeholder="Username or phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-[#2563eb] focus:bg-white focus:outline-none transition-all font-bold text-[#0f172a]"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#2563eb] transition-colors">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <button type="submit" className="w-full bg-[#2563eb] text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 uppercase tracking-widest text-sm active:scale-[0.98]">
            Enter App <ArrowRight className="h-5 w-5" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-4">
          <Link to="/forgot-password" className="text-[10px] font-black text-[#2563eb] hover:text-blue-800 underline uppercase tracking-widest">Forgot password</Link>
          <p className="text-slate-500 font-bold text-sm">Don't have an account? <Link to="/signup" className="text-[#2563eb] font-black hover:underline">Join Today</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;