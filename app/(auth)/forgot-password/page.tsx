'use client';

import { useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import {
    Scale,
    Mail,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    Send,
    KeyRound,
    ShieldCheck,
    MailCheck,
    Loader2,
} from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentYear, setCurrentYear] = useState<number>(2026);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, email.trim());
            setSuccess(
                `Password reset instructions have been sent to ${email.trim()}. Please check your inbox and spam folder.`
            );
            setEmail('');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/user-not-found') {
                setError('No chamber account was found with that email address.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many reset requests. Please wait a few minutes and try again.');
            } else {
                setError(err.message || 'Unable to send password reset email.');
            }
        } finally {
            setLoading(false);
        }
    };

    const recoverySteps = [
        {
            icon: Mail,
            title: '1. Enter Registered Email',
            description: 'Provide the official email linked to your chamber profile',
        },
        {
            icon: MailCheck,
            title: '2. Open Verification Link',
            description: 'Follow the secure one-time recovery link sent to your inbox',
        },
        {
            icon: ShieldCheck,
            title: '3. Set New Credentials',
            description: 'Create a strong password and sign back in with your PIN',
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141b22] p-4 sm:p-6 transition-colors">
            <div className="w-full max-w-5xl bg-white dark:bg-[#232e39] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-700/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                {/* Left Brand & Recovery Steps Panel */}
                <aside className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#232e39] via-[#2e3c4a] to-[#3e5063] text-white p-10 flex-col justify-between relative overflow-hidden">
                    <Scale
                        size={250}
                        className="absolute -right-14 -bottom-14 opacity-[0.05] pointer-events-none"
                        aria-hidden="true"
                    />

                    <div className="relative z-10">
                        <Link href="/" className="inline-flex items-center gap-3 mb-9">
                            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                                <Scale size={22} className="text-white" />
                            </div>
                            <span className="text-xl font-black tracking-tight">
                                Chamber<span className="text-slate-300">Cript</span>
                            </span>
                        </Link>

                        <h2 className="text-3xl font-black leading-tight tracking-tight">
                            Account Recovery, Secured.
                        </h2>
                        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                            Locked out of your chamber workspace? Reset your password securely
                            while keeping your firm&apos;s PIN and role protections intact.
                        </p>

                        <div className="mt-8 space-y-3.5">
                            {recoverySteps.map(({ icon: Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="flex items-center gap-3.5 bg-white/[0.06] border border-white/10 rounded-2xl p-3.5"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                                        <Icon size={17} className="text-slate-200" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-extrabold text-white">{title}</p>
                                        <p className="text-[11px] text-slate-300">{description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="relative z-10 text-[11px] text-slate-400 font-medium pt-8">
                        © {currentYear} ChamberCript. Protected Chamber Access.
                    </p>
                </aside>

                {/* Right Reset Form */}
                <main className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
                    {/* Top Navigation Bar */}
                    <div className="flex items-center justify-between mb-6">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#182028] dark:hover:bg-[#1e2832] border border-slate-200/80 dark:border-slate-700/70 transition"
                        >
                            <ArrowLeft size={15} />
                            Back to Login
                        </Link>

                        <Link
                            href="/"
                            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#232e39] dark:hover:text-white transition"
                        >
                            Home →
                        </Link>
                    </div>

                    {/* Mobile Header */}
                    <div className="flex lg:hidden flex-col items-center mb-6">
                        <div className="w-13 h-13 bg-[#232e39] dark:bg-[#3e5063] text-white rounded-2xl flex items-center justify-center shadow-md mb-3">
                            <Scale size={26} />
                        </div>
                        <span className="text-lg font-black tracking-tight text-[#232e39] dark:text-white">
                            Chamber<span className="text-slate-500 dark:text-slate-300">Cript</span>
                        </span>
                    </div>

                    {/* Icon Badge & Heading */}
                    <div className="mb-7 text-center lg:text-left">
                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 dark:bg-[#182028] border border-slate-200 dark:border-slate-700/70 text-[#232e39] dark:text-slate-200 mb-4">
                            <KeyRound size={20} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#232e39] dark:text-white tracking-tight">
                            Reset Password
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Enter your email address and we&apos;ll send you a secure reset link
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div
                            role="alert"
                            className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 rounded-2xl flex items-start gap-3"
                        >
                            <AlertCircle
                                size={18}
                                className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                            />
                            <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-semibold">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Success Alert */}
                    {success && (
                        <div
                            role="status"
                            className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl flex items-start gap-3"
                        >
                            <CheckCircle2
                                size={18}
                                className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                            />
                            <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                                {success}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleReset} className="space-y-5">
                        {/* Email Field */}
                        <div>
                            <label
                                htmlFor="reset-email"
                                className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2"
                            >
                                Registered Email Address
                            </label>
                            <div className="relative">
                                <Mail
                                    size={17}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    id="reset-email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@firm.lk"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 dark:bg-[#182028] border border-slate-300 dark:border-slate-600/80 rounded-xl text-sm font-medium text-[#232e39] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-[#1a232c] focus:border-[#232e39] dark:focus:border-slate-300 focus:ring-4 focus:ring-slate-500/15 transition"
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={17} className="animate-spin" />
                                    Sending Reset Link...
                                </>
                            ) : (
                                <>
                                    <Send size={16} />
                                    Send Reset Link
                                </>
                            )}
                        </button>

                        {/* Secondary Footer Link */}
                        <p className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-2">
                            Remembered your password?{' '}
                            <Link
                                href="/login"
                                className="font-extrabold text-[#232e39] dark:text-white hover:underline"
                            >
                                Sign In
                            </Link>
                        </p>
                    </form>
                </main>
            </div>
        </div>
    );
}