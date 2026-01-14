
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, CheckCircle, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface ForgotPasswordPageProps {
  onReset: (identifier: string, newPass: string) => boolean;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onReset }) => {
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNext = () => {
    if (!identifier.trim()) {
      setError('Please enter your account identifier.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    
    if (onReset(identifier, newPassword)) {
      setStep(3);
    } else {
      setError('Account not found. Please check the identifier.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-700 via-slate-900 to-black">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-500">
        <div className="mb-8">
           <Link to="/login" className="inline-flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-indigo-700 transition-colors">
             <ArrowLeft className="h-4 w-4" /> Back to Login
           </Link>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-[2rem] mb-6 shadow-sm border border-indigo-100">
            <span className="text-4xl font-black text-indigo-700">O</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Security reset</h1>
          <p className="text-gray-400 font-bold mt-2 text-[10px] tracking-widest uppercase italic">Openshop • Step {step} of 2</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black rounded-r flex items-center gap-3 animate-in shake duration-300">
             {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
               <p className="text-[11px] font-bold text-indigo-800 leading-tight">
                 Enter the account identifier linked to your Openshop account to proceed.
               </p>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-700 transition-colors" />
              </div>
              <input
                type="text"
                required
                autoFocus
                className="block w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-700 focus:bg-white focus:outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300 shadow-inner"
                placeholder="Username or phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-indigo-700 text-white font-black py-4.5 rounded-2xl hover:bg-indigo-800 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group uppercase tracking-widest text-sm"
            >
              Verify Identity <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleFinish} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
               <p className="text-[11px] font-bold text-indigo-800 leading-tight">
                 Access granted for <span className="text-indigo-600 font-black">{identifier}</span>. Set a new password below.
               </p>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-700 transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                className="block w-full pl-11 pr-12 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-indigo-700 focus:bg-white focus:outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300 shadow-inner"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-indigo-700 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-black py-4.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 group uppercase tracking-widest text-sm"
            >
              Complete Reset <ShieldCheck className="h-5 w-5" />
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-6 animate-in zoom-in-95 duration-500">
             <div className="w-20 h-20 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100 transform -rotate-3">
               <CheckCircle className="h-10 w-10" />
             </div>
             <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Access Restored</h2>
             <p className="text-gray-500 font-bold mt-2 mb-8 leading-tight">
               Your password has been updated. You can now log in to Openshop.
             </p>
             <button
              onClick={() => navigate('/login')}
              className="w-full bg-slate-900 text-white font-black py-4.5 rounded-2xl hover:bg-black active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
