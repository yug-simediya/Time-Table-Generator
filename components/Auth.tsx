
import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser, loginAsGuest, loginWithGoogle, sendPasswordReset } from '../services/dataService';
import { ArrowRight, UserPlus, LogIn, Loader2, UserCircle, KeyRound, CalendarCheck } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

const Auth: React.FC<Props> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      if (isForgot) {
        await sendPasswordReset(email);
        setSuccess('Password reset email sent! Check your inbox.');
        setIsLoading(false);
        return;
      }

      let user;
      if (isLogin) {
        user = await loginUser(email, password);
      } else {
        if (!name) {
             setIsLoading(false);
             return setError('Name is required');
        }
        user = await registerUser(name, email, password);
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const user = await loginWithGoogle();
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    const user = loginAsGuest();
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4 relative overflow-hidden">
       {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-lime/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[100px]"></div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10 animate-fade-in hover-interactive">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-lime/10 border border-brand-lime flex items-center justify-center mx-auto mb-4 shadow-glow">
             <CalendarCheck size={32} className="text-brand-lime" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Easy<span className="text-brand-lime">Sched</span></h1>
          <p className="text-brand-muted">
            {isForgot 
              ? 'Reset your password.' 
              : isLogin 
                ? 'Welcome back! Login to continue.' 
                : 'Create an account to get started.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isForgot && (
            <div>
              <label className="block text-xs font-bold text-brand-muted mb-1 ml-1 uppercase">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none transition-all"
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-brand-muted mb-1 ml-1 uppercase">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none transition-all"
              placeholder="you@school.edu"
              disabled={isLoading}
            />
          </div>

          {!isForgot && (
            <div>
              <label className="block text-xs font-bold text-brand-muted mb-1 ml-1 uppercase">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#27272a] rounded-xl px-4 py-3 text-white focus:border-brand-lime outline-none transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>
          )}

          {error && <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg border border-red-900/50">{error}</div>}
          {success && <div className="text-green-400 text-sm text-center bg-green-900/20 p-2 rounded-lg border border-green-900/50">{success}</div>}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-brand-lime hover:bg-brand-limeDark disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl shadow-glow transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : isForgot ? (
              <>
                <KeyRound size={20} /> Send Reset Link
              </>
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                {isLogin ? 'Login' : 'Create Account'}
              </>
            )}
          </button>
        </form>
        
        {!isForgot && (
          <>
            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#27272a]"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#121212] px-4 text-brand-muted">Or continue with</span>
                </div>
            </div>

            <div className="space-y-3 mb-6">
              <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                 <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24-1.19-.6z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                 </svg>
                 Sign in with Google
              </button>

              <button 
                onClick={handleGuestAccess}
                disabled={isLoading}
                className="w-full bg-[#18181b] hover:bg-[#27272a] text-white font-medium py-3 rounded-xl border border-[#27272a] transition-all flex items-center justify-center gap-2"
              >
                <UserCircle size={20} className="text-brand-lime" />
                Continue as Guest
              </button>
            </div>
          </>
        )}

        <div className="mt-4 text-center space-y-2">
          {isLogin && !isForgot && (
             <button 
                onClick={() => { setIsForgot(true); setError(''); setSuccess(''); }}
                disabled={isLoading}
                className="text-sm text-brand-lime hover:text-white transition-colors block mx-auto"
              >
                Forgot Password?
              </button>
          )}

          <button 
            onClick={() => { setIsLogin(!isLogin); setIsForgot(false); setError(''); setSuccess(''); }}
            disabled={isLoading}
            className="text-brand-muted hover:text-white text-sm transition-colors flex items-center justify-center gap-1 mx-auto"
          >
            {isForgot ? "Back to Login" : (isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login")}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
