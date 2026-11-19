'use client';

import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Scale,
    User,
    Building2,
    Mail,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    Users,
    Briefcase,
    Loader2,
} from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState('');
    const [firmName, setFirmName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentYear, setCurrentYear] = useState<number>(2026);

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
    }, []);

    const passwordsMismatch =
        confirmPassword.length > 0 && password !== confirmPassword;

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            return setError('Passwords do not match. Please re-enter and try again.');
        }

        setLoading(true);

        try {
            // 1. Create User in Firebase Auth
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCred.user.uid;

            // 2. Create the Law Firm document
            const firmRef = await addDoc(collection(db, 'lawFirms'), {
                name: firmName.trim(),
                ownerId: uid,
                createdAt: new Date().toISOString(),
            });

            // 3. Create the User Profile in Firestore
            await setDoc(doc(db, 'users', uid), {
                email: email.trim(),
                name: name.trim(),
                role: 'LAWYER', // Primary owner role
                firmId: firmRef.id,
                permissions: [
                    'cases.read',
                    'cases.write',
                    'tasks.read',
                    'tasks.write',
                    'staff.manage',
                    'sms.send',
                ],
                isFirstLogin: false, // Owner sets their password right away
                pin: null, // Still needs to set a PIN
                createdAt: new Date().toISOString(),
            });

            router.push('/setup-pin'); // Redirect to set up their 6-digit PIN
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Try signing in instead.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use at least 8 characters.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        {
            icon: Building2,
            title: '1. Create Chamber Profile',
            description: 'Set up your firm workspace and principal lawyer account',
        },
        {
            icon: ShieldCheck,
            title: '2. Configure 6-Digit PIN',
            description: 'Add a second security layer for sensitive case access',
        },
        {
            icon: Users,
            title: '3. Onboard Your Team',
            description: 'Invite junior lawyers and clerks with custom permissions',
        },
    ];

    const inputStyle =
        'w-full pl-11 pr-4 py-3.5 bg-slate-50/70 dark:bg-[#182028] border border-slate-300 dark:border-slate-600/80 rounded-xl text-sm font-medium text-[#232e39] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-[#1a232c] focus:border-[#232e39] dark:focus:border-slate-300 focus:ring-4 focus:ring-slate-500/15 transition';

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141b22] p-4 sm:p-6 transition-colors">
            <div className="w-full max-w-5xl bg-white dark:bg-[#232e39] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-700/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                {/* Left Brand & Onboarding Panel */}
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
                            Launch Your Digital Chamber.
                        </h2>
                        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                            Register your law firm in minutes and manage cases, court diaries,
                            staff permissions, and client SMS updates in one secure workspace.
                        </p>

                        <div className="mt-8 space-y-3.5">
                            {steps.map(({ icon: Icon, title, description }) => (
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

                {/* Right Registration Form */}
                <main className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
                    {/* Top Back to Home Action */}
                    <div className="flex items-center justify-between mb-6">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#182028] dark:hover:bg-[#1e2832] border border-slate-200/80 dark:border-slate-700/70 transition"
                        >
                            <ArrowLeft size={15} />
                            Back to Home
                        </Link>

                        <Link
                            href="/login"
                            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#232e39] dark:hover:text-white transition"
                        >
                            Staff Login →
                        </Link>
                    </div>

                    {/* Mobile Brand Header */}
                    <div className="flex lg:hidden flex-col items-center mb-5">
                        <div className="w-12 h-12 bg-[#232e39] dark:bg-[#3e5063] text-white rounded-2xl flex items-center justify-center shadow-md mb-2.5">
                            <Scale size={24} />
                        </div>
                        <span className="text-lg font-black tracking-tight text-[#232e39] dark:text-white">
                            Chamber<span className="text-slate-500 dark:text-slate-300">Cript</span>
                        </span>
                    </div>

                    <div className="mb-6 text-center lg:text-left">
                        <h1 className="text-2xl sm:text-3xl font-black text-[#232e39] dark:text-white tracking-tight">
                            Register Law Firm
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Create your principal lawyer account to initialize your chamber
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-5 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 rounded-2xl flex items-start gap-3"
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

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div>
                                <label
                                    htmlFor="fullName"
                                    className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2"
                                >
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        id="fullName"
                                        type="text"
                                        autoComplete="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="A. B. Perera, AAL"
                                        className={inputStyle}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Law Firm Name */}
                            <div>
                                <label
                                    htmlFor="firmName"
                                    className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2"
                                >
                                    Law Firm / Chamber Name
                                </label>
                                <div className="relative">
                                    <Building2
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        id="firmName"
                                        type="text"
                                        autoComplete="organization"
                                        value={firmName}
                                        onChange={(e) => setFirmName(e.target.value)}
                                        placeholder="Perera & Associates"
                                        className={inputStyle}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email Address */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2"
                            >
                                Official Email Address
                            </label>
                            <div className="relative">
                                <Mail
                                    size={17}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="counsel@firm.lk"
                                    className={inputStyle}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password & Confirm Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Password */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label
                                        htmlFor="password"
                                        className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                    >
                                        Password
                                    </label>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                        Min. 8 chars
                                    </span>
                                </div>
                                <div className="relative">
                                    <Lock
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        minLength={8}
                                        className={`${inputStyle} pr-11`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#232e39] dark:hover:text-white transition cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label
                                        htmlFor="confirmPassword"
                                        className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                    >
                                        Confirm Password
                                    </label>
                                    {passwordsMismatch && (
                                        <span className="text-[10px] font-bold text-rose-500">
                                            Does not match
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        minLength={8}
                                        className={`${inputStyle} pr-11 ${
                                            passwordsMismatch
                                                ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/15'
                                                : ''
                                        }`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        aria-label={
                                            showConfirmPassword
                                                ? 'Hide confirm password'
                                                : 'Show confirm password'
                                        }
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#232e39] dark:hover:text-white transition cursor-pointer"
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={17} />
                                        ) : (
                                            <Eye size={17} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || passwordsMismatch}
                            className="w-full py-3.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={17} className="animate-spin" />
                                    Creating Chamber Account...
                                </>
                            ) : (
                                <>
                                    <Briefcase size={17} />
                                    Register Firm &amp; Continue
                                    <ArrowRight size={17} />
                                </>
                            )}
                        </button>

                        {/* Sign In Link */}
                        <p className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-300 pt-2">
                            Already registered your chamber?{' '}
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