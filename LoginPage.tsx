import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, Lock, Store, ArrowRight, Eye, EyeOff, UserCheck, ShieldAlert } from 'lucide-react';

interface LoginPageProps {
  onLogin: (identifier: string, password: string, isStaff: boolean, shopCode?: string) => Promise<boolean>;
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
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('shopfinder_last_user_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLastUser(parsed);
        setIdentifier(parsed.phone || parsed.username || '');
        setIsStaff(parsed.isStaff || false);
        if (parsed.shopCode) setShopCode(parsed.shopCode);
        setIsQuickLogin(true);
      }
    } catch(e) {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const success = await onLogin(identifier, password, isStaff, shopCode);
    if (success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(isStaff ? 'Invalid Staff Credentials or Facility Code' : 'Invalid phone number or password');
      setIsLoading(false);
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
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden p-8 md:p-12 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[28px] mb-6 shadow-xl shadow-blue-100">
            <span className="text-4xl font-black text-white">S</span>
          </div>
          <h1 className="text-4xl font-black text-[#0f172a] tracking-tighter uppercase leading-none">SHOP FINDER</h1>
          <p className="text-slate-400 font-bold mt-3 text-xs tracking-widest uppercase">Find anything, anywhere</p>
        </div>

        {isQuickLogin && lastUser && !isLoading && (
          <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center animate-in slide-in-from-top-2">
            <div className="p-3 bg-blue-600 text-white rounded-xl mb-3 shadow-lg">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-black text-[#0f172a]">
                Welcome back, <span className="text-blue-600">{lastUser.username}</span>
              </p>
              {lastUser.shopCode && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">CODE: {lastUser.shopCode}</p>}
            </div>
            <button 
                type="button"
                onClick={handleSwitchAccount}
                className="mt-4 text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-[0.2em] underline underline-offset-8"
              >
                Use another account
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black rounded-r flex items-center gap-3 animate-in shake duration-300">
            <ShieldAlert className="h-5 w-5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isQuickLogin && (
            <>
              <div className="flex items-center gap-3 mb-2 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus-within:border-blue-100 transition-all cursor-pointer" onClick={() => setIsStaff(!isStaff)}>
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isStaff ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                  {isStaff && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <label className="text-xs font-black text-[#0f172a] cursor-pointer select-none uppercase tracking-widest">
                  Login as Facility Staff
                </label>
              </div>

              {isStaff && (
                <div className="relative group animate-in slide-in-from-top-2 duration-200">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Store className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    className="block w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all font-black text-[#0f172a] placeholder:text-slate-300 shadow-inner"
                    placeholder="Enter Facility Code"
                    value={shopCode}
                    onChange={(e) => setShopCode(e.target.value)}
                  />
                </div>
              )}

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all font-black text-[#0f172a] placeholder:text-slate-300 shadow-inner"
                  placeholder={isStaff ? "Staff Username" : "Phone Number"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              ref={passwordInputRef}
              type={showPassword ? "text" : "password"}
              required
              className="block w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all font-black text-[#0f172a] placeholder:text-slate-300 shadow-inner"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-blue-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex justify-end items-center px-1">
            <Link 
              to="/forgot-password"
              className="text-[10px] font-black text-blue-600 hover:text-blue-800 underline underline-offset-8 uppercase tracking-[0.2em]"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-2xl shadow-blue-100 flex items-center justify-center gap-3 group uppercase tracking-widest text-sm disabled:opacity-50"
          >
            {isLoading ? 'Authenticating...' : (isQuickLogin ? 'Sign In' : 'Enter Shop Finder')} 
            {!isLoading && <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />}
          </button>
        </form>

        {!isQuickLogin && !isLoading && (
          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
            <p className="text-slate-400 font-bold text-sm">
              New to Shop Finder?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-black decoration-2 underline underline-offset-4">
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
