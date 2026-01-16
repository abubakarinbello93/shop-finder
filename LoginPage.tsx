
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Lock, Store, ArrowRight, Eye, EyeOff, UserCheck, ShieldAlert } from 'lucide-react';

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
  const [lastUser, setLastUser] = useState<any>(null);
  const [isQuickLogin, setIsQuickLogin] = useState(false);
  const navigate = useNavigate();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('shopfinder_last_user_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLastUser(parsed);
        setIdentifier(parsed.username || parsed.phone);
        setIsStaff(parsed.isStaff || false);
        if (parsed.shopCode) setShopCode(parsed.shopCode);
        setIsQuickLogin(true);
        
        const timer = setTimeout(() => {
          if (passwordInputRef.current) passwordInputRef.current.focus();
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch(e) {}
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(identifier, password, isStaff, shopCode)) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(isStaff ? 'Invalid Staff Credentials or Facility Code' : 'Invalid identifier or password');
    }
  };

  const handleSwitchAccount = () => {
    setIsQuickLogin(false);
    setIdentifier('');
    setPassword('');
    setShopCode('');
    setIsStaff(false);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden p-8 md:p-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-xl mb-4 shadow-sm border border-blue-100">
            <span className="text-3xl font-black text-[#2563eb]">S</span>
          </div>
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tighter uppercase leading-none">SHOP FINDER</h1>
          <p className="text-slate-400 font-bold mt-2 text-xs tracking-widest uppercase">Find anything, anywhere</p>
        </div>

        {isQuickLogin && lastUser && (
          <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center animate-in slide-in-from-top-2">
            <div className="p-2 bg-[#2563eb] text-white rounded-lg mb-2 shadow">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">
                Welcome back, <span className="text-[#2563eb]">{lastUser.username}</span>
              </p>
              {lastUser.shopCode && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">CODE: {lastUser.shopCode}</p>}
            </div>
            <button 
                type="button"
                onClick={handleSwitchAccount}
                className="mt-3 text-[10px] font-black text-[#2563eb] hover:text-blue-800 transition-colors uppercase tracking-widest underline underline-offset-4"
              >
                Use another account
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black rounded-r flex items-center gap-2 animate-in shake duration-300">
            <ShieldAlert className="h-4 w-4" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isQuickLogin && (
            <>
              <div className="flex items-center gap-2 mb-1 p-3 bg-slate-50 rounded-xl border border-transparent focus-within:border-blue-200 transition-all cursor-pointer" onClick={() => setIsStaff(!isStaff)}>
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
                    <Store className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563eb] transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-[#2563eb] focus:bg-white focus:outline-none transition-all font-bold text-[#0f172a] placeholder:text-slate-300"
                    placeholder="Enter Facility Code"
                    value={shopCode}
                    onChange={(e) => setShopCode(e.target.value)}
                  />
                </div>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563eb] transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-[#2563eb] focus:bg-white focus:outline-none transition-all font-bold text-[#0f172a] placeholder:text-slate-300"
                  placeholder={isStaff ? "Staff Username" : "Username or phone number"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#2563eb] transition-colors" />
            </div>
            <input
              ref={passwordInputRef}
              type={showPassword ? "text" : "password"}
              required
              className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 border-transparent rounded-xl focus:border-[#2563eb] focus:bg-white focus:outline-none transition-all font-bold text-[#0f172a] placeholder:text-slate-300"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-[#2563eb] transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex justify-end items-center px-1">
            <Link 
              to="/forgot-password"
              className="text-[10px] font-black text-[#2563eb] hover:text-blue-800 underline underline-offset-4 uppercase tracking-widest"
            >
              Forgot password
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-[#2563eb] text-white font-black py-4 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 group uppercase tracking-widest text-sm"
          >
            {isQuickLogin ? 'Sign In' : 'Enter App'} <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {!isQuickLogin && (
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-500 font-bold text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#2563eb] hover:text-blue-800 font-black">
                Join Today
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
