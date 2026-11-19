'use client';

import { useState, useRef, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import {
    Scale,
    Lock,
    Mail,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Eye,
    EyeOff,
    ShieldCheck,
    Briefcase,
    MessageSquare,
    Loader2,
} from 'lucide-react';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentYear, setCurrentYear] = useState<number>(2026);

    const [captchaVal, setCaptchaVal] = useState<string | null>(null);
    const recaptchaRef = useRef<ReCAPTCHA>(null);

    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    useEffect(() => {
        setCurrentYear(new Date().getFullYear());
    }, []);

    const resetCaptcha = () => {
        recaptchaRef.current?.reset();
        setCaptchaVal(null);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (recaptchaSiteKey && !captchaVal) {
            return setError('Please complete the reCAPTCHA verification.');
        }

        setLoading(true);

        const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
        const SUPER_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_SUPER_ADMIN_PASSWORD;

        try {
            if (
                SUPER_ADMIN_EMAIL &&
                SUPER_ADMIN_PASSWORD &&
                email === SUPER_ADMIN_EMAIL &&
                password === SUPER_ADMIN_PASSWORD
            ) {
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, password);

                    await setDoc(
                        doc(db, 'users', userCredential.user.uid),
                        {
                            name: 'System Super Admin',
                            email,
                            role: 'SUPER_ADMIN',
                            updatedAt: new Date().toISOString(),
                        },
                        { merge: true }
                    );

                    router.push('/superadmin');
                } catch (loginError: any) {
                    if (
                        loginError.code === 'auth/user-not-found' ||
                        loginError.code === 'auth/invalid-credential'
                    ) {
                        try {
                            const newUser = await createUserWithEmailAndPassword(auth, email, password);
                            await setDoc(doc(db, 'users', newUser.user.uid), {
                                name: 'System Super Admin',
                                email,
                                role: 'SUPER_ADMIN',
                                createdAt: new Date().toISOString(),
                            });
                            router.push('/superadmin');
                        } catch {
                            setError('Failed to create Super Admin account.');
                        }
                    } else {
                        setError('Super Admin login failed: ' + loginError.message);
                    }
                }
            } else {
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));

                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    if (userData.firmId && userData.role !== 'SUPER_ADMIN') {
                        const firmDoc = await getDoc(doc(db, 'firms', userData.firmId));
                        if (firmDoc.exists() && firmDoc.data().isActive === false) {
                            await auth.signOut();
                            throw new Error(
                                "Your Law Firm's account has been suspended. Contact Super Admin."
                            );
                        }
                    }

                    if (userData.role === 'SUPER_ADMIN') {
                        router.push('/superadmin');
                    } else if (userData.isFirstLogin) {
                        router.push('/change-password');
                    } else {
                        router.push('/verify-pin');
                    }
                } else {
                    router.push('/verify-pin');
                }
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError('Incorrect email or password. Please try again.');
            } else {
                setError(err.message || 'An error occurred during login.');
            }
            resetCaptcha();
        } finally {
            setLoading(false);
        }
    };

    const features = [
        {
            icon: Briefcase,
            title: 'Case & Diary Tracking',
            description: 'Real-time hearing timelines and overdue alerts',
        },
        {
            icon: MessageSquare,
            title: 'Automated Client SMS',
            description: 'Instant hearing and postponement notices',
        },
        {
            icon: ShieldCheck,
            title: 'Role-Based Security',
            description: 'PIN verification and complete audit logs',
        },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141b22] p-4 sm:p-6 transition-colors">
            <div className="w-full max-w-5xl bg-white dark:bg-[#232e39] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-700/60 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
                {/* Left Brand Panel */}
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
                            <span className="text-xl font-black tracking-widest">
                                LAW<span className="text-slate-300">PORTAL</span>
                            </span>
                        </Link>

                        <h2 className="text-3xl font-black leading-tight tracking-tight">
                            Practice Management, Simplified.
                        </h2>
                        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                            Securely manage client files, court diaries, staff delegations, and
                            automated client updates from one chamber workspace.
                        </p>

                        <div className="mt-8 space-y-3.5">
                            {features.map(({ icon: Icon, title, description }) => (
                                <div
                                    key={title}
                                    className="flex items-center gap-3.5 bg-white/[0.06] hover:bg-white/[0.09] border border-white/10 rounded-2xl p-3.5 transition"
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
                        © {currentYear} LawPortal. Protected Chamber Access.
                    </p>
                </aside>

                {/* Right Login Form */}
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

                        <Link
                            href="/register"
                            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#232e39] dark:hover:text-white transition"
                        >
                            Register Firm →
                        </Link>
                    </div>

                    {/* Mobile Header */}
                    <div className="flex lg:hidden flex-col items-center mb-6">
                        <div className="w-13 h-13 bg-[#232e39] dark:bg-[#3e5063] text-white rounded-2xl flex items-center justify-center shadow-md mb-3">
                            <Scale size={26} />
                        </div>
                        <span className="text-lg font-black tracking-widest text-[#232e39] dark:text-white">
                            LAW<span className="text-slate-500 dark:text-slate-300">PORTAL</span>
                        </span>
                    </div>

                    <div className="mb-7 text-center lg:text-left">
                        <h1 className="text-2xl sm:text-3xl font-black text-[#232e39] dark:text-white tracking-tight">
                            Welcome Back
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Sign in with your chamber credentials to continue
                        </p>
                    </div>

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

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2"
                            >
                                Email Address
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
                                    placeholder="name@firm.lk"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50/70 dark:bg-[#182028] border border-slate-300 dark:border-slate-600/80 rounded-xl text-sm font-medium text-[#232e39] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-[#1a232c] focus:border-[#232e39] dark:focus:border-slate-300 focus:ring-4 focus:ring-slate-500/15 transition"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label
                                    htmlFor="password"
                                    className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                >
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#232e39] dark:hover:text-white hover:underline transition"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock
                                    size={17}
                                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3.5 bg-slate-50/70 dark:bg-[#182028] border border-slate-300 dark:border-slate-600/80 rounded-xl text-sm font-medium text-[#232e39] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-[#1a232c] focus:border-[#232e39] dark:focus:border-slate-300 focus:ring-4 focus:ring-slate-500/15 transition"
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

                        {/* reCAPTCHA */}
                        {recaptchaSiteKey && (
                            <div className="flex justify-center lg:justify-start pt-1">
                                <div className="max-w-full overflow-x-auto p-2 rounded-2xl bg-slate-50 dark:bg-[#182028] border border-slate-200 dark:border-slate-700/70 inline-block">
                                    <ReCAPTCHA
                                        ref={recaptchaRef}
                                        sitekey={recaptchaSiteKey}
                                        onChange={(val) => setCaptchaVal(val)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={17} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={17} />
                                </>
                            )}
                        </button>
                    </form>
                </main>
            </div>
        </div>
    );
}