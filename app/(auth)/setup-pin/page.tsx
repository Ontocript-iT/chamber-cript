'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
    Scale,
    KeyRound,
    AlertCircle,
    CheckCircle2,
    ArrowLeft,
    ShieldCheck,
    Eye,
    EyeOff,
    Loader2,
    Fingerprint,
    Lock,
    LogOut,
} from 'lucide-react';
import Link from 'next/link';

export default function SetupPinPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPins, setShowPins] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [currentYear, setCurrentYear] = useState<number>(2026);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/login');
            } else {
                setCurrentUser(user);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const pinsMismatch = confirmPin.length > 0 && pin !== confirmPin;

    const handleSetupPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (pin.length !== 6 || !/^\d+$/.test(pin)) {
            return setError('PIN must be exactly 6 digits.');
        }
        if (pin !== confirmPin) {
            return setError('Entered PINs do not match. Please try again.');
        }

        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Unable to identify authenticated user.');
            }

            // Note: In production, consider hashing PINs server-side before storage.
            await updateDoc(doc(db, 'users', user.uid), {
                pin,
            });

            setSuccess('Your 6-digit security PIN has been set! Redirecting to dashboard...');
            setTimeout(() => {
                router.push('/dashboard');
            }, 1200);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save PIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut(auth);
        router.push('/login');
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141b22]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-[#232e39] dark:text-slate-200" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Preparing Vault Setup...
                    </p>
                </div>
            </div>
        );
    }

    const setupBenefits = [
        {
            icon: Fingerprint,
            title: 'Fast Chamber Unlock',
            description: 'Use a 6-digit PIN after password login for quick daily entry',
        },
        {
            icon: Lock,
            title: 'Confidential Case Protection',
            description: 'Keeps client files and chamber records shielded on shared devices',
        },
        {
            icon: ShieldCheck,
            title: 'Recoverable Anytime',
            description: 'Reset your PIN anytime by re-verifying your account password',
        },
    ];

    const pinInputStyle =
        'w-full text-center tracking-[0.45em] font-mono text-base font-black py-3.5 bg-slate-50/70 dark:bg-[#182028] border border-slate-300 dark:border-slate-600/80 rounded-xl text-[#232e39] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-[#1a232c] focus:border-[#232e39] dark:focus:border-slate-300 focus:ring-4 focus:ring-slate-500/15 transition';

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
                            Secure Your Chamber Vault.
                        </h2>
                        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                            Set up a personal 6-digit security PIN to complete your onboarding and
                            protect access to your firm&apos;s cases and records.
                        </p>

                        <div className="mt-8 space-y-3.5">
                            {setupBenefits.map(({ icon: Icon, title, description }) => (
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

                {/* Right Setup PIN Form */}
                <main className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
                    {/* Top Navigation Bar */}
                    <div className="flex items-center justify-between mb-6">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#182028] dark:hover:bg-[#1e2832] border border-slate-200/80 dark:border-slate-700/70 transition"
                        >
                            <ArrowLeft size={15} />
                            Back to Home
                        </Link>

                        <button
                            type="button"
                            onClick={handleSignOut}
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
                            <KeyRound size={20} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#232e39] dark:text-white tracking-tight">
                            Set Security PIN
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Create a 6-digit numeric PIN to unlock your chamber dashboard
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

                    <form onSubmit={handleSetupPin} className="space-y-5">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                    6-Digit Security PIN
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowPins((prev) => !prev)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#232e39] dark:hover:text-white transition cursor-pointer"
                                >
                                    {showPins ? (
                                        <>
                                            <EyeOff size={14} /> Hide PINs
                                        </>
                                    ) : (
                                        <>
                                            <Eye size={14} /> Show PINs
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="setup-pin"
                                        className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5"
                                    >
                                        New PIN
                                    </label>
                                    <input
                                        id="setup-pin"
                                        type={showPins ? 'text' : 'password'}
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="••••••"
                                        className={pinInputStyle}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label
                                            htmlFor="setup-confirm-pin"
                                            className="block text-[11px] font-bold text-slate-500 dark:text-slate-400"
                                        >
                                            Confirm PIN
                                        </label>
                                        {pinsMismatch && (
                                            <span className="text-[10px] font-bold text-rose-500">
                                                Does not match
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        id="setup-confirm-pin"
                                        type={showPins ? 'text' : 'password'}
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="••••••"
                                        className={`${pinInputStyle} ${
                                            pinsMismatch
                                                ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/15'
                                                : ''
                                        }`}
                                        value={confirmPin}
                                        onChange={(e) =>
                                            setConfirmPin(e.target.value.replace(/\D/g, ''))
                                        }
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success !== '' || pinsMismatch}
                            className="w-full py-3.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={17} className="animate-spin" />
                                    Saving Security PIN...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={18} />
                                    Save PIN &amp; Continue
                                </>
                            )}
                        </button>
                    </form>
                </main>
            </div>
        </div>
    );
}