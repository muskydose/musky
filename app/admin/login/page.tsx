'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Leaf, Lock, Mail, ArrowRight, X, KeyRound, AlertCircle, Phone, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';

type RecoveryStep = 'MOBILE' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>('MOBILE');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null);
  
  // Resend OTP timer
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Invalid credentials provided');
      }
    } catch (err: any) {
      setError('Server connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: Request OTP for Admin Mobile
  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);

    try {
      const res = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileNumber }),
      });

      const data = await res.json();
      if (data.success) {
        setForgotMsg({ type: 'success', text: data.message });
        setResendTimer(data.resendCooldownSec || 60);
        setRecoveryStep('OTP');
      } else {
        setForgotMsg({
          type: data.deliveryStatus === 'PROVIDER_REQUIRED' ? 'info' : 'error',
          text: data.error || 'Failed to dispatch OTP to mobile number.',
        });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: 'Network or server error during OTP request.' });
    } finally {
      setForgotLoading(false);
    }
  };

  // STEP 2: Verify 6-digit OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);

    try {
      const res = await fetch('/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobileNumber, otp: otpCode }),
      });

      const data = await res.json();
      if (data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setForgotMsg({ type: 'success', text: 'OTP verified successfully. Set your new admin password.' });
        setRecoveryStep('NEW_PASSWORD');
      } else {
        setForgotMsg({ type: 'error', text: data.error || 'Invalid or expired OTP code.' });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: 'Network error verifying OTP code.' });
    } finally {
      setForgotLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotMsg(null);

    if (newPassword !== confirmPassword) {
      setForgotMsg({ type: 'error', text: 'Password confirmation does not match.' });
      setForgotLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setForgotMsg({ type: 'error', text: 'Password must be at least 8 characters with letters and numbers.' });
      setForgotLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setRecoveryStep('SUCCESS');
        setPassword(newPassword);
      } else {
        setForgotMsg({ type: 'error', text: data.error || 'Failed to reset admin password.' });
      }
    } catch (err: any) {
      setForgotMsg({ type: 'error', text: 'Network error executing password reset.' });
    } finally {
      setForgotLoading(false);
    }
  };

  const resetModalState = () => {
    setShowForgotModal(false);
    setRecoveryStep('MOBILE');
    setMobileNumber('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
    setForgotMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#0f2d22] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1b4332] rounded-3xl border border-[#c5a059]/30 p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center">
            <BrandLogo size="lg" className="bg-white/95 px-4 py-2 rounded-2xl shadow-md mx-auto" />
          </Link>
          <p className="text-xs text-[#c5a059] uppercase tracking-widest font-semibold">
            Admin Portal Access
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/80 border border-rose-500 text-rose-200 text-xs p-3.5 rounded-xl font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#b2c8be] font-semibold mb-1.5">
              Admin Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#c5a059] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@muskydose.in"
                className="w-full pl-10 pr-4 py-3 bg-[#0f2d22] border border-[#2d6a4f] rounded-xl text-white focus:outline-none focus:border-[#c5a059]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#b2c8be] font-semibold mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#c5a059] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 bg-[#0f2d22] border border-[#2d6a4f] rounded-xl text-white focus:outline-none focus:border-[#c5a059]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] py-3.5 rounded-xl font-extrabold text-xs tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>LOGIN TO DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-[#b2c8be] pt-2">
          <button
            type="button"
            onClick={() => {
              setShowForgotModal(true);
              setForgotMsg(null);
            }}
            className="hover:text-[#c5a059] underline text-[11px] cursor-pointer"
          >
            Forgot Admin Password?
          </button>
          <Link
            href="/"
            className="hover:text-white underline font-medium text-[11px]"
          >
            ← Public Website
          </Link>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1b4332] rounded-3xl border border-[#c5a059]/40 p-6 shadow-2xl space-y-4 relative text-xs text-center">
            <button
              onClick={resetModalState}
              className="absolute top-4 right-4 text-[#b2c8be] hover:text-white p-1 rounded-full hover:bg-[#0f2d22]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="font-serif-heading font-bold text-lg text-white">
              Password Recovery Notice
            </h3>

            <div className="p-4 rounded-xl bg-[#0f2d22] border border-[#2d6a4f] text-[#b2c8be] space-y-2 text-left">
              <p className="font-semibold text-amber-300">
                Password recovery via mobile OTP is temporarily unavailable.
              </p>
              <p className="text-[11px] leading-relaxed">
                Please contact the system administrator or store operator directly to reset or update your administrative login credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={resetModalState}
              className="w-full bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] py-3 rounded-xl font-extrabold transition-all cursor-pointer uppercase tracking-wider text-xs"
            >
              RETURN TO LOGIN
            </button>
          </div>
        </div>
      )}

    </div>
  );
}



