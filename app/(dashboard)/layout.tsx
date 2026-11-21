'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, updateDoc } from 'firebase/firestore';
import {
    LogOut, Home, Briefcase, Users, Scale, Menu, X, Sun, Moon,
    Bell, CheckCircle, Activity, User, MessageSquare, ShieldAlert, Search, Clock
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

type MyTask = {
    id: string; caseTitle: string; note: string; priority: string; status: string; dueDate: string; assignerName: string;
};

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [activeUser, setActiveUser] = useState<any>(null);
    const [firmData, setFirmData] = useState<any>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);



    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [hasSearchAccess, setHasSearchAccess] = useState(false);

    const [myTasks, setMyTasks] = useState<MyTask[]>([]);
    const [showTasksPanel, setShowTasksPanel] = useState(false);
    const [taskView, setTaskView] = useState<'PENDING' | 'COMPLETED'>('PENDING');

    const router = useRouter();
    const pathname = usePathname() ?? '';
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        setMounted(true);
        let firmUnsub: (() => void) | null = null;
        let unsubscribeTasks: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                localStorage.removeItem('chamber_auth_active');
                sessionStorage.removeItem('chamber_pin_verified');
                router.replace('/login');
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    router.replace('/login');
                    return;
                }

                const uData: any = { uid: user.uid, ...userDoc.data() };

                // 1. මුරපදය වෙනස් කිරීම, PIN සැකසීම සහ PIN තහවුරු කිරීම පරීක්ෂා කිරීම
                if (uData.role !== 'SUPER_ADMIN') {
                    if (uData.isFirstLogin) {
                        router.replace('/change-password');
                        return;
                    }
                    if (!uData.pin) {
                        router.replace('/setup-pin');
                        return;
                    }
                    // බ්‍රවුසරය වසා නැවත පැමිණි විට නැවත PIN screen එකට යොමු කිරීම
                    if (sessionStorage.getItem('chamber_pin_verified') !== 'true') {
                        router.replace('/verify-pin');
                        return;
                    }
                }

                // 2. Law Firm තත්ත්වය සහ දින 14 Trial කාලය අවසන් වී ඇත්දැයි පරීක්ෂා කිරීම
                if (uData.firmId && uData.role !== 'SUPER_ADMIN') {
                    const firmRef = doc(db, 'firms', uData.firmId);
                    const initialFirmSnap = await getDoc(firmRef);

                    if (initialFirmSnap.exists()) {
                        const fData = initialFirmSnap.data();
                        const isTrialExpired =
                            fData.planType === 'TRIAL' &&
                            fData.trialEndsAt &&
                            new Date() > new Date(fData.trialEndsAt);

                        if (isTrialExpired && fData.isActive !== false) {
                            await updateDoc(firmRef, {
                                isActive: false,
                                trialExpiredAt: new Date().toISOString(),
                            });
                            fData.isActive = false;
                        }
                        setFirmData(fData);
                    }

                    firmUnsub = onSnapshot(firmRef, async (firmSnap) => {
                        if (!firmSnap.exists()) return;
                        const liveFirm = firmSnap.data();
                        const expiredNow =
                            liveFirm.planType === 'TRIAL' &&
                            liveFirm.trialEndsAt &&
                            new Date() > new Date(liveFirm.trialEndsAt);

                        if (expiredNow && liveFirm.isActive !== false) {
                            await updateDoc(firmRef, {
                                isActive: false,
                                trialExpiredAt: new Date().toISOString(),
                            });
                            return;
                        }
                        setFirmData(liveFirm);
                    });

                    const qTasks = query(collection(db, 'tasks'), where('assigneeId', '==', user.uid));
                    unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
                        const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MyTask));
                        tasks.sort((a, b) => new Date(b.dueDate || '9999').getTime() - new Date(a.dueDate || '9999').getTime());
                        setMyTasks(tasks);
                    });
                }

                setActiveUser(uData);
                if (uData.role === 'LAWYER' || uData.permissions?.includes('cases.read')) {
                    setHasSearchAccess(true);
                }
                setLoading(false);
            } catch (error) {
                console.error("Error fetching user", error);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (firmUnsub) firmUnsub();
            if (unsubscribeTasks) unsubscribeTasks();
        };
    }, [router]);


    useEffect(() => {
        const fetchSearchData = async () => {
            if (!searchQuery.trim() || !activeUser?.firmId || !hasSearchAccess) {
                setSearchResults([]); setShowDropdown(false); return;
            }
            setIsSearching(true);
            try {
                const casesRef = collection(db, 'cases');
                const q = query(casesRef, where('firmId', '==', activeUser.firmId));
                const snapshot = await getDocs(q);
                const queryStr = searchQuery.toLowerCase();
                const matched = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as any))
                    .filter(c =>
                        c.title?.toLowerCase().includes(queryStr) ||
                        c.clientName?.toLowerCase().includes(queryStr) ||
                        c.idNumber?.toLowerCase().includes(queryStr) ||
                        c.contactNo?.toLowerCase().includes(queryStr) ||
                        c.caseNumber?.toLowerCase().includes(queryStr)
                    ).slice(0, 6);
                setSearchResults(matched);
                setShowDropdown(true);
            } catch (err) { console.error(err); }
            setIsSearching(false);
        };
        const delayDebounceFn = setTimeout(() => { fetchSearchData(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, activeUser?.firmId, hasSearchAccess]);

    const handleLogout = async () => {
        localStorage.removeItem('chamber_auth_active');
        sessionStorage.removeItem('chamber_pin_verified');
        await signOut(auth);
        router.replace('/login');
    };
    const updateMyTaskStatus = async (taskId: string, newStatus: string) => {
        try { await updateDoc(doc(db, 'tasks', taskId), { status: newStatus }); } catch (err) { alert("Failed to update task."); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div></div>;

    const isSuperAdmin = activeUser?.role === 'SUPER_ADMIN';
    const isQuotaLow = !isSuperAdmin && firmData && (firmData.smsQuota || 0) <= 50;
    const pendingTasks = myTasks.filter(t => t.status !== 'Completed');
    const completedTasks = myTasks.filter(t => t.status === 'Completed');
    const displayTasks = taskView === 'PENDING' ? pendingTasks : completedTasks;

    const isTrialExpired =
        !isSuperAdmin &&
        firmData?.planType === 'TRIAL' &&
        firmData?.trialEndsAt &&
        new Date() > new Date(firmData.trialEndsAt);

    const isFirmPending = !isSuperAdmin && firmData && firmData.approvalStatus === 'PENDING';
    const isFirmSuspended = !isSuperAdmin && firmData && (firmData.isActive === false || firmData.approvalStatus === 'REJECTED' || isTrialExpired);

    if (isFirmPending) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-6">
                <Clock size={64} className="text-amber-500 mb-4" />
                <h1 className="text-3xl font-black mb-2">Account Pending Approval</h1>
                <p className="text-gray-500 max-w-md">
                    Your Law Firm registration is awaiting verification by the Super Admin. You and your staff will gain access once approved.
                </p>
                <button onClick={handleLogout} className="mt-6 px-6 py-2.5 bg-brand-dark text-white rounded-xl font-bold cursor-pointer">
                    Logout
                </button>
            </div>
        );
    }

    if (isFirmSuspended) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-6">
                <ShieldAlert size={64} className="text-red-500 mb-4" />
                <h1 className="text-3xl font-black mb-2">
                    {isTrialExpired ? '14-Day Free Trial Expired' : 'System Access Denied'}
                </h1>
                <p className="text-gray-500 max-w-md">
                    {isTrialExpired
                        ? 'Your 14-day free trial period has ended. Please contact the Super Admin to activate your subscription.'
                        : 'Access for your Law Firm and all team members has been suspended due to pending monthly payments or administrative restrictions. Please contact the Super Admin.'}
                </p>
                <button onClick={handleLogout} className="mt-6 px-6 py-2.5 bg-brand-dark text-white rounded-xl font-bold cursor-pointer">
                    Logout
                </button>
            </div>
        );
    }

    if (isQuotaLow && pathname !== '/sms') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-6">
                <MessageSquare size={64} className="text-amber-500 mb-4" />
                <h1 className="text-3xl font-bold mb-2">SMS Quota Limit Reached</h1>
                <p className="text-gray-500 max-w-md mb-6">Your firm&apos;s SMS quota has dropped below 50. The system is restricted until you recharge your SMS package.</p>
                <div className="flex gap-4">
                    <button onClick={handleLogout} className="px-6 py-2.5 border border-brand/20 rounded-lg font-bold text-brand-dark dark:text-white">Logout</button>
                    {activeUser?.role === 'LAWYER' && (
                        <Link href="/sms" className="px-6 py-2.5 bg-brand text-white rounded-lg font-bold shadow-md shadow-brand/20">Buy SMS Quota</Link>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans transition-colors duration-300">
            {/* Top Navigation Bar */}
            <header className="bg-white dark:bg-brand-dark shadow-sm border-b border-gray-100 dark:border-brand sticky top-0 z-40 relative">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-[72px] gap-4">

                        {/* Logo */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center shadow-sm">
                                <Scale size={20} />
                            </div>
                            <span className="text-xl font-extrabold tracking-widest text-brand-dark dark:text-white hidden sm:block">Chamber<span className="text-brand">Cript</span></span>
                        </div>

                        {/* Middle Navigation & Search Bar */}
                        <div className="flex-1 flex justify-center items-center gap-6">
                            <nav className="hidden lg:flex items-center space-x-1">
                                {!isSuperAdmin ? (
                                    <>
                                        <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${pathname === '/dashboard' ? 'bg-brand/10 text-brand dark:text-brand-light' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand/20'}`}><Home size={18} /> Dashboard</Link>
                                        <Link href="/cases" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${pathname.includes('/cases') ? 'bg-brand/10 text-brand dark:text-brand-light' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand/20'}`}><Briefcase size={18} /> Cases</Link>
                                        <Link href="/tasks" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${pathname === '/tasks' ? 'bg-brand/10 text-brand dark:text-brand-light' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand/20'}`}><CheckCircle size={18} /> Tasks</Link>

                                        {activeUser?.role === 'LAWYER' && (
                                            <>
                                                <Link href="/staff" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand/20"><Users size={18} /> Staff</Link>
                                                <Link href="/logs" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-brand/20"><Activity size={18} /> Logs</Link>
                                                <Link href="/sms" className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${pathname === '/sms' ? 'bg-brand/10 text-brand dark:text-brand-light' : 'text-brand hover:bg-brand/10'}`}><MessageSquare size={18} /> SMS</Link>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <Link href="/superadmin" className="flex items-center gap-2 px-4 py-2 bg-brand-dark text-white rounded-lg text-sm font-bold shadow-sm"><ShieldAlert size={18} /> Super Admin Panel</Link>
                                )}
                            </nav>

                            {/* GLOBAL SEARCH BAR */}
                            {!isSuperAdmin && hasSearchAccess && (
                                <div className="hidden lg:block relative w-full max-w-md">
                                    <div className="relative flex items-center">
                                        <Search size={18} className="absolute left-4 text-gray-400 dark:text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search case, client, or NIC..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onFocus={() => { if(searchQuery) setShowDropdown(true) }}
                                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-brand rounded-full text-sm outline-none focus:ring-2 focus:ring-brand/30 transition shadow-inner dark:text-gray-200"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => {setSearchQuery(''); setShowDropdown(false);}} className="absolute right-4 text-gray-400 hover:text-gray-600">
                                                <X size={14}/>
                                            </button>
                                        )}
                                    </div>

                                    {/* Search Dropdown */}
                                    {showDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                                            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-brand-dark border border-gray-100 dark:border-brand shadow-xl rounded-2xl z-50 overflow-hidden">
                                                {isSearching ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                                                ) : searchResults.length === 0 ? (
                                                    <div className="p-4 text-center text-sm text-gray-500">No cases found.</div>
                                                ) : (
                                                    <div className="max-h-[350px] overflow-y-auto">
                                                        {searchResults.map(c => (
                                                            <Link
                                                                key={c.id}
                                                                href={`/cases/${c.id}`}
                                                                onClick={() => { setShowDropdown(false); setSearchQuery(''); }}
                                                                className="block p-4 border-b border-gray-50 dark:border-brand hover:bg-brand/5 dark:hover:bg-brand/20 transition"
                                                            >
                                                                <p className="font-bold text-sm text-brand-dark dark:text-white line-clamp-1">{c.title}</p>
                                                                <div className="flex justify-between items-center mt-2">
                                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.clientName} {c.idNumber ? `(${c.idNumber})` : ''}</p>
                                                                    <span className="text-[10px] font-bold bg-brand/10 text-brand dark:bg-brand-light/20 dark:text-brand-light px-2 py-0.5 rounded-md uppercase">{c.status}</span>
                                                                </div>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Navigation */}
                        <div className="flex items-center gap-3 border-l border-gray-100 dark:border-brand pl-4 flex-shrink-0">

                            {!isSuperAdmin && (
                                <button onClick={() => setShowTasksPanel(true)} className="relative p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-brand transition text-brand-dark dark:text-gray-300" title="My Tasks">
                                    <Bell size={20} />
                                    {pendingTasks.length > 0 && (
                                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-brand-dark">
                                            {pendingTasks.length}
                                        </span>
                                    )}
                                </button>
                            )}

                            {mounted && (
                                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="hidden sm:block p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-brand text-brand-dark dark:text-gray-300 transition">
                                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                                </button>
                            )}

                            {!isSuperAdmin && firmData && (
                                <div className="hidden md:block text-right mr-2 border-r border-gray-100 dark:border-brand pr-4">
                                    <p className="text-[10px] text-green-500 dark:text-green-500 font-bold uppercase tracking-wider">SMS Quota</p>
                                    <p className={`text-sm font-extrabold ${firmData.smsQuota <= 100 ? 'text-red-500' : 'text-brand dark:text-green-500'}`}>{firmData.smsQuota} Left</p>
                                </div>
                            )}

                            <Link href="/account" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-brand text-brand-dark dark:text-white text-sm font-bold border border-gray-100 dark:border-brand-light/20 hover:shadow-sm transition">
                                <User size={16} />
                                <span className="hidden sm:inline">{activeUser?.name?.split(' ')[0]}</span>
                            </Link>

                            <button onClick={handleLogout} className="hidden md:flex items-center justify-center p-2.5 bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400 hover:bg-red-100 rounded-xl transition" title="Logout">
                                <LogOut size={18} />
                            </button>

                            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-brand-dark dark:text-gray-300 focus:outline-none ml-2 p-2">
                                {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Search Bar */}
                {!isSuperAdmin && hasSearchAccess && !mobileMenuOpen && (
                    <div className="lg:hidden px-4 pb-4">
                        <div className="relative flex items-center">
                            <Search size={18} className="absolute left-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search case or client..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => { if(searchQuery) setShowDropdown(true) }}
                                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-brand rounded-full text-sm outline-none focus:ring-2 focus:ring-brand/30"
                            />
                        </div>
                        {showDropdown && (
                            <div className="absolute left-0 w-full mt-2 bg-white dark:bg-brand-dark border-t border-gray-100 dark:border-brand shadow-xl z-50">
                                {isSearching ? (
                                    <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
                                ) : searchResults.map(c => (
                                    <Link key={c.id} href={`/cases/${c.id}`} onClick={() => { setShowDropdown(false); setSearchQuery(''); }} className="block p-4 border-b border-gray-50 dark:border-brand hover:bg-brand/10">
                                        <p className="font-bold text-sm text-brand-dark dark:text-white">{c.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.clientName}</p>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </header>

            <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
                {children}
            </main>

            {/* ================= MY TASKS SLIDE-OUT PANEL (Notification Action) ================= */}
            {showTasksPanel && (
                <div className="fixed inset-0 z-50 flex justify-end bg-brand-dark/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white dark:bg-brand-dark h-full shadow-2xl flex flex-col animate-in slide-in-from-right border-l border-gray-100 dark:border-brand">

                        <div className="p-6 border-b border-gray-100 dark:border-brand flex justify-between items-center bg-gray-50/50 dark:bg-brand/10">
                            <h2 className="text-2xl font-black flex items-center gap-3 text-brand-dark dark:text-white"><Bell className="text-brand"/> My Tasks</h2>
                            <button onClick={() => setShowTasksPanel(false)} className="p-2.5 rounded-full hover:bg-gray-200 dark:hover:bg-brand transition text-gray-600 dark:text-gray-300"><X size={20}/></button>
                        </div>

                        <div className="flex border-b border-gray-100 dark:border-brand bg-white dark:bg-brand-dark">
                            <button onClick={() => setTaskView('PENDING')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${taskView === 'PENDING' ? 'border-brand text-brand dark:text-white' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-brand/20'}`}>Pending ({pendingTasks.length})</button>
                            <button onClick={() => setTaskView('COMPLETED')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${taskView === 'COMPLETED' ? 'border-brand text-brand dark:text-white' : 'border-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-brand/20'}`}>History</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {displayTasks.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 dark:text-gray-500 flex flex-col items-center"><CheckCircle size={48} className="mb-4 opacity-20"/> <p className="font-medium text-sm">No tasks here!</p></div>
                            ) : displayTasks.map(t => (
                                <div key={t.id} className="p-5 rounded-2xl border-2 border-gray-100 dark:border-brand-light/20 shadow-sm bg-white dark:bg-brand hover:border-brand/40 transition">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase ${t.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 dark:bg-brand-dark dark:text-gray-300'}`}>{t.priority}</span>
                                        {t.dueDate && <span className="text-[10px] font-bold flex items-center gap-1 text-gray-500 dark:text-gray-400"><Clock size={12}/> {t.dueDate}</span>}
                                    </div>
                                    <h4 className="font-bold text-base text-brand-dark dark:text-white mb-2 leading-snug">{t.caseTitle || 'General Task'}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap font-medium">{t.note}</p>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-brand-light/20">
                                        <span className="text-[11px] font-bold text-gray-500">By: {t.assignerName}</span>
                                        <select
                                            value={t.status}
                                            onChange={(e) => updateMyTaskStatus(t.id, e.target.value)}
                                            className="text-xs p-2 border border-gray-200 dark:border-brand-light/30 rounded-lg bg-gray-50 dark:bg-brand-dark font-bold outline-none focus:ring-2 focus:ring-brand/30"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-background">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
                </div>
            }
        >
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </Suspense>
    );
}