'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Briefcase, Plus, Search, Eye, FolderOpen,
    LayoutGrid, List as ListIcon, Calendar, User, Tag,
    ChevronLeft, ChevronRight, Filter, AlertTriangle
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

type CaseData = {
    id: string;
    title: string;
    caseNumber: string;
    type: string;
    clientName: string;
    clientRole: string;
    contactNo: string;
    status: string;
    createdAt: string;
};

type ViewMode = 'grid' | 'list';
type DateFilter = 'ALL' | 'UPCOMING' | 'LAST_7' | 'LAST_30';

export default function CasesListPage() {
    const router = useRouter();

    // --- 1. ALL USE STATES AT THE TOP ---
    const [cases, setCases] = useState<CaseData[]>([]);
    const [loading, setLoading] = useState(true);
    const [firmId, setFirmId] = useState<string | null>(null);
    const [canRead, setCanRead] = useState(false);

    // States for Features
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // --- 2. ALL USE EFFECTS ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return router.push('/login');
            try {
                const userDocRef = collection(db, 'users');
                const userQuery = query(userDocRef, where('__name__', '==', user.uid));
                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                    const uData = userSnapshot.docs[0].data();
                    setFirmId(uData.firmId);

                    if (uData.role === 'LAWYER' || uData.permissions?.includes('cases.read')) {
                        setCanRead(true);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        const fetchCases = async () => {
            if (!firmId || !canRead) return;
            try {
                const casesRef = collection(db, 'cases');
                const q = query(casesRef, where('firmId', '==', firmId));
                const snapshot = await getDocs(q);

                const fetchedCases = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as CaseData[];

                fetchedCases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setCases(fetchedCases);
            } catch (error) {
                console.error("Error fetching cases:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCases();
    }, [firmId, canRead]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFilter]);

    // --- 3. FILTER & PAGINATION LOGIC ---
    const filteredCases = cases.filter(c => {
        const matchesSearch =
            c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.caseNumber && c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesDate = true;
        const createdDate = new Date(c.createdAt);
        const now = new Date();

        if (dateFilter === 'LAST_7') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            matchesDate = createdDate >= sevenDaysAgo;
        } else if (dateFilter === 'LAST_30') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            matchesDate = createdDate >= thirtyDaysAgo;
        } else if (dateFilter === 'UPCOMING') {
            matchesDate = c.status === 'ACTIVE';
        }

        return matchesSearch && matchesDate;
    });

    const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentCases = filteredCases.slice(indexOfFirstItem, indexOfLastItem);

    // --- 4. EARLY RETURNS ---
    if (loading) {
        return (
            <div className="flex h-[85vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-300"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#465769] dark:text-slate-400">Loading Cases...</p>
                </div>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-4 border border-rose-200 dark:border-rose-800/50">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black text-[#2A3642] dark:text-white">Access Denied</h2>
                <p className="text-sm text-[#465769] dark:text-slate-400 mt-1 max-w-sm">You don't have permission to view cases (cases.read required).</p>
                <Link href="/dashboard" className="mt-6 px-6 py-3 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white rounded-xl font-bold text-xs transition shadow-md">Go to Dashboard</Link>
            </div>
        );
    }

    // --- 5. MAIN COMPONENT RENDER ---
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12">

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#2A3642] p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-sm">
                        <Briefcase size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#2A3642] dark:text-white tracking-tight">Case Management</h1>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 font-medium mt-0.5">Manage, filter, and track all your firm's legal files.</p>
                    </div>
                </div>
                <Link href="/dashboard" className="bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#56697e] text-white px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition shadow-lg flex items-center gap-2">
                    <Plus size={18} /> New Case File
                </Link>
            </div>

            {/* Toolbar: Search, Filters, and View Toggle */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between bg-white dark:bg-[#2A3642] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm transition-colors">

                {/* Search */}
                <div className="flex-1 flex items-center gap-3 bg-[#F8FAFC] dark:bg-[#1E2730] px-4 py-3 rounded-xl border border-slate-200 dark:border-[#465769]/50">
                    <Search className="text-[#465769] dark:text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by case title, client name, or reference number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-[#2A3642] dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                    />
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    {/* Date Filter */}
                    <div className="flex items-center gap-2 bg-[#F8FAFC] dark:bg-[#1E2730] px-4 py-3 rounded-xl border border-slate-200 dark:border-[#465769]/50">
                        <Filter size={16} className="text-[#465769] dark:text-slate-400" />
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                            className="bg-transparent border-none outline-none text-xs sm:text-sm text-[#2A3642] dark:text-slate-200 font-bold cursor-pointer"
                        >
                            <option value="ALL" className="dark:bg-[#1E2730]">All Time</option>
                            <option value="UPCOMING" className="dark:bg-[#1E2730]">Active / Upcoming</option>
                            <option value="LAST_7" className="dark:bg-[#1E2730]">Last 7 Days</option>
                            <option value="LAST_30" className="dark:bg-[#1E2730]">Last 30 Days</option>
                        </select>
                    </div>

                    {/* View Toggle */}
                    <div className="flex items-center bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl p-1 border border-slate-200 dark:border-[#465769]/50">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'list' ? 'bg-[#2A3642] text-white dark:bg-[#465769] shadow-sm' : 'text-slate-400 hover:text-[#2A3642] dark:hover:text-white'}`}
                            title="List View"
                        >
                            <ListIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'grid' ? 'bg-[#2A3642] text-white dark:bg-[#465769] shadow-sm' : 'text-slate-400 hover:text-[#2A3642] dark:hover:text-white'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {filteredCases.length === 0 ? (
                <div className="bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 p-16 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-[#465769]/10 dark:bg-[#465769]/30 text-[#2A3642] dark:text-slate-200 flex items-center justify-center mb-4">
                        <FolderOpen size={32} />
                    </div>
                    <h3 className="text-xl font-black text-[#2A3642] dark:text-white mb-1">No cases found</h3>
                    <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 max-w-sm font-medium">
                        Adjust your search query or filter settings to locate the required case files.
                    </p>
                </div>
            ) : (
                <>
                    {/* ---- GRID VIEW ---- */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {currentCases.map(c => (
                                <Link key={c.id} href={`/cases/${c.id}`} className="block group">
                                    <div className="bg-white dark:bg-[#2A3642] p-6 rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm hover:shadow-md hover:border-[#465769] dark:hover:border-slate-300 transition-all h-full flex flex-col relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#2A3642] dark:bg-[#465769] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                                c.status === 'ACTIVE'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                    : 'bg-slate-100 text-slate-800 dark:bg-[#1E2730] dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                                {c.status || 'ACTIVE'}
                                            </span>
                                            <span className="text-xs font-mono font-bold bg-[#F8FAFC] dark:bg-[#1E2730] text-[#465769] dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#465769]/40">
                                                {c.caseNumber || 'N/A'}
                                            </span>
                                        </div>

                                        <h3 className="text-base font-extrabold text-[#2A3642] dark:text-white mb-2 line-clamp-2 group-hover:text-[#465769] dark:group-hover:text-slate-300 transition-colors">
                                            {c.title}
                                        </h3>

                                        <div className="mt-auto pt-4 space-y-2.5">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-[#465769] dark:text-slate-300">
                                                <Tag size={14} className="text-[#2A3642] dark:text-slate-400" /> {c.type}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-semibold text-[#465769] dark:text-slate-300">
                                                <User size={14} className="text-[#2A3642] dark:text-slate-400" /> {c.clientName} <span className="text-[10px] opacity-70">({c.clientRole})</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-2 pt-3 border-t border-slate-100 dark:border-[#465769]/30">
                                                <Calendar size={13} /> Created: {new Date(c.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* ---- LIST VIEW ---- */}
                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm overflow-x-auto transition-colors">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                <tr className="bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 text-xs font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                                    <th className="p-5">Case Title & Ref</th>
                                    <th className="p-5">Client Details</th>
                                    <th className="p-5">Category</th>
                                    <th className="p-5">Date Added</th>
                                    <th className="p-5">Status</th>
                                    <th className="p-5 text-center">Action</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-[#465769]/30">
                                {currentCases.map((c) => (
                                    <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)} className="hover:bg-[#F8FAFC]/70 dark:hover:bg-[#1E2730]/50 transition-colors group cursor-pointer">

                                        <td className="p-5">
                                            <div className="font-extrabold text-sm text-[#2A3642] dark:text-white group-hover:text-[#465769] dark:group-hover:text-slate-300 transition">{c.title}</div>
                                            <div className="text-xs font-mono text-[#465769] dark:text-slate-400 mt-1">{c.caseNumber || 'No Ref'}</div>
                                        </td>

                                        <td className="p-5">
                                            <div className="font-bold text-xs sm:text-sm text-[#2A3642] dark:text-slate-200">{c.clientName}</div>
                                            <div className="text-[10px] text-[#465769] dark:text-slate-400 mt-0.5 uppercase tracking-wider font-extrabold">{c.clientRole}</div>
                                        </td>

                                        <td className="p-5">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[#F8FAFC] dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 border border-slate-200 dark:border-[#465769]/40">
                                                    <Tag size={12} className="text-[#465769] dark:text-slate-400" /> {c.type}
                                                </span>
                                        </td>

                                        <td className="p-5 text-xs font-bold text-[#465769] dark:text-slate-300">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </td>

                                        <td className="p-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                                    c.status === 'ACTIVE'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                        : 'bg-slate-100 text-slate-800 dark:bg-[#1E2730] dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {c.status || 'ACTIVE'}
                                                </span>
                                        </td>

                                        <td className="p-5 text-center">
                                            <button className="p-2.5 bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 group-hover:bg-[#2A3642] group-hover:text-white dark:group-hover:bg-[#465769] rounded-xl transition cursor-pointer">
                                                <Eye size={16} />
                                            </button>
                                        </td>

                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ---- PAGINATION CONTROLS ---- */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#2A3642] p-5 rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm mt-6">
                            <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 font-semibold">
                                Showing <span className="font-bold text-[#2A3642] dark:text-white">{indexOfFirstItem + 1}</span> to <span className="font-bold text-[#2A3642] dark:text-white">{Math.min(indexOfLastItem, filteredCases.length)}</span> of <span className="font-bold text-[#2A3642] dark:text-white">{filteredCases.length}</span> results
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2.5 border border-slate-200 dark:border-[#465769]/50 rounded-xl text-[#2A3642] dark:text-slate-200 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: totalPages }).map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentPage(idx + 1)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition cursor-pointer ${
                                            currentPage === idx + 1
                                                ? 'bg-[#2A3642] text-white dark:bg-[#465769] shadow-md'
                                                : 'text-[#465769] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1E2730]'
                                        }`}
                                    >
                                        {idx + 1}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2.5 border border-slate-200 dark:border-[#465769]/50 rounded-xl text-[#2A3642] dark:text-slate-200 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}