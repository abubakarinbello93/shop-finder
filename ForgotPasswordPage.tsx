
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-700 via-indigo-900 to-black">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-500">
        <div className="mb-6">
           <Link to="/login" className="inline-flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-700 transition-colors">
             <ArrowLeft className="h-4 w-4" /> Back to Login
           </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4 shadow-sm border border-blue-50">
            <span className="text-3xl font-black text-blue-700">S</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">Forgot password</h1>
          <p className="text-gray-400 font-bold mt-1 text-[10px] tracking-widest uppercase">Step {step} of 2</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black rounded-r flex items-center gap-2 animate-in shake duration-300">
             {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
               <p className="text-[11px] font-bold text-blue-800 leading-tight">
                 Enter your account identifier linked to your Shop Finder account.
               </p>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-700 transition-colors" />
              </div>
              <input
                type="text"
                required
                autoFocus
                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-700 focus:bg-white focus:outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300"
                placeholder="Username or phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-blue-700 text-white font-black py-4 rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 group uppercase tracking-widest text-sm"
            >
              Continue <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleFinish} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
               <p className="text-[11px] font-bold text-indigo-800 leading-tight">
                 Identity verified for <span className="text-indigo-600 font-black">{identifier}</span>.
               </p>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-700 transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoFocus
                className="block w-full pl-11 pr-12 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-700 focus:bg-white focus:outline-none transition-all font-bold text-gray-800 placeholder:text-gray-300"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-700 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group uppercase tracking-widest text-sm"
            >
              Complete Reset <ShieldCheck className="h-5 w-5" />
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-4 animate-in zoom-in-95 duration-500">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-100">
               <CheckCircle className="h-8 w-8" />
             </div>
             <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Success!</h2>
             <p className="text-gray-500 font-bold mt-1 mb-6 leading-tight">
               Your password has been updated. You can now log in to Shop Finder.
             </p>
             <button
              onClick={() => navigate('/login')}
              className="w-full bg-gray-900 text-white font-black py-4 rounded-xl hover:bg-black active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
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
