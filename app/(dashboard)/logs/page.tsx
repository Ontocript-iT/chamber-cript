'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
    Activity, Shield, User, CheckCircle,
    Search, Filter, Briefcase, Calendar, MessageSquare,
    PlusCircle, Edit3, X, RotateCcw, ArrowUpRight, Clock,
    ChevronLeft, ChevronRight
} from 'lucide-react';

type AuditLog = {
    id: string;
    firmId: string;
    userId: string;
    userName: string;
    action: string;
    description: string;
    caseId: string;
    caseTitle: string;
    createdAt: string;
};

type Member = {
    id: string;
    name: string;
    role: string;
};

export default function AuditLogsPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [hasPermission, setHasPermission] = useState(false);

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [members, setMembers] = useState<Member[]>([]);

    // Filters
    const [selectedMember, setSelectedMember] = useState('ALL');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('LAST_7');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async (userUid: string) => {
            try {
                const userDocSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', userUid)));
                const uData = userDocSnap.docs[0]?.data();

                if (!uData) return;

                if (uData.role !== 'LAWYER') {
                    if (isMounted) { setHasPermission(false); setLoading(false); }
                    return;
                }

                if (isMounted) setHasPermission(true);

                // Fetch Staff for filter
                const staffSnap = await getDocs(query(collection(db, 'users'), where('firmId', '==', uData.firmId)));
                const staffList = staffSnap.docs.map(d => ({ id: d.id, name: d.data().name, role: d.data().role }));
                if (isMounted) setMembers(staffList);

                // Fetch Audit Logs
                const logsSnap = await getDocs(query(collection(db, 'audit_logs'), where('firmId', '==', uData.firmId)));
                const fetchedLogs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));

                fetchedLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                if (isMounted) setLogs(fetchedLogs);

            } catch (error) {
                console.error("Error fetching audit logs:", error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) fetchData(user.uid); else router.push('/login');
        });

        return () => { isMounted = false; unsubscribe(); };
    }, [router]);

    // Reset to page 1 whenever filters or page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedMember, actionFilter, dateFilter, searchQuery, itemsPerPage]);

    // Filtering Logic
    const filteredLogs = logs.filter(log => {
        const matchMember = selectedMember === 'ALL' || log.userId === selectedMember;
        const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
        const q = searchQuery.toLowerCase();
        const matchSearch =
            (log.description || '').toLowerCase().includes(q) ||
            (log.userName || '').toLowerCase().includes(q) ||
            (log.caseTitle || '').toLowerCase().includes(q);

        let matchDate = true;
        const logDate = new Date(log.createdAt);
        const now = new Date();

        if (dateFilter === 'TODAY') {
            matchDate = logDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'LAST_7') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);
            matchDate = logDate >= sevenDaysAgo;
        } else if (dateFilter === 'THIS_MONTH') {
            matchDate = logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        }

        return matchMember && matchAction && matchSearch && matchDate;
    });

    // Pagination Calculations
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const indexOfFirstItem = (safePage - 1) * itemsPerPage;
    const indexOfLastItem = indexOfFirstItem + itemsPerPage;
    const paginatedLogs = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

    const getPageNumbers = (): (number | '...')[] => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (safePage <= 4) {
            return [1, 2, 3, 4, 5, '...', totalPages];
        }
        if (safePage >= totalPages - 3) {
            return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
    };

    const hasActiveFilters =
        selectedMember !== 'ALL' ||
        actionFilter !== 'ALL' ||
        dateFilter !== 'LAST_7' ||
        searchQuery.trim() !== '';

    const resetFilters = () => {
        setSelectedMember('ALL');
        setActionFilter('ALL');
        setDateFilter('LAST_7');
        setSearchQuery('');
    };

    // Helper for Action Badges & Icons
    const getActionBadge = (action: string) => {
        switch (action) {
            case 'CASE_CREATED':
                return (
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70 px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                        <PlusCircle size={13} /> New Case
                    </span>
                );
            case 'CASE_UPDATED':
                return (
                    <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/70 px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                        <Edit3 size={13} /> Case Update
                    </span>
                );
            case 'TIMELINE_ADDED':
                return (
                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/70 px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                        <Calendar size={13} /> Timeline Log
                    </span>
                );
            case 'SMS_SENT':
                return (
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70 px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                        <MessageSquare size={13} /> SMS Sent
                    </span>
                );
            case 'TASK_ASSIGNED':
            case 'TASK_UPDATED':
                return (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70 px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                        <CheckCircle size={13} /> Task Activity
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 bg-slate-100 text-[#2A3642] border border-slate-200 dark:bg-[#1E2730] dark:text-slate-300 dark:border-[#465769]/60 px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wide whitespace-nowrap">
                        {action}
                    </span>
                );
        }
    };

    const todayLogsCount = logs.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length;

    const controlStyle = "w-full bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-xl text-sm font-medium text-[#2A3642] dark:text-slate-100 outline-none focus:border-[#2A3642] dark:focus:border-slate-300 focus:ring-4 focus:ring-[#465769]/15 transition-all";

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-300"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#465769] dark:text-slate-400">Loading Audit Trail...</p>
                </div>
            </div>
        );
    }

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto p-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5 border border-rose-200 dark:border-rose-800/50 shadow-xs">
                    <Shield size={32} />
                </div>
                <h2 className="text-2xl font-black text-[#2A3642] dark:text-white mb-2">Admin Access Required</h2>
                <p className="text-sm text-[#465769] dark:text-slate-400 font-medium">
                    Only the Principal Lawyer can monitor firm-wide system activity logs.
                </p>
                <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-6 px-6 py-3 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-12">

            {/* ================= COMPACT EXECUTIVE HEADER BAR ================= */}
            <div className="bg-[#465769] dark:bg-[#2A3642] rounded-2xl px-6 py-4 shadow-sm border border-slate-200/80 dark:border-[#465769]/40 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-sm">
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                            System Activity & Audit Logs
                        </h1>
                        <p className="text-xs text-slate-200/85 font-medium mt-1">
                            Chronological trail of case actions, timeline updates, SMS dispatches, and staff tasks
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-3.5 bg-white/95 dark:bg-[#182028] px-4 py-2 rounded-xl border border-white/20 dark:border-[#465769]/50 text-xs">
                        <span className="font-bold text-[#465769] dark:text-slate-400">
                            Today: <strong className="text-[#2A3642] dark:text-white text-sm ml-1">{todayLogsCount}</strong>
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="font-bold text-[#465769] dark:text-slate-400">
                            Matched: <strong className="text-[#2A3642] dark:text-white text-sm ml-1">{filteredLogs.length}</strong>
                            <span className="text-slate-400 dark:text-slate-500 font-semibold"> / {logs.length}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* ================= HIGH-CONTRAST FILTER TOOLBAR ================= */}
            <div className="bg-[#F8FAFC] dark:bg-[#222C36] p-4 sm:p-5 rounded-3xl border border-slate-200/90 dark:border-[#465769]/40 shadow-xs space-y-3">
                <div className="flex flex-col xl:flex-row gap-3.5 items-stretch xl:items-center">

                    {/* Search Field */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#465769] dark:text-slate-400 pointer-events-none" size={17} />
                        <input
                            type="text"
                            placeholder="Search by description, staff member, or case title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${controlStyle} pl-10 pr-9 py-2.5 placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2A3642] dark:hover:text-white cursor-pointer"
                                title="Clear search"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex items-center gap-3">
                        {/* Member Filter */}
                        <div className="relative xl:min-w-[175px]">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#465769] dark:text-slate-400 pointer-events-none" />
                            <select
                                value={selectedMember}
                                onChange={(e) => setSelectedMember(e.target.value)}
                                className={`${controlStyle} pl-9 pr-4 py-2.5 font-bold cursor-pointer`}
                            >
                                <option value="ALL" className="dark:bg-[#182028]">All Staff ({members.length})</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id} className="dark:bg-[#182028]">{m.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Action Type Filter */}
                        <div className="relative xl:min-w-[180px]">
                            <Filter size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#465769] dark:text-slate-400 pointer-events-none" />
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className={`${controlStyle} pl-9 pr-4 py-2.5 font-bold cursor-pointer`}
                            >
                                <option value="ALL" className="dark:bg-[#182028]">All Actions</option>
                                <option value="CASE_CREATED" className="dark:bg-[#182028]">Case Created</option>
                                <option value="CASE_UPDATED" className="dark:bg-[#182028]">Case Updated</option>
                                <option value="TIMELINE_ADDED" className="dark:bg-[#182028]">Timeline Added</option>
                                <option value="SMS_SENT" className="dark:bg-[#182028]">SMS Sent</option>
                                <option value="TASK_ASSIGNED" className="dark:bg-[#182028]">Task Assigned</option>
                            </select>
                        </div>

                        {/* Date Filter */}
                        <div className="relative xl:min-w-[165px]">
                            <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#465769] dark:text-slate-400 pointer-events-none" />
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className={`${controlStyle} pl-9 pr-4 py-2.5 font-bold cursor-pointer`}
                            >
                                <option value="ALL" className="dark:bg-[#182028]">All Time</option>
                                <option value="TODAY" className="dark:bg-[#182028]">Today</option>
                                <option value="LAST_7" className="dark:bg-[#182028]">Last 7 Days</option>
                                <option value="THIS_MONTH" className="dark:bg-[#182028]">This Month</option>
                            </select>
                        </div>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#182028] hover:bg-slate-100 dark:hover:bg-[#2A3642] border border-slate-300 dark:border-[#465769]/80 text-xs font-extrabold text-[#465769] dark:text-slate-200 transition cursor-pointer whitespace-nowrap"
                            >
                                <RotateCcw size={14} /> Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ================= AUDIT LOGS TABLE ================= */}
            <div className="bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[920px]">
                        <thead>
                        <tr className="bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/90 dark:border-[#465769]/40 text-[11px] uppercase tracking-wider text-[#465769] dark:text-slate-300 font-black">
                            <th className="px-6 py-4">Staff Member</th>
                            <th className="px-6 py-4">Action Type</th>
                            <th className="px-6 py-4">Activity Description</th>
                            <th className="px-6 py-4">Related Case</th>
                            <th className="px-6 py-4 text-right">Timestamp</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#465769]/30">
                        {paginatedLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-16 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] text-[#465769] dark:text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-[#465769]/40">
                                        <CheckCircle size={24} />
                                    </div>
                                    <p className="text-sm font-extrabold text-[#2A3642] dark:text-white">No matching activity logs</p>
                                    <p className="text-xs text-[#465769] dark:text-slate-400 mt-1">
                                        Try expanding the date range or clearing your active filters.
                                    </p>
                                </td>
                            </tr>
                        ) : paginatedLogs.map((log) => {
                            const logDateObj = new Date(log.createdAt);
                            const initial = (log.userName || '?').charAt(0).toUpperCase();

                            return (
                                <tr
                                    key={log.id}
                                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730]/60 transition-colors"
                                >
                                    {/* Staff Member */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center text-xs font-black shrink-0 shadow-2xs">
                                                {initial}
                                            </div>
                                            <span className="font-bold text-[#2A3642] dark:text-white text-sm whitespace-nowrap">
                                                    {log.userName}
                                                </span>
                                        </div>
                                    </td>

                                    {/* Action Badge */}
                                    <td className="px-6 py-4">
                                        {getActionBadge(log.action)}
                                    </td>

                                    {/* Description */}
                                    <td className="px-6 py-4 text-sm text-[#2A3642] dark:text-slate-200 font-medium max-w-md leading-relaxed">
                                        {log.description}
                                    </td>

                                    {/* Related Case */}
                                    <td className="px-6 py-4">
                                        {log.caseTitle ? (
                                            log.caseId ? (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/cases/${log.caseId}`)}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#F8FAFC] dark:bg-[#1E2730] hover:bg-[#2A3642] hover:text-white dark:hover:bg-[#465769] text-[#2A3642] dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#465769]/50 max-w-[230px] transition cursor-pointer group"
                                                    title={log.caseTitle}
                                                >
                                                    <Briefcase size={12} className="shrink-0 opacity-75" />
                                                    <span className="truncate">{log.caseTitle}</span>
                                                    <ArrowUpRight size={12} className="shrink-0 opacity-60 group-hover:opacity-100" />
                                                </button>
                                            ) : (
                                                <span
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#F8FAFC] dark:bg-[#1E2730] text-[#465769] dark:text-slate-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#465769]/50 max-w-[230px]"
                                                    title={log.caseTitle}
                                                >
                                                        <Briefcase size={12} className="shrink-0" />
                                                        <span className="truncate">{log.caseTitle}</span>
                                                    </span>
                                            )
                                        ) : (
                                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">—</span>
                                        )}
                                    </td>

                                    {/* Timestamp */}
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <div className="text-xs font-bold text-[#2A3642] dark:text-slate-200">
                                            {logDateObj.toLocaleDateString()}
                                        </div>
                                        <div className="inline-flex items-center gap-1 text-[11px] font-mono text-[#465769] dark:text-slate-400 mt-0.5">
                                            <Clock size={11} />
                                            {logDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                {/* ================= PAGINATION FOOTER ================= */}
                {filteredLogs.length > 0 && (
                    <div className="px-6 py-4 bg-[#F8FAFC] dark:bg-[#222C36] border-t border-slate-200/80 dark:border-[#465769]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
                            <p className="text-xs font-semibold text-[#465769] dark:text-slate-300">
                                Showing <strong className="text-[#2A3642] dark:text-white">{indexOfFirstItem + 1}</strong> to{' '}
                                <strong className="text-[#2A3642] dark:text-white">{Math.min(indexOfLastItem, filteredLogs.length)}</strong> of{' '}
                                <strong className="text-[#2A3642] dark:text-white">{filteredLogs.length}</strong> logs
                            </p>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#465769] dark:text-slate-400">Rows:</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="px-2.5 py-1.5 bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-lg text-xs font-bold text-[#2A3642] dark:text-white outline-none cursor-pointer"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={safePage === 1}
                                    className="p-2 bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-xl text-[#2A3642] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2A3642] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Previous page"
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {getPageNumbers().map((page, idx) =>
                                    page === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-xs font-bold text-slate-400 select-none">
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`min-w-[34px] h-[34px] px-2 flex items-center justify-center rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                                safePage === page
                                                    ? 'bg-[#2A3642] dark:bg-[#465769] text-white shadow-sm'
                                                    : 'bg-white dark:bg-[#182028] border border-slate-200 dark:border-[#465769]/50 text-[#465769] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A3642]'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                )}

                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={safePage === totalPages}
                                    className="p-2 bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-xl text-[#2A3642] dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#2A3642] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    title="Next page"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}