import React, { useState } from 'react';
import { User as FirebaseUser, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface LoginViewProps {
  user: FirebaseUser | null;
  onBack: () => void;
  onSuccess?: () => void;
  onNavigateToTerms: () => void;
  onNavigateToPrivacy: () => void;
  initialMode?: 'signin' | 'signup';
}

export const LoginView: React.FC<LoginViewProps> = ({
  user,
  onBack,
  onSuccess,
  onNavigateToTerms,
  onNavigateToPrivacy,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await signInWithPopup(auth, googleProvider);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked by your browser. Please allow popups for ekiboozi.com and try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('Network connection error. Please check your internet connection.');
      } else {
        setErrorMessage(err.message || 'Unable to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-[#14171A] text-[#F3F1EA] py-12 px-4 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Subtle Warm Background Glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[360px] bg-[#F2B705]/8 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="w-full max-w-[420px] mx-auto relative z-10">
        {/* Back Link */}
        <div className="mb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#9BA1A8] hover:text-[#F3F1EA] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#1D2126] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Ekiboozi</span>
          </button>
        </div>

        {/* Card Surface */}
        <div className="bg-[#1D2126] border border-[#2E353D] rounded-2xl p-7 sm:p-9 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          {user ? (
            /* --- Signed In State --- */
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full ring-2 ring-[#F2B705]/60 p-0.5 relative">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#F2B705] text-[#14171A] font-extrabold flex items-center justify-center text-xl">
                    {user.displayName?.[0] || user.email?.[0] || 'U'}
                  </div>
                )}
                <div
                  className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#1D2126]"
                  title="Active"
                />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#F3F1EA]">
                  {user.displayName || 'Ekiboozi Member'}
                </h2>
                <p className="text-[13px] text-[#9BA1A8] mt-1 break-all">
                  {user.email}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Signed in with Google</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-full py-3 px-4 rounded-xl bg-[#F2B705] hover:bg-[#ffc61a] active:scale-[0.99] text-[#14171A] font-bold text-[14px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Continue to Home</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-[#252B32] text-[#9BA1A8] hover:text-[#E14545] font-medium text-[13px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out / Switch account</span>
                </button>
              </div>

              {/* Terms Link */}
              <div className="pt-4 border-t border-[#2E353D] text-[12px] text-[#7E868E]">
                <span>Review our </span>
                <button
                  type="button"
                  onClick={onNavigateToTerms}
                  className="text-[#F2B705] hover:underline font-semibold cursor-pointer"
                >
                  Terms & Conditions
                </button>
                <span> and </span>
                <button
                  type="button"
                  onClick={onNavigateToPrivacy}
                  className="text-[#F2B705] hover:underline font-semibold cursor-pointer"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          ) : (
            /* --- Sign In / Sign Up State --- */
            <div className="space-y-6">
              {/* Brand Icon & Heading */}
              <div className="text-center">
                <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-br from-[#F2B705] to-[#E8890C] items-center justify-center shadow-md mb-4 shadow-[#F2B705]/15">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                    <path d="M8 5v14l12-7L8 5z" fill="#14171A" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#F3F1EA]">
                  {mode === 'signin' ? 'Welcome back' : 'Join Ekiboozi'}
                </h2>
                <p className="text-[13px] text-[#9BA1A8] mt-1.5">
                  {mode === 'signin'
                    ? 'Sign in to access your subscriptions and creator studio'
                    : 'Create your free account to watch, upload, and support creators'}
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex p-1 bg-[#14171A] border border-[#2E353D] rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-[#252B32] text-[#F3F1EA] shadow-sm'
                      : 'text-[#848B92] hover:text-[#F3F1EA]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-[#252B32] text-[#F3F1EA] shadow-sm'
                      : 'text-[#848B92] hover:text-[#F3F1EA]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Primary Google Auth Action Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.99] text-[#1F1F1F] font-semibold text-[14px] transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-[#444746]">
                      <div className="w-4 h-4 border-2 border-[#444746] border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>
                        {mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-[#7E868E]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F2B705]" />
                  <span>Secure 256-bit Google authentication</span>
                </div>
              </div>

              {/* Dedicated Terms & Conditions Link Section */}
              <div className="pt-4 border-t border-[#2E353D] space-y-3">
                <p className="text-[12px] text-[#848B92] leading-relaxed text-center">
                  By continuing, you agree to Ekiboozi's{' '}
                  <button
                    type="button"
                    onClick={onNavigateToTerms}
                    className="text-[#F2B705] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <span>Terms & Conditions</span>
                    <ExternalLink className="w-3 h-3 inline ml-0.5 opacity-80" />
                  </button>{' '}
                  and acknowledge our{' '}
                  <button
                    type="button"
                    onClick={onNavigateToPrivacy}
                    className="text-[#F2B705] hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                  >
                    <span>Privacy Policy</span>
                  </button>.
                </p>

                {/* Direct quick action button to Terms */}
                <button
                  type="button"
                  onClick={onNavigateToTerms}
                  className="w-full py-2 px-3 rounded-lg bg-[#14171A] hover:bg-[#20252B] border border-[#2E353D] text-[12px] text-[#9BA1A8] hover:text-[#F3F1EA] transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <span>Read full dedicated Terms & Conditions</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#848B92] group-hover:text-[#F2B705] group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>

              {/* Mode switch prompt at bottom */}
              <div className="text-center text-xs text-[#848B92] pt-1">
                {mode === 'signin' ? (
                  <span>
                    New to Ekiboozi?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMessage(null);
                      }}
                      className="text-[#F2B705] hover:underline font-semibold cursor-pointer"
                    >
                      Create an account
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMessage(null);
                      }}
                      className="text-[#F2B705] hover:underline font-semibold cursor-pointer"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
