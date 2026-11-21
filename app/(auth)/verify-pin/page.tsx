'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    Scale,
    Lock,
    AlertCircle,
    ShieldCheck,
    KeyRound,
    ArrowLeft,
    Eye,
    EyeOff,
    Loader2,
    LogOut,
    Fingerprint,
} from 'lucide-react';
import Link from 'next/link';

export default function VerifyPinPage() {
    const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentYear, setCurrentYear] = useState<number>(2026);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const router = useRouter();

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                localStorage.removeItem('chamber_auth_active');
                sessionStorage.removeItem('chamber_pin_verified');
                router.push('/login');
                return;
            }
            // මෙම tab එකේ දැනටමත් PIN එක verify කර ඇත්නම් dashboard වෙත යවන්න
            if (sessionStorage.getItem('chamber_pin_verified') === 'true') {
                router.replace('/dashboard');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const pin = digits.join('');

    const verifyPinValue = async (pinToVerify: string) => {
        setError('');

        if (pinToVerify.length !== 6) {
            return setError('PIN must be exactly 6 digits.');
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return router.push('/login');

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const dbPin = userDoc.data()?.pin;

            if (dbPin === pinToVerify) {
                localStorage.setItem('chamber_auth_active', 'true');
                sessionStorage.setItem('chamber_pin_verified', 'true');
                router.push('/dashboard');
            } else {
                setError('Incorrect PIN. Please check your 6-digit code and try again.');
                setDigits(Array(6).fill(''));
                inputRefs.current[0]?.focus();
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        await verifyPinValue(pin);
    };

    const handleDigitChange = (index: number, value: string) => {
        const numeric = value.replace(/\D/g, '');
        if (!numeric) {
            const updated = [...digits];
            updated[index] = '';
            setDigits(updated);
            return;
        }

        const updated = [...digits];
        const chars = numeric.slice(0, 6 - index).split('');
        chars.forEach((char, offset) => {
            updated[index + offset] = char;
        });
        setDigits(updated);
        setError('');

        const nextIndex = Math.min(index + chars.length, 5);
        inputRefs.current[nextIndex]?.focus();

        const completedPin = updated.join('');
        if (completedPin.length === 6 && !loading) {
            verifyPinValue(completedPin);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (digits[index]) {
                const updated = [...digits];
                updated[index] = '';
                setDigits(updated);
            } else if (index > 0) {
                const updated = [...digits];
                updated[index - 1] = '';
                setDigits(updated);
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;

        const updated = Array(6).fill('');
        pasted.split('').forEach((char, idx) => {
            updated[idx] = char;
        });
        setDigits(updated);
        setError('');

        const focusIndex = Math.min(pasted.length, 5);
        inputRefs.current[focusIndex]?.focus();

        if (pasted.length === 6 && !loading) {
            verifyPinValue(pasted);
        }
    };

    const handleSwitchAccount = async () => {
        localStorage.removeItem('chamber_auth_active');
        sessionStorage.removeItem('chamber_pin_verified');
        await signOut(auth);
        router.push('/login');
    };

    const securitySteps = [
        {
            icon: Fingerprint,
            title: 'Two-Factor Chamber Guard',
            description: 'Protects sensitive client records even on shared workstations',
        },
        {
            icon: KeyRound,
            title: '6-Digit Numeric Verification',
            description: 'Instant keyboard & paste support for quick chamber entry',
        },
        {
            icon: ShieldCheck,
            title: 'Session Integrity',
            description: 'Encrypted workspace access with automatic audit tracking',
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141b22] p-4 sm:p-6 transition-colors">
            <div className="w-full max-w-5xl bg-white dark:bg-[#232e39] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-700/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                {/* Left Brand & Security Panel */}
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
                            Chamber Vault Verification.
                        </h2>
                        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                            Your credentials have been verified. Enter your personal 6-digit
                            security PIN to unlock confidential case files and court diaries.
                        </p>

                        <div className="mt-8 space-y-3.5">
                            {securitySteps.map(({ icon: Icon, title, description }) => (
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

                {/* Right PIN Verification Form */}
                <main className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
                    {/* Top Navigation Bar */}
                    <div className="flex items-center justify-between mb-6">
                        <button
                            type="button"
                            onClick={handleSwitchAccount}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#182028] dark:hover:bg-[#1e2832] border border-slate-200/80 dark:border-slate-700/70 transition cursor-pointer"
                        >
                            <ArrowLeft size={15} />
                            Back to Login
                        </button>

                        <button
                            type="button"
                            onClick={handleSwitchAccount}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
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
                            <Lock size={20} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#232e39] dark:text-white tracking-tight">
                            Security Verification
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Enter your 6-digit security PIN to unlock the chamber dashboard
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

                    <form onSubmit={handleVerify} className="space-y-6">
                        {/* 6-Digit PIN Boxes */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label
                                    htmlFor="pin-digit-0"
                                    className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                >
                                    6-Digit Security PIN
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPin((prev) => !prev)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#232e39] dark:hover:text-white transition cursor-pointer"
                                >
                                    {showPin ? (
                                        <>
                                            <EyeOff size={14} /> Hide PIN
                                        </>
                                    ) : (
                                        <>
                                            <Eye size={14} /> Show PIN
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="grid grid-cols-6 gap-2.5 sm:gap-3.5">
                                {digits.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`pin-digit-${index}`}
                                        ref={(el) => {
                                            inputRefs.current[index] = el;
                                        }}
                                        type={showPin ? 'text' : 'password'}
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={1}
                                        value={digit}
                                        disabled={loading}
                                        aria-label={`PIN digit ${index + 1}`}
                                        onChange={(e) => handleDigitChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={handlePaste}
                                        className="w-full h-14 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono bg-slate-50/80 dark:bg-[#182028] border border-slate-300 dark:border-slate-600/80 rounded-2xl text-[#232e39] dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-[#1a232c] focus:border-[#232e39] dark:focus:border-slate-300 focus:ring-4 focus:ring-slate-500/15 transition disabled:opacity-60"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || pin.length !== 6}
                            className="w-full py-3.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={17} className="animate-spin" />
                                    Verifying PIN...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={18} />
                                    Unlock Chamber Dashboard
                                </>
                            )}
                        </button>

                        {/* Forgot PIN Link */}
                        <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
                            <span className="text-slate-500 dark:text-slate-400">
                                Trouble accessing your vault?
                            </span>
                            <Link
                                href="/forgot-pin"
                                className="font-extrabold text-[#232e39] dark:text-white hover:underline"
                            >
                                Forgot PIN?
                            </Link>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}