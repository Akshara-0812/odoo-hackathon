import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import StockSenseLogo from './Logo';

export default function AuthView() {
  const { login, register, requestOtp, resetPassword } = useAuth();

  // Mode: 'login' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Form states matching wireframe fields
  const [loginId, setLoginId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [demoOtpCode, setDemoOtpCode] = useState(null);

  const clearMessages = () => {
    setError(null);
    setSuccessMsg(null);
    setDemoOtpCode(null);
  };

  // Demo user quick-fillers
  const fillDemoManager = () => {
    clearMessages();
    setMode('login');
    setLoginId('admin_user');
    setPassword('Admin@123');
  };

  const fillDemoStaff = () => {
    clearMessages();
    setMode('login');
    setLoginId('staff_user');
    setPassword('Staff@123');
  };

  // 1. SIGN IN (Wireframe Login Logic)
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await login(loginId, password);
    } catch (err) {
      // Wireframe exact requirement: If Creds does not match throw error msg: "Invalid Login Id or Password"
      setError(err.message.includes('Invalid') ? 'Invalid Login Id or Password' : err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. SIGN UP (Wireframe Sign up Logic with 3 Validation Rules)
  const handleRegister = async (e) => {
    e.preventDefault();
    clearMessages();

    // Rule 1: Login ID unique and 6-12 chars
    if (loginId.trim().length < 6 || loginId.trim().length > 12) {
      setError('Login ID must be in between 6-12 characters.');
      return;
    }

    // Rule 2: Re-enter Password confirmation
    if (password !== rePassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    // Rule 3: Password > 8 chars, lowercase, uppercase, special char
    if (password.length <= 8) {
      setError('Password length should be more than 8 characters.');
      return;
    }
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasLower || !hasUpper || !hasSpecial) {
      setError('Password must contain a small case, a large case and a special character.');
      return;
    }

    setLoading(true);
    try {
      await register(loginId.trim(), email.trim(), password, 'Inventory Manager', loginId.trim());
      setSuccessMsg('Account created successfully! Redirecting...');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. FORGOT PASSWORD (OTP Request)
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const res = await requestOtp(email || loginId);
      setSuccessMsg(res.message);
      if (res.demoOtp) {
        setDemoOtpCode(res.demoOtp);
        setOtp(res.demoOtp);
      }
      setMode('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. RESET PASSWORD (OTP Verification)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (newPassword.length <= 8) {
      setError('New password length must be more than 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(email || loginId, otp, newPassword);
      setSuccessMsg(res.message);
      setMode('login');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/20 to-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient red glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Crisp White Card with Subtle Crimson Shadow */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-red-500/5 p-8 relative z-10">
        {/* App Logo & Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3">
            <StockSenseLogo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {mode === 'signup' ? 'Sign up Page' : mode === 'forgot' || mode === 'reset' ? 'Reset Password' : 'Login Page'}
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            StockSense Modular Inventory Management System
          </p>
        </div>

        {/* Demo Fast Fillers in Crisp Red & White Style */}
        <div className="mb-5 p-3 rounded-2xl bg-red-50/50 border border-red-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="flex items-center gap-1 font-bold text-red-700 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              Demo Credentials:
            </span>
            <span className="text-[10px] text-slate-400 font-medium">1-click fill</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillDemoManager}
              className="text-left px-3 py-2 rounded-xl bg-white hover:bg-red-50 border border-red-200/70 shadow-xs transition text-xs group"
            >
              <div className="font-bold text-slate-900 group-hover:text-red-600 transition text-xs">admin_user</div>
              <div className="text-[10px] font-medium text-emerald-600">Inventory Manager</div>
            </button>
            <button
              type="button"
              onClick={fillDemoStaff}
              className="text-left px-3 py-2 rounded-xl bg-white hover:bg-red-50 border border-red-200/70 shadow-xs transition text-xs group"
            >
              <div className="font-bold text-slate-900 group-hover:text-red-600 transition text-xs">staff_user</div>
              <div className="text-[10px] font-medium text-slate-500">Warehouse Staff</div>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {demoOtpCode && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between">
            <span className="font-medium">Demo Reset OTP:</span>
            <span className="font-mono font-bold text-sm bg-white px-2.5 py-0.5 rounded-lg border border-red-300 text-red-600 shadow-xs">
              {demoOtpCode}
            </span>
          </div>
        )}

        {/* 1. LOGIN PAGE FORM (Exact wireframe: Login Id, Password, SIGN IN, Forget Password? | Sign Up) */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Login Id
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="admin_user or admin@stocksense.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-3 focus:ring-red-500/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-3 focus:ring-red-500/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition transform active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>SIGN IN</span>}
            </button>

            {/* Wireframe Links: Forget Password ? | Sign Up */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('forgot'); }}
                className="text-slate-500 hover:text-red-600 font-medium transition cursor-pointer"
              >
                Forget Password ?
              </button>
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('signup'); }}
                className="text-red-600 hover:text-red-700 font-bold transition cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGN UP PAGE FORM (Exact wireframe: Enter Login Id, Enter Email Id, Enter Password, Re-Enter Password, SIGN UP) */}
        {mode === 'signup' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Login Id <span className="text-slate-400 font-normal text-[10px]">(6-12 chars, unique)</span>
              </label>
              <input
                type="text"
                required
                minLength={6}
                maxLength={12}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="e.g. manager12"
                className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-3 focus:ring-red-500/10 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Email Id
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-3 focus:ring-red-500/10 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Password <span className="text-slate-400 font-normal text-[10px]">(&gt;8 chars, a-z, A-Z, special)</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. Secret@123"
                className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-3 focus:ring-red-500/10 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Re-Enter Password
              </label>
              <input
                type="password"
                required
                value={rePassword}
                onChange={(e) => setRePassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-3 focus:ring-red-500/10 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>SIGN UP</span>}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { clearMessages(); setMode('login'); }}
                className="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Already have an account? <span className="text-red-600 font-bold">Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD (OTP) */}
        {mode === 'forgot' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-slate-600">
              Enter your registered Email Id or Login Id to receive a 6-digit OTP verification code.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Login Id or Email Id
              </label>
              <input
                type="text"
                required
                value={email || loginId}
                onChange={(e) => { setEmail(e.target.value); setLoginId(e.target.value); }}
                placeholder="admin@stocksense.com"
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white focus:ring-3 focus:ring-red-500/10 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold tracking-wide uppercase transition shadow-lg shadow-red-600/30 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>SEND OTP</span>}
            </button>

            <button
              type="button"
              onClick={() => { clearMessages(); setMode('login'); }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              ← Back to Login Page
            </button>
          </form>
        )}

        {/* 4. RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Enter 6-Digit OTP Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full text-center font-mono text-xl font-bold tracking-widest py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-red-600 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Enter New Password <span className="text-slate-400 font-normal text-[10px]">(&gt;8 chars)</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold tracking-wide uppercase transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>UPDATE PASSWORD</span>}
            </button>

            <button
              type="button"
              onClick={() => { clearMessages(); setMode('login'); }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              ← Cancel and Back to Login Page
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
