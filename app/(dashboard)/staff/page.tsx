'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
    Users, UserPlus, Shield, Check, X, Save, Edit2,
    AlertTriangle, Mail, CheckCircle, RefreshCw
} from 'lucide-react';

type StaffMember = {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
};

const AVAILABLE_PERMISSIONS = ['cases.read', 'cases.write', 'tasks.read', 'tasks.write', 'sms.send'];

export default function ManageStaffPage() {
    const router = useRouter();

    // Auth & Permission States
    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);
    const [firmId, setFirmId] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');

    // Create Staff States
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('JUNIOR_LAWYER');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);

    // Staff List & Editing States
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [updating, setUpdating] = useState(false);

    // Custom Alert Modal
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: 'Notification', message: '', type: 'info'
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/login');
                return;
            }
            setCurrentUserId(user.uid);

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const data = userDoc.data();

                // Only allow LAWYER (Admin) to access this page
                if (data?.role !== 'LAWYER') {
                    setHasPermission(false);
                    setLoading(false);
                    return;
                }

                setHasPermission(true);
                setFirmId(data.firmId);
                fetchStaff(data.firmId);
            } catch (error) {
                console.error("Error fetching user data", error);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const fetchStaff = async (fId: string) => {
        try {
            const q = query(collection(db, 'users'), where('firmId', '==', fId));
            const snapshot = await getDocs(q);
            const staff = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
            // Keep Principal Lawyer at the top
            staff.sort((a, b) => (a.role === 'LAWYER' ? -1 : b.role === 'LAWYER' ? 1 : a.name.localeCompare(b.name)));
            setStaffList(staff);
        } catch (error) {
            console.error("Error fetching staff list", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Create Staff Logic ---
    const handlePermissionToggle = (perm: string) => {
        setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
    };

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firmId) return;

        setCreating(true);
        try {
            const res = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, role, permissions, firmId })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create staff');
            }

            setAlertModal({
                isOpen: true,
                title: 'Staff Member Added',
                message: 'Account created and login credentials have been emailed successfully.',
                type: 'success'
            });
            setEmail('');
            setName('');
            setPermissions([]);
            setRole('JUNIOR_LAWYER');

            fetchStaff(firmId);
        } catch (error: any) {
            setAlertModal({
                isOpen: true,
                title: 'Creation Failed',
                message: error.message || 'Could not create staff account.',
                type: 'error'
            });
        } finally {
            setCreating(false);
        }
    };

    // --- Edit Permissions Logic ---
    const startEditing = (staff: StaffMember) => {
        setEditingStaffId(staff.id);
        setEditPermissions(staff.permissions || []);
    };

    const toggleEditPermission = (perm: string) => {
        setEditPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
    };

    const savePermissions = async (staffId: string) => {
        setUpdating(true);
        try {
            await updateDoc(doc(db, 'users', staffId), { permissions: editPermissions });

            setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, permissions: editPermissions } : s));
            setEditingStaffId(null);
            setAlertModal({
                isOpen: true,
                title: 'Permissions Updated',
                message: 'Access permissions have been saved successfully.',
                type: 'success'
            });
        } catch (error) {
            console.error(error);
            setAlertModal({
                isOpen: true,
                title: 'Update Failed',
                message: 'Failed to update permissions. Please try again.',
                type: 'error'
            });
        } finally {
            setUpdating(false);
        }
    };

    const inputStyle = "w-full px-4 py-3 bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-xl text-sm font-medium text-[#2A3642] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#2A3642] dark:focus:border-slate-300 focus:ring-4 focus:ring-[#465769]/15 transition-all";
    const labelStyle = "block text-[11px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2";

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-300"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#465769] dark:text-slate-400">Loading Staff Directory...</p>
                </div>
            </div>
        );
    }

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto p-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5 border border-rose-200 dark:border-rose-800/50 shadow-xs">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black text-[#2A3642] dark:text-white mb-2">Access Denied</h2>
                <p className="text-sm text-[#465769] dark:text-slate-400 font-medium">
                    Only the Principal Lawyer (Admin) can view or manage firm staff and permissions.
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-6 px-6 py-3 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    const activeStaffCount = staffList.filter(s => s.role !== 'LAWYER').length;

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">

            {/* ================= TOP COMMAND BAR ================= */}
            <div className="bg-[#465769] dark:bg-[#2A3642] rounded-2xl px-6 py-4 shadow-sm border border-slate-200/80 dark:border-[#465769]/40 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-sm">
                        <Users size={20} />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                            Staff & Access Control
                        </h1>
                        <p className="text-xs text-slate-200/85 font-medium mt-1">
                            Onboard junior lawyers and clerks, and configure granular system permissions
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 bg-white/95 dark:bg-[#182028] px-4 py-2 rounded-xl border border-white/20 dark:border-[#465769]/50 text-xs">
                    <span className="font-bold text-[#465769] dark:text-slate-400">
                        Total Members: <strong className="text-[#2A3642] dark:text-white text-sm ml-1">{staffList.length}</strong>
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span className="font-bold text-[#465769] dark:text-slate-400">
                        Staff: <strong className="text-[#2A3642] dark:text-white text-sm ml-1">{activeStaffCount}</strong>
                    </span>
                </div>
            </div>

            {/* ================= MAIN 12-COLUMN WORKSPACE ================= */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* --- LEFT (4 Cols): CREATE STAFF FORM --- */}
                <div className="xl:col-span-4 bg-white dark:bg-[#2A3642] rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 overflow-hidden xl:sticky xl:top-24">
                    <div className="px-6 py-5 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-xs">
                            <UserPlus size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-[#2A3642] dark:text-white leading-none">
                                Add New Member
                            </h2>
                            <p className="text-[11px] text-[#465769] dark:text-slate-400 font-medium mt-1">
                                Credentials will be emailed automatically
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateStaff} className="p-6 space-y-5 bg-[#F8FAFC]/50 dark:bg-[#2A3642]">
                        <div>
                            <label className={labelStyle}>Full Name <span className="text-rose-500">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. Nimal Perera"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={inputStyle}
                                required
                            />
                        </div>

                        <div>
                            <label className={labelStyle}>Email Address <span className="text-rose-500">*</span></label>
                            <input
                                type="email"
                                placeholder="member@firm.lk"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={inputStyle}
                                required
                            />
                        </div>

                        <div>
                            <label className={labelStyle}>Role <span className="text-rose-500">*</span></label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className={`${inputStyle} font-bold cursor-pointer`}
                            >
                                <option value="JUNIOR_LAWYER" className="dark:bg-[#182028]">Junior Lawyer</option>
                                <option value="CLERK" className="dark:bg-[#182028]">Clerk</option>
                            </select>
                        </div>

                        <div className="bg-white dark:bg-[#1E2730] p-4 rounded-2xl border border-slate-200 dark:border-[#465769]/50">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2A3642] dark:text-slate-200 flex items-center gap-1.5">
                                    <Shield size={14} className="text-[#465769] dark:text-slate-400" /> Grant Permissions
                                </p>
                                <span className="text-[10px] font-bold text-[#465769] dark:text-slate-400">
                                    {permissions.length} selected
                                </span>
                            </div>

                            <div className="space-y-2">
                                {AVAILABLE_PERMISSIONS.map((perm) => {
                                    const checked = permissions.includes(perm);
                                    return (
                                        <label
                                            key={perm}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                                                checked
                                                    ? 'bg-[#465769]/10 dark:bg-[#465769]/35 border-[#465769] text-[#2A3642] dark:text-white'
                                                    : 'bg-[#F8FAFC] dark:bg-[#182028] border-slate-200 dark:border-[#465769]/40 text-[#465769] dark:text-slate-300 hover:border-[#465769]/60'
                                            }`}
                                        >
                                            <span className="text-xs font-mono font-bold">{perm}</span>
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                                                checked
                                                    ? 'bg-[#2A3642] dark:bg-[#465769] border-[#2A3642] dark:border-slate-300 text-white'
                                                    : 'bg-white dark:bg-[#2A3642] border-slate-300 dark:border-[#465769]'
                                            }`}>
                                                {checked && <Check size={13} strokeWidth={3} />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => handlePermissionToggle(perm)}
                                                className="hidden"
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            disabled={creating || !firmId}
                            className="w-full py-3.5 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#56697e] text-white rounded-xl font-bold text-sm disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {creating ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" /> Creating Account...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={16} /> Create Staff & Send Invite
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* --- RIGHT (8 Cols): STAFF DIRECTORY & PERMISSIONS --- */}
                <div className="xl:col-span-8 space-y-4">
                    {staffList.length === 0 ? (
                        <div className="bg-white dark:bg-[#2A3642] p-14 rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] text-[#465769] dark:text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-[#465769]/40">
                                <Users size={24} />
                            </div>
                            <p className="text-sm font-extrabold text-[#2A3642] dark:text-white">No staff members yet</p>
                            <p className="text-xs text-[#465769] dark:text-slate-400 mt-1">
                                Use the form on the left to invite your first team member.
                            </p>
                        </div>
                    ) : (
                        staffList.map((staff) => {
                            const isMainLawyer = staff.role === 'LAWYER';
                            const isCurrentUser = staff.id === currentUserId;
                            const isEditing = editingStaffId === staff.id;
                            const initial = (staff.name || '?').charAt(0).toUpperCase();

                            return (
                                <div
                                    key={staff.id}
                                    className={`bg-white dark:bg-[#2A3642] p-6 rounded-3xl shadow-sm border transition-all ${
                                        isEditing
                                            ? 'border-[#2A3642] dark:border-slate-300 ring-2 ring-[#465769]/15'
                                            : 'border-slate-200/80 dark:border-[#465769]/40 hover:border-[#465769]'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                        {/* Member Identity */}
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-xs ${
                                                isMainLawyer
                                                    ? 'bg-[#2A3642] dark:bg-[#465769] text-white'
                                                    : 'bg-[#F8FAFC] dark:bg-[#1E2730] text-[#2A3642] dark:text-white border border-slate-200 dark:border-[#465769]/60'
                                            }`}>
                                                {initial}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-extrabold text-[#2A3642] dark:text-white truncate">
                                                        {staff.name}
                                                    </h3>
                                                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${
                                                        isMainLawyer
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/70'
                                                            : 'bg-[#F8FAFC] text-[#465769] border-slate-200 dark:bg-[#1E2730] dark:text-slate-300 dark:border-[#465769]/60'
                                                    }`}>
                                                        {staff.role.replace('_', ' ')}
                                                    </span>
                                                    {isCurrentUser && (
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-[#465769] dark:text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                                                    <Mail size={12} className="shrink-0" /> {staff.email}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Edit Action Controls */}
                                        {!isMainLawyer && (
                                            <div className="shrink-0">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingStaffId(null)}
                                                            className="px-3.5 py-2 bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-[#354453] transition flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <X size={14} /> Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => savePermissions(staff.id)}
                                                            disabled={updating}
                                                            className="px-4 py-2 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                                                        >
                                                            <Save size={14} /> {updating ? 'Saving...' : 'Save'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => startEditing(staff)}
                                                        className="px-3.5 py-2 bg-[#F8FAFC] dark:bg-[#1E2730] hover:bg-[#2A3642] hover:text-white dark:hover:bg-[#465769] text-[#2A3642] dark:text-slate-200 border border-slate-200 dark:border-[#465769]/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <Edit2 size={14} /> Edit Permissions
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Permissions View / Edit Area */}
                                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#465769]/30">
                                        <p className="text-[10px] text-[#465769] dark:text-slate-400 font-black uppercase tracking-widest mb-3">
                                            Assigned Permissions
                                        </p>

                                        {isMainLawyer ? (
                                            <div className="flex items-center gap-2.5 text-xs font-semibold text-[#2A3642] dark:text-slate-200 bg-[#F8FAFC] dark:bg-[#1E2730] px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-[#465769]/40">
                                                <Shield size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
                                                Principal Lawyer holds full administrative access across all modules.
                                            </div>
                                        ) : isEditing ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-[#F8FAFC] dark:bg-[#1E2730] p-4 rounded-2xl border border-slate-200 dark:border-[#465769]/50">
                                                {AVAILABLE_PERMISSIONS.map((perm) => {
                                                    const checked = editPermissions.includes(perm);
                                                    return (
                                                        <label
                                                            key={perm}
                                                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                                                                checked
                                                                    ? 'bg-white dark:bg-[#2A3642] border-[#2A3642] dark:border-slate-300 text-[#2A3642] dark:text-white shadow-2xs'
                                                                    : 'bg-white/60 dark:bg-[#182028] border-slate-200 dark:border-[#465769]/40 text-[#465769] dark:text-slate-400 hover:border-[#465769]'
                                                            }`}
                                                        >
                                                            <span className="text-xs font-mono font-bold">{perm}</span>
                                                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                                                                checked
                                                                    ? 'bg-[#2A3642] dark:bg-[#465769] border-[#2A3642] dark:border-slate-300 text-white'
                                                                    : 'bg-white dark:bg-[#2A3642] border-slate-300 dark:border-[#465769]'
                                                            }`}>
                                                                {checked && <Check size={11} strokeWidth={3} />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleEditPermission(perm)}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {staff.permissions && staff.permissions.length > 0 ? (
                                                    staff.permissions.map(perm => (
                                                        <span
                                                            key={perm}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-[#F8FAFC] dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 border border-slate-200 dark:border-[#465769]/50"
                                                        >
                                                            <Check size={12} className="text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                                                            {perm}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">
                                                        No permissions granted yet.
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>

            {/* ================= CUSTOM ALERT MODAL ================= */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#465769] text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                            alertModal.type === 'error'
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : alertModal.type === 'success'
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-[#465769]/15 text-[#2A3642] dark:text-white'
                        }`}>
                            {alertModal.type === 'error' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <h3 className="text-lg font-black text-[#2A3642] dark:text-white mb-1.5">
                            {alertModal.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-6 font-medium">
                            {alertModal.message}
                        </p>
                        <button
                            onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                            className="w-full py-3 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                        >
                            OK, Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}