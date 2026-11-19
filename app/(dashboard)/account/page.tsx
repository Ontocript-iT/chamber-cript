'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
    User as FirebaseUser,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    User,
    Lock,
    Save,
    Mail,
    Briefcase,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    KeyRound,
    ArrowLeft,
    Loader2,
} from 'lucide-react';

export default function MyAccountPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [updatingPass, setUpdatingPass] = useState(false);

    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [firmId, setFirmId] = useState('');

    // Profile feedback
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    // Password state & visibility
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // Password feedback
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/login');
                return;
            }
            setUser(currentUser);
            try {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setName(data.name || '');
                    setRole(data.role || '');
                    setFirmId(data.firmId || '');
                }
            } catch (err) {
                console.error(err);
                setProfileError('Unable to load your profile details.');
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const passwordsMismatch = confirmPass.length > 0 && newPass !== confirmPass;

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');

        const trimmedName = name.trim();
        if (!trimmedName) {
            return setProfileError('Full name cannot be empty.');
        }
        if (!user) return;

        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), { name: trimmedName });
            setName(trimmedName);
            setProfileSuccess('Profile details updated successfully.');
        } catch (err: any) {
            console.error(err);
            setProfileError(err.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError('');
        setPassSuccess('');

        if (!currentPass || !newPass || !confirmPass) {
            return setPassError('All password fields are required.');
        }
        if (newPass.length < 8) {
            return setPassError('New password must be at least 8 characters long.');
        }
        if (newPass !== confirmPass) {
            return setPassError('New passwords do not match.');
        }
        if (!user?.email) {
            return setPassError('Unable to verify account email.');
        }

        setUpdatingPass(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPass);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPass);

            setPassSuccess('Password updated successfully.');
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setPassError('Current password is incorrect. Please try again.');
            } else if (err.code === 'auth/weak-password') {
                setPassError('New password is too weak. Choose a stronger password.');
            } else {
                setPassError(err.message || 'Failed to update password.');
            }
        } finally {
            setUpdatingPass(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="animate-spin text-[#232e39] dark:text-slate-200" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Loading Account Settings...
                    </p>
                </div>
            </div>
        );
    }

    const inputStyle =
        'w-full pl-11 pr-4 py-3.5 bg-slate-50/70 dark:bg-[#182028] border border-slate-300 dark:border-slate-600/80 rounded-xl text-sm font-medium text-[#232e39] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-[#1a232c] focus:border-[#232e39] dark:focus:border-slate-300 focus:ring-4 focus:ring-slate-500/15 transition';

    const labelStyle =
        'block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2';

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {/* Top Bar & Header */}
            <div className="bg-white dark:bg-[#232e39] rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4">
                    <div className="w-13 h-13 rounded-2xl bg-[#232e39] dark:bg-[#3e5063] text-white flex items-center justify-center shadow-sm shrink-0">
                        <User size={24} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black text-[#232e39] dark:text-white tracking-tight">
                                My Account Settings
                            </h1>
                            {role && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#182028] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60">
                                    {role.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            Manage your chamber profile details, password, and security PIN
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-[#182028] dark:hover:bg-[#1e2832] border border-slate-200 dark:border-slate-700/70 transition"
                    >
                        <ArrowLeft size={15} />
                        Dashboard
                    </Link>
                    <Link
                        href="/forgot-pin"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] transition shadow-sm"
                    >
                        <KeyRound size={15} />
                        Reset PIN
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Information Card */}
                <section className="bg-white dark:bg-[#232e39] rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#182028] border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-[#232e39] dark:text-slate-200">
                                <Briefcase size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-[#232e39] dark:text-white tracking-tight">
                                    Profile Information
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Update your display name shown across chamber records
                                </p>
                            </div>
                        </div>

                        {profileError && (
                            <div
                                role="alert"
                                className="mb-5 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 rounded-2xl flex items-start gap-3"
                            >
                                <AlertCircle
                                    size={18}
                                    className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                                />
                                <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-semibold">
                                    {profileError}
                                </p>
                            </div>
                        )}

                        {profileSuccess && (
                            <div
                                role="status"
                                className="mb-5 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl flex items-start gap-3"
                            >
                                <CheckCircle2
                                    size={18}
                                    className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                                />
                                <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                                    {profileSuccess}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-5">
                            <div>
                                <label htmlFor="profile-name" className={labelStyle}>
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        id="profile-name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                        className={inputStyle}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelStyle}>Email Address (Read-only)</label>
                                <div className="relative">
                                    <Mail
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <div className="w-full pl-11 pr-4 py-3.5 bg-slate-100/80 dark:bg-[#141b22]/80 border border-slate-200 dark:border-slate-700/70 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                                        {user?.email}
                                    </div>
                                </div>
                            </div>

                            {firmId && (
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#182028] border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <ShieldCheck
                                            size={17}
                                            className="text-slate-500 dark:text-slate-300 shrink-0"
                                        />
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                            Chamber ID
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[#232e39] dark:text-slate-200 truncate">
                                        {firmId}
                                    </span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={17} className="animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save size={17} />
                                        Save Profile
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </section>

                {/* Change Password Card */}
                <section className="bg-white dark:bg-[#232e39] rounded-3xl shadow-xl border border-slate-200/90 dark:border-slate-700/60 p-6 sm:p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#182028] border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-[#232e39] dark:text-slate-200">
                                <Lock size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-[#232e39] dark:text-white tracking-tight">
                                    Change Password
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Re-authenticate with your current password to set a new one
                                </p>
                            </div>
                        </div>

                        {passError && (
                            <div
                                role="alert"
                                className="mb-5 p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 rounded-2xl flex items-start gap-3"
                            >
                                <AlertCircle
                                    size={18}
                                    className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                                />
                                <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-semibold">
                                    {passError}
                                </p>
                            </div>
                        )}

                        {passSuccess && (
                            <div
                                role="status"
                                className="mb-5 p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl flex items-start gap-3"
                            >
                                <CheckCircle2
                                    size={18}
                                    className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                                />
                                <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-semibold">
                                    {passSuccess}
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            {/* Current Password */}
                            <div>
                                <label htmlFor="current-pass" className={labelStyle}>
                                    Current Password
                                </label>
                                <div className="relative">
                                    <Lock
                                        size={17}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        id="current-pass"
                                        type={showCurrentPass ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        value={currentPass}
                                        onChange={(e) => setCurrentPass(e.target.value)}
                                        className={`${inputStyle} pr-11`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPass((prev) => !prev)}
                                        aria-label={
                                            showCurrentPass
                                                ? 'Hide current password'
                                                : 'Show current password'
                                        }
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#232e39] dark:hover:text-white transition cursor-pointer"
                                    >
                                        {showCurrentPass ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label
                                        htmlFor="new-pass"
                                        className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                    >
                                        New Password
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
                                        id="new-pass"
                                        type={showNewPass ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        minLength={8}
                                        value={newPass}
                                        onChange={(e) => setNewPass(e.target.value)}
                                        className={`${inputStyle} pr-11`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPass((prev) => !prev)}
                                        aria-label={
                                            showNewPass ? 'Hide new password' : 'Show new password'
                                        }
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#232e39] dark:hover:text-white transition cursor-pointer"
                                    >
                                        {showNewPass ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label
                                        htmlFor="confirm-pass"
                                        className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                                    >
                                        Confirm New Password
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
                                        id="confirm-pass"
                                        type={showConfirmPass ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        placeholder="••••••••"
                                        minLength={8}
                                        value={confirmPass}
                                        onChange={(e) => setConfirmPass(e.target.value)}
                                        className={`${inputStyle} pr-11 ${
                                            passwordsMismatch
                                                ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500/15'
                                                : ''
                                        }`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPass((prev) => !prev)}
                                        aria-label={
                                            showConfirmPass
                                                ? 'Hide confirm password'
                                                : 'Show confirm password'
                                        }
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#232e39] dark:hover:text-white transition cursor-pointer"
                                    >
                                        {showConfirmPass ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updatingPass || passwordsMismatch}
                                className="w-full py-3.5 bg-[#232e39] hover:bg-[#334252] dark:bg-[#3e5063] dark:hover:bg-[#4c6178] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-slate-900/10 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                            >
                                {updatingPass ? (
                                    <>
                                        <Loader2 size={17} className="animate-spin" />
                                        Updating Password...
                                    </>
                                ) : (
                                    <>
                                        <Lock size={17} />
                                        Update Password
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </section>
            </div>
        </div>
    );
}