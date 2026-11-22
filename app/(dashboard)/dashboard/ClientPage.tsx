'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, increment } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
    Briefcase, Calendar as CalendarIcon, Clock, CheckCircle, AlertTriangle,
    Send, Plus, X, MessageSquare, ArrowRight, CalendarDays,
    ChevronDown, ChevronUp, Trash2, FileText, Save, ChevronLeft, ChevronRight,
    Shield, Scale
} from 'lucide-react';

import { logActivity } from '@/lib/logger';

type LogEntry = {
    id: string; caseId: string; caseTitle: string; clientName: string; contactNo: string;
    date: string; type: string; customType?: string; status: string; notes: string; staffName: string;
};
type SectionState = { details: boolean; client: boolean; docs: boolean; notes: boolean; };
type DocEntry = { id: string; name: string; file: File | null; url?: string };
type CustomField = { id: string; key: string; value: string };

export default function DashboardPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [firmId, setFirmId] = useState('');

    const [hasWritePermission, setHasWritePermission] = useState(false);
    const [hasSmsPermission, setHasSmsPermission] = useState(false);

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [stats, setStats] = useState({ activeCases: 0, pendingTasks: 0 });

    const [formSections, setFormSections] = useState<SectionState>({ details: false,
        client: false,
        docs: false,
        notes: false,});
    const [showRegSmsModal, setShowRegSmsModal] = useState(false);
    const [formSaving, setFormSaving] = useState(false);

    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string }>({
        isOpen: false, message: '', title: 'Notification'
    });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; title?: string; onConfirm: () => void }>({
        isOpen: false, message: '', title: 'Confirm Action', onConfirm: () => {}
    });

    const initialForm = {
        caseNumber: '', chamberRef: '', title: '', type: '', customType: '', subtype: '',
        clientRole: '', customClientRole: '', clientName: '', idType: 'NIC', idNumber: '',
        contactNo: '', email: '', address: '', notes: ''
    };
    const [formData, setFormData] = useState(initialForm);
    const [docs, setDocs] = useState<DocEntry[]>([{ id: Date.now().toString(), name: '', file: null }]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);

    const [agendaTab, setAgendaTab] = useState<'TODAY' | 'TOMORROW' | 'WEEK'>('TODAY');

    const [postponeModal, setPostponeModal] = useState<{ isOpen: boolean; log: LogEntry | null; newDate: string; sendSms: boolean; smsText: string }>({
        isOpen: false, log: null, newDate: '', sendSms: true, smsText: ''
    });
    const [smsModal, setSmsModal] = useState<{ isOpen: boolean; log: LogEntry | null; smsText: string }>({ isOpen: false, log: null, smsText: '' });

    const todayStr = new Date().toISOString().split('T')[0];
    const [showCalendar, setShowCalendar] = useState(false);
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const [selectedCalDate, setSelectedCalDate] = useState<string>(todayStr);
    const [showOverdueView, setShowOverdueView] = useState(false);

    const [calPage, setCalPage] = useState(1);
    const CAL_PER_PAGE = 5;

    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
    const tomorrowStr = tmrw.toISOString().split('T')[0];
    const getEndOfWeek = () => {
        const d = new Date(); const day = d.getDay();
        return new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1) + 6)).toISOString().split('T')[0];
    };
    const weekEndStr = getEndOfWeek();

    useEffect(() => { setCalPage(1); }, [selectedCalDate, showOverdueView]);

    useEffect(() => {
        let isMounted = true;
        const fetchData = async (userUid: string) => {
            try {
                const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userUid)));
                const uData = userDoc.docs[0]?.data();
                if (!uData) return;

                if (isMounted) {
                    setUserName(uData.name);
                    setFirmId(uData.firmId);

                    const isLawyer = uData.role === 'LAWYER';
                    setHasWritePermission(isLawyer || uData.permissions?.includes('cases.write') || uData.permissions?.includes('tasks.write'));
                    setHasSmsPermission(isLawyer || uData.permissions?.includes('sms.send'));
                }

                const casesSnap = await getDocs(query(collection(db, 'cases'), where('firmId', '==', uData.firmId)));
                let activeCount = 0;
                let allLogs: LogEntry[] = [];

                for (const cDoc of casesSnap.docs) {
                    const cData = cDoc.data();
                    if (cData.status === 'ACTIVE') activeCount++;
                    const tlSnap = await getDocs(collection(db, 'cases', cDoc.id, 'timeline'));
                    tlSnap.docs.forEach(t => {
                        allLogs.push({ ...t.data(), id: t.id, caseId: cDoc.id, caseTitle: cData.title, clientName: cData.clientName, contactNo: cData.contactNo } as LogEntry);
                    });
                }

                if (isMounted) {
                    setStats({ activeCases: activeCount, pendingTasks: allLogs.filter(l => l.status !== 'Completed').length });
                    setLogs(allLogs);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        const unsub = onAuthStateChanged(auth, user => {
            if (user) fetchData(user.uid); else router.push('/login');
        });

        return () => { isMounted = false; unsub(); };
    }, [router]);

    const validateForm = () => {
        if (!formData.title) {
            setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Case title is required.' });
            return true;
        }
        if (!formData.clientName) {
            setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Client name is required.' });
            return true;
        }
        const phoneRegex = /^(?:0|94|\+94)?(?:7\d{8}|[1-9]\d{8})$/;
        if (!phoneRegex.test(formData.contactNo)) {
            setAlertModal({ isOpen: true, title: 'Invalid Number', message: 'Invalid contact number format.' });
            return true;
        }
        if (formData.idType === 'NIC' && formData.idNumber) {
            const nicRegex = /^([0-9]{9}[x|X|v|V]|[0-9]{12})$/;
            if (!nicRegex.test(formData.idNumber)) {
                setAlertModal({ isOpen: true, title: 'Invalid NIC', message: 'Invalid NIC format.' });
                return true;
            }
        }
        return false;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleSection = (sec: keyof SectionState) => {
        setFormSections({ ...formSections, [sec]: !formSections[sec] });
    };


    const clearForm = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear Form',
            message: 'Are you sure you want to clear all input fields?',
            onConfirm: () => {
                setFormData(initialForm);
                setDocs([{ id: Date.now().toString(), name: '', file: null }]);
                setCustomFields([]);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const submitCase = async (sendSms: boolean) => {
        if (!hasWritePermission) {
            setAlertModal({ isOpen: true, title: 'Permission Denied', message: "You don't have permission to register cases." });
            return;
        }
        if (validateForm()) return;

        setFormSaving(true);
        try {
            const uploadedDocs = [];
            for (const d of docs) {
                if (d.file && d.name) {
                    const fileData = new FormData();
                    fileData.append('file', d.file); fileData.append('fileName', d.file.name);
                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fileData });
                    const uploadData = await uploadRes.json();
                    if (uploadData.success) uploadedDocs.push({ name: d.name, url: uploadData.url });
                }
            }

            const finalType = formData.type === 'Other' ? formData.customType : formData.type;
            const finalRole = formData.clientRole === 'Other' ? formData.customClientRole : formData.clientRole;

            await addDoc(collection(db, 'cases'), {
                firmId, ...formData, type: finalType, clientRole: finalRole, documents: uploadedDocs,
                customFields: customFields.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
                status: 'ACTIVE', createdAt: new Date().toISOString()
            });

            await logActivity(firmId, auth.currentUser!.uid, userName, 'CASE_CREATED', `Registered new case: ${formData.title}`, '', formData.title);

            if (sendSms && hasSmsPermission) {
                const message = `Dear ${formData.clientName},\nYour case "${formData.title}" (${finalType}) has been successfully registered.\n\n${userName}`;
                await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: formData.contactNo, message }) });
                await updateDoc(doc(db, 'firms', firmId), { smsQuota: increment(-1) });
            }

            setAlertModal({ isOpen: true, title: 'Success', message: 'Case Registered Successfully!' });
            setFormData(initialForm); setDocs([{ id: Date.now().toString(), name: '', file: null }]); setCustomFields([]);
            setStats(s => ({ ...s, activeCases: s.activeCases + 1 }));
        } catch (err: any) {
            setAlertModal({ isOpen: true, title: 'Error', message: "An error occurred: " + err.message });
        } finally {
            setFormSaving(false);
            setShowRegSmsModal(false);
        }
    };

    const handleStatusChange = async (log: LogEntry, newStatus: string) => {
        if (!hasWritePermission) {
            setAlertModal({ isOpen: true, title: 'Permission Denied', message: "Permission Denied." });
            return;
        }
        if (newStatus === 'Postponed') {
            const defaultMsg = `Dear ${log.clientName},\nYour case "${log.caseTitle}" update (${log.type}) has been postponed.\nNew date will be updated soon.`;
            setPostponeModal({ isOpen: true, log, newDate: '', sendSms: hasSmsPermission, smsText: defaultMsg });
        } else {
            try {
                await updateDoc(doc(db, 'cases', log.caseId, 'timeline', log.id), { status: newStatus });
                setLogs(logs.map(l => l.id === log.id ? { ...l, status: newStatus } : l));
            } catch (err) {
                setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to update status.' });
            }
        }
    };

    const savePostpone = async () => {
        const { log, newDate, sendSms, smsText } = postponeModal;
        if (!log || !newDate) {
            setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Please select a new date.' });
            return;
        }
        try {
            await updateDoc(doc(db, 'cases', log.caseId, 'timeline', log.id), { status: 'Postponed', date: newDate });
            if (sendSms && smsText && hasSmsPermission) {
                await fetch('/api/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: log.contactNo, message: smsText }) });
                await addDoc(collection(db, 'cases', log.caseId, 'messages'), { message: smsText, sentTo: log.contactNo, status: 'Sent', sentAt: new Date().toISOString() });
                await updateDoc(doc(db, 'firms', firmId), { smsQuota: increment(-1) });
            }
            setLogs(logs.map(l => l.id === log.id ? { ...l, status: 'Postponed', date: newDate } : l));
            setPostponeModal({ isOpen: false, log: null, newDate: '', sendSms: true, smsText: '' });
            setAlertModal({ isOpen: true, title: 'Success', message: 'Postponed Successfully!' });
        } catch (err) {
            setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to postpone.' });
        }
    };

    const sendQuickSms = async () => {
        if (!hasWritePermission && !hasSmsPermission) {
            setAlertModal({ isOpen: true, title: 'Permission Denied', message: "Permission Denied." });
            return;
        }
        const { log, smsText } = smsModal;
        if (!log || !smsText) return;

        try {
            const res = await fetch('/api/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: log.contactNo, message: smsText })
            });
            const data = await res.json();

            if (data.success) {
                await addDoc(collection(db, 'cases', log.caseId, 'messages'), {
                    firmId: firmId,
                    message: smsText,
                    sentTo: log.contactNo,
                    status: 'Sent',
                    sentAt: new Date().toISOString()
                });

                await updateDoc(doc(db, 'firms', firmId), { smsQuota: increment(-1) });
                await logActivity(firmId, auth.currentUser!.uid, userName, 'SMS_SENT', `Sent quick SMS to client (${log.contactNo})`, log.caseId, log.caseTitle);

                setAlertModal({ isOpen: true, title: 'Success', message: 'SMS Sent!' });
                setSmsModal({ isOpen: false, log: null, smsText: '' });

            } else {
                await addDoc(collection(db, 'cases', log.caseId, 'messages'), {
                    firmId: firmId,
                    message: smsText,
                    sentTo: log.contactNo,
                    status: 'Failed',
                    sentAt: new Date().toISOString()
                });

                throw new Error(data.error || "SMS API Provider Failed");
            }
        } catch (err: any) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: "Failed to send SMS: " + err.message });
        }
    };

    // Helper for Status Badge Colors
    const getStatusBadgeStyle = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'complete':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
            case 'urgent':
                return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
            case 'postponed':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
            default: // Pending
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
        }
    };

    const pendingLogs = logs.filter(l => l.status !== 'Completed');
    const overdueLogs = pendingLogs.filter(l => l.date < todayStr).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const todayCount = pendingLogs.filter(l => l.date === todayStr).length;
    const tomorrowCount = pendingLogs.filter(l => l.date === tomorrowStr).length;
    const weekCount = pendingLogs.filter(l => l.date >= todayStr && l.date <= weekEndStr).length;

    const agendaTabs = [
        { id: 'TODAY', label: 'TODAY', count: todayCount },
        { id: 'TOMORROW', label: 'TOMORROW', count: tomorrowCount },
        { id: 'WEEK', label: 'THIS WEEK', count: weekCount }
    ];

    const getAgendaLogs = () => {
        if (agendaTab === 'TODAY') return pendingLogs.filter(l => l.date === todayStr);
        if (agendaTab === 'TOMORROW') return pendingLogs.filter(l => l.date === tomorrowStr);
        if (agendaTab === 'WEEK') return pendingLogs.filter(l => l.date >= todayStr && l.date <= weekEndStr);
        return [];
    };

    const handlePrevMonth = () => {
        if (calMonth === 0) { setCalMonth(11); setCalYear(prev => prev - 1); }
        else { setCalMonth(prev => prev - 1); }
    };

    const handleNextMonth = () => {
        if (calMonth === 11) { setCalMonth(0); setCalYear(prev => prev + 1); }
        else { setCalMonth(prev => prev + 1); }
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const generateCalendarDays = () => {
        const firstDay = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        let days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        return days;
    };

    const displayedModalLogs = showOverdueView ? overdueLogs : logs.filter(l => l.date === selectedCalDate);
    const calPageCount = Math.ceil(displayedModalLogs.length / CAL_PER_PAGE) || 1;
    const currentModalLogs = displayedModalLogs.slice((calPage - 1) * CAL_PER_PAGE, calPage * CAL_PER_PAGE);

    const inputStyle = "w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200/90 dark:border-[#465769]/40 rounded-xl text-[15px] font-medium text-[#2A3642] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-[#2A3642] focus:border-[#465769] dark:focus:border-slate-400 focus:ring-4 focus:ring-[#465769]/10 transition-all duration-200";
    const labelStyle = "block text-xs font-bold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2";

    if (loading) {
        return (
            <div className="flex h-[85vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-300"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#465769] dark:text-slate-400">Loading Workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-4 pb-10">

            {/* ================= COMPACT TOP METRICS BAR ================= */}
            <div className="bg-[#465769] dark:bg-[#2A3642] rounded-2xl px-6 py-4 shadow-2xs border border-slate-200/80 dark:border-[#465769]/40 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center text-sm font-black shadow-sm">
                        {userName ? userName.charAt(0) : 'L'}
                    </div>
                    <div>
                        <h1 className="text-xs font-black uppercase tracking-wider text-white">Lawyer Dashboard</h1>
                        <p className="text-xs text-slate-100 dark:text-slate-300 font-semibold">{userName || 'Active Session'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3.5 bg-white/90 dark:bg-[#1E2730] px-5 py-2 rounded-xl border border-white/20 dark:border-[#465769]/30 text-xs">
                        <span className="font-bold text-[#465769] dark:text-slate-300">Active Cases: <strong className="text-[#2A3642] dark:text-white text-sm ml-1">{stats.activeCases}</strong></span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="font-bold text-[#465769] dark:text-slate-300">Pending Tasks: <strong className="text-amber-600 dark:text-amber-400 text-sm ml-1">{stats.pendingTasks}</strong></span>
                    </div>

                    <button
                        onClick={() => { setShowCalendar(true); setSelectedCalDate(todayStr); setShowOverdueView(false); }}
                        className="flex items-center gap-2 bg-[#2A3642] hover:bg-[#354453] dark:bg-[#465769] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition cursor-pointer border border-white/10"
                    >
                        <CalendarDays size={16} />
                        <span>Master Calendar</span>
                    </button>
                </div>
            </div>

            {/* ================= MAIN WORKSPACE GRID ================= */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* ================= LEFT: CASE REGISTRATION SUITE (8 Cols) ================= */}
                <div className="xl:col-span-8 bg-white dark:bg-[#2A3642] rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 overflow-hidden transition-colors">

                    {/* Suite Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-6 sm:px-8 py-5 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-sm">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-[#2A3642] dark:text-white tracking-tight leading-none">
                                    New Case Registration
                                </h2>
                                <p className="text-xs text-[#465769] dark:text-slate-300 font-medium mt-1">
                                    Complete the sections below to onboard a new legal file
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={clearForm}
                            className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/50 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                            <Trash2 size={14} /> Reset Form
                        </button>
                    </div>

                    {!hasWritePermission ? (
                        <div className="p-12 text-center">
                            <div className="max-w-md mx-auto bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-6 text-rose-700 dark:text-rose-300">
                                <Shield size={32} className="mx-auto mb-2 opacity-80" />
                                <p className="font-bold text-sm">Restricted Access</p>
                                <p className="text-xs mt-1 opacity-80">You do not have permission to register new cases (cases.write required).</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 sm:p-8 space-y-4.5">

                            {/* SECTION 01: CASE DETAILS */}
                            <div className="rounded-2xl border border-slate-200/90 dark:border-[#465769]/40 overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('details')}
                                    className="w-full flex justify-between items-center px-5 py-4 bg-[#F8FAFC] dark:bg-[#222C36] hover:bg-slate-100/80 dark:hover:bg-[#1E2730] transition text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">01</span>
                                        <div>
                                            <h3 className="font-bold text-sm sm:text-base text-[#2A3642] dark:text-white">Case Identification & Classification</h3>
                                            <p className="text-xs text-[#465769] dark:text-slate-300">Reference numbers, court category, and primary title</p>
                                        </div>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-white dark:bg-[#2A3642] text-[#465769] dark:text-slate-300 border border-slate-200/70 dark:border-[#465769]/40">
                                        {formSections.details ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>

                                {formSections.details && (
                                    <div className="p-5 sm:p-6 bg-white dark:bg-[#2A3642] grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 dark:border-[#465769]/30">
                                        <div>
                                            <label className={labelStyle}>Court Case Number</label>
                                            <input type="text" name="caseNumber" placeholder="e.g. DC/1024/26 (Optional)" value={formData.caseNumber} onChange={handleInputChange} className={inputStyle} />
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Chamber Reference</label>
                                            <input type="text" name="chamberRef" placeholder="e.g. CH-2026-089 (Optional)" value={formData.chamberRef} onChange={handleInputChange} className={inputStyle} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelStyle}>Case Title / Heading <span className="text-rose-500">*</span></label>
                                            <input type="text" name="title" placeholder="Enter formal case title or dispute subject..." value={formData.title} onChange={handleInputChange} className={inputStyle} required />
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Case Category <span className="text-rose-500">*</span></label>
                                            <select name="type" value={formData.type} onChange={handleInputChange} className={inputStyle}>
                                                <option value="">Select Case Type...</option>
                                                <option value="Civil">Civil Litigation</option>
                                                <option value="Criminal">Criminal Defense</option>
                                                <option value="Commercial">Commercial / Corporate</option>
                                                <option value="Family">Family & Matrimonial</option>
                                                <option value="Other">Custom Category...</option>
                                            </select>
                                            {formData.type === 'Other' && (
                                                <input type="text" name="customType" placeholder="Specify custom case type..." value={formData.customType} onChange={handleInputChange} className={`${inputStyle} mt-3`} />
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Client Capacity / Role <span className="text-rose-500">*</span></label>
                                            <select name="clientRole" value={formData.clientRole} onChange={handleInputChange} className={inputStyle}>
                                                <option value="">Select Client Role...</option>
                                                <option value="Plaintiff">Plaintiff</option>
                                                <option value="Defendant">Defendant</option>
                                                <option value="Petitioner">Petitioner</option>
                                                <option value="Respondent">Respondent</option>
                                                <option value="Other">Custom Role...</option>
                                            </select>
                                            {formData.clientRole === 'Other' && (
                                                <input type="text" name="customClientRole" placeholder="Specify custom role..." value={formData.customClientRole} onChange={handleInputChange} className={`${inputStyle} mt-3`} />
                                            )}
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelStyle}>Subtype / Jurisdiction Note</label>
                                            <input type="text" name="subtype" placeholder="e.g. Land Dispute - District Court Kandy" value={formData.subtype} onChange={handleInputChange} className={inputStyle} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 02: CLIENT INFORMATION */}
                            <div className="rounded-2xl border border-slate-200/90 dark:border-[#465769]/40 overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('client')}
                                    className="w-full flex justify-between items-center px-5 py-4 bg-[#F8FAFC] dark:bg-[#222C36] hover:bg-slate-100/80 dark:hover:bg-[#1E2730] transition text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">02</span>
                                        <div>
                                            <h3 className="font-bold text-sm sm:text-base text-[#2A3642] dark:text-white">Client Profile & Contact Details</h3>
                                            <p className="text-xs text-[#465769] dark:text-slate-300">Identity verification and primary SMS notification number</p>
                                        </div>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-white dark:bg-[#2A3642] text-[#465769] dark:text-slate-300 border border-slate-200/70 dark:border-[#465769]/40">
                                        {formSections.client ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>

                                {formSections.client && (
                                    <div className="p-5 sm:p-6 bg-white dark:bg-[#2A3642] grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 dark:border-[#465769]/30">
                                        <div className="md:col-span-2">
                                            <label className={labelStyle}>Client Full Name <span className="text-rose-500">*</span></label>
                                            <input type="text" name="clientName" placeholder="Enter client's legal full name..." value={formData.clientName} onChange={handleInputChange} className={inputStyle} required />
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Identification Document</label>
                                            <div className="flex gap-2.5">
                                                <select name="idType" value={formData.idType} onChange={handleInputChange} className={`${inputStyle} !w-2/5`}>
                                                    <option value="NIC">NIC</option>
                                                    <option value="Passport">Passport</option>
                                                    <option value="Driving License">License</option>
                                                </select>
                                                <input type="text" name="idNumber" placeholder="ID Number" value={formData.idNumber} onChange={handleInputChange} className={`${inputStyle} !w-3/5`} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Mobile Number (SMS Alerts) <span className="text-rose-500">*</span></label>
                                            <input type="text" name="contactNo" placeholder="e.g. 0771234567" value={formData.contactNo} onChange={handleInputChange} className={inputStyle} required />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelStyle}>Email Address</label>
                                            <input type="email" name="email" placeholder="client@domain.com (Optional)" value={formData.email} onChange={handleInputChange} className={inputStyle} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelStyle}>Permanent / Postal Address</label>
                                            <textarea name="address" placeholder="Enter complete residential or corporate address..." value={formData.address} onChange={handleInputChange} className={inputStyle} rows={2}></textarea>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 03: DOCUMENTS */}
                            <div className="rounded-2xl border border-slate-200/90 dark:border-[#465769]/40 overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('docs')}
                                    className="w-full flex justify-between items-center px-5 py-4 bg-[#F8FAFC] dark:bg-[#222C36] hover:bg-slate-100/80 dark:hover:bg-[#1E2730] transition text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">03</span>
                                        <div>
                                            <h3 className="font-bold text-sm sm:text-base text-[#2A3642] dark:text-white">Case Evidences & Annexures</h3>
                                            <p className="text-xs text-[#465769] dark:text-slate-300">Upload deeds, proxies, plaint copies, or police reports</p>
                                        </div>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-white dark:bg-[#2A3642] text-[#465769] dark:text-slate-300 border border-slate-200/70 dark:border-[#465769]/40">
                                        {formSections.docs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>

                                {formSections.docs && (
                                    <div className="p-5 sm:p-6 bg-white dark:bg-[#2A3642] space-y-4 border-t border-slate-100 dark:border-[#465769]/30">
                                        {docs.map((docItem, index) => (
                                            <div key={docItem.id} className="flex flex-col md:flex-row gap-3 items-center bg-[#F8FAFC] dark:bg-[#1E2730] p-4 rounded-xl border border-dashed border-slate-300 dark:border-[#465769]/60">
                                                <div className="w-full md:w-2/5">
                                                    <input
                                                        type="text"
                                                        placeholder="Document Title (e.g. Proxy / Deed)"
                                                        value={docItem.name}
                                                        onChange={(e) => { const nd = [...docs]; nd[index].name = e.target.value; setDocs(nd); }}
                                                        className="w-full px-4 py-2.5 bg-white dark:bg-[#2A3642] border border-slate-200 dark:border-[#465769]/50 rounded-xl text-sm font-medium outline-none focus:border-[#465769] dark:text-white"
                                                    />
                                                </div>
                                                <div className="w-full md:flex-1">
                                                    <input
                                                        type="file"
                                                        onChange={(e) => { const nd = [...docs]; nd[index].file = e.target.files ? e.target.files[0] : null; setDocs(nd); }}
                                                        className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#2A3642] dark:file:bg-[#465769] file:text-white hover:file:opacity-90 file:cursor-pointer"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setDocs(docs.filter((_, i) => i !== index))}
                                                    className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition self-end md:self-center cursor-pointer"
                                                    title="Remove attachment"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => setDocs([...docs, { id: Date.now().toString(), name: '', file: null }])}
                                            className="inline-flex items-center gap-2 text-xs font-bold text-[#2A3642] dark:text-slate-200 bg-[#F8FAFC] dark:bg-[#1E2730] hover:bg-slate-200/70 dark:hover:bg-[#465769]/40 border border-slate-200/90 dark:border-[#465769]/50 px-4 py-3 rounded-xl transition cursor-pointer"
                                        >
                                            <Plus size={15} /> Add Another Document
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 04: NOTES & CUSTOM METADATA */}
                            <div className="rounded-2xl border border-slate-200/90 dark:border-[#465769]/40 overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('notes')}
                                    className="w-full flex justify-between items-center px-5 py-4 bg-[#F8FAFC] dark:bg-[#222C36] hover:bg-slate-100/80 dark:hover:bg-[#1E2730] transition text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#2A3642] dark:bg-[#465769] text-white">04</span>
                                        <div>
                                            <h3 className="font-bold text-sm sm:text-base text-[#2A3642] dark:text-white">Internal Remarks & Custom Attributes</h3>
                                            <p className="text-xs text-[#465769] dark:text-slate-300">Confidential case briefing and dynamic key-value metadata</p>
                                        </div>
                                    </div>
                                    <div className="p-1.5 rounded-lg bg-white dark:bg-[#2A3642] text-[#465769] dark:text-slate-300 border border-slate-200/70 dark:border-[#465769]/40">
                                        {formSections.notes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>

                                {formSections.notes && (
                                    <div className="p-5 sm:p-6 bg-white dark:bg-[#2A3642] space-y-5 border-t border-slate-100 dark:border-[#465769]/30">
                                        <div>
                                            <label className={labelStyle}>Confidential Case Notes</label>
                                            <textarea name="notes" placeholder="Record background facts, opposing counsel details, or fee arrangements..." value={formData.notes} onChange={handleInputChange} className={inputStyle} rows={3}></textarea>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 dark:border-[#465769]/30 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className={labelStyle}>Custom Metadata Fields</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomFields([...customFields, { id: Date.now().toString(), key: '', value: '' }])}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#465769] dark:text-slate-300 hover:text-[#2A3642] dark:hover:text-white transition cursor-pointer"
                                                >
                                                    <Plus size={14} /> Add Attribute
                                                </button>
                                            </div>

                                            {customFields.length === 0 ? (
                                                <p className="text-xs text-slate-400 dark:text-slate-400 italic">No custom attributes added yet (e.g., Presiding Judge, Opposing Counsel).</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {customFields.map((field, index) => (
                                                        <div key={field.id} className="flex gap-3 items-center">
                                                            <input
                                                                type="text"
                                                                placeholder="Label (e.g. Judge)"
                                                                value={field.key}
                                                                onChange={(e) => { const n = [...customFields]; n[index].key = e.target.value; setCustomFields(n); }}
                                                                className={`${inputStyle} !w-1/3`}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Value"
                                                                value={field.value}
                                                                onChange={(e) => { const n = [...customFields]; n[index].value = e.target.value; setCustomFields(n); }}
                                                                className={`${inputStyle} !w-2/3`}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))}
                                                                className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FORM FOOTER ACTIONS */}
                            <div className="pt-4 border-t border-slate-200/80 dark:border-[#465769]/40 flex flex-col sm:flex-row justify-end gap-3.5">
                                <button
                                    onClick={() => submitCase(false)}
                                    disabled={formSaving || !hasWritePermission}
                                    className="px-6 py-3.5 rounded-xl border-2 border-[#465769] text-[#2A3642] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    <Save size={16} /> Register Without SMS
                                </button>
                                <button
                                    onClick={() => { if (!validateForm()) setShowRegSmsModal(true); }}
                                    disabled={formSaving || !hasWritePermission}
                                    className="px-7 py-3.5 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#56697e] text-white font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {formSaving ? 'Processing...' : <><Send size={16} /> Register & Dispatch SMS</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ================= RIGHT: EXECUTIVE AGENDA PANEL (4 Cols) ================= */}
                <div className="xl:col-span-4 bg-white dark:bg-[#2A3642] rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 flex flex-col xl:sticky xl:top-20 max-h-[86vh] overflow-hidden">

                    {/* Agenda Header */}
                    <div className="px-5 py-4 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#465769]/15 dark:bg-[#465769] text-[#2A3642] dark:text-white flex items-center justify-center">
                                <CalendarIcon size={17} />
                            </div>
                            <div>
                                <h2 className="text-sm sm:text-base font-extrabold text-[#2A3642] dark:text-white leading-none">Action Agenda</h2>
                                <p className="text-xs text-[#465769] dark:text-slate-300 mt-1">Hearings, filings & follow-ups</p>
                            </div>
                        </div>
                        {overdueLogs.length > 0 && (
                            <button
                                onClick={() => { setShowCalendar(true); setShowOverdueView(true); setSelectedCalDate(''); }}
                                className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-extrabold flex items-center gap-1.5 hover:bg-rose-200 transition cursor-pointer"
                            >
                                <AlertTriangle size={13} /> {overdueLogs.length} Overdue
                            </button>
                        )}
                    </div>

                    {/* Segmented Filter Control */}
                    <div className="p-3 bg-white dark:bg-[#2A3642] border-b border-slate-100 dark:border-[#465769]/30">
                        <div className="grid grid-cols-3 gap-1.5 bg-[#F8FAFC] dark:bg-[#1E2730] p-1.5 rounded-2xl border border-slate-200/60 dark:border-[#465769]/30">
                            {agendaTabs.map(tab => {
                                const active = agendaTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setAgendaTab(tab.id as any)}
                                        className={`py-2 px-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                            active
                                                ? 'bg-[#2A3642] dark:bg-[#465769] text-white shadow-sm'
                                                : 'text-[#465769] dark:text-slate-300 hover:text-[#2A3642] dark:hover:text-white'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-[#2A3642] text-[#2A3642] dark:text-slate-200'}`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Agenda Feed */}
                    <div className="p-4 flex-1 overflow-y-auto space-y-3">
                        {getAgendaLogs().length === 0 ? (
                            <div className="text-center py-14 px-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] text-[#465769] dark:text-slate-300 flex items-center justify-center mx-auto mb-2.5 border border-slate-200/60 dark:border-[#465769]/30">
                                    <CheckCircle size={22} />
                                </div>
                                <p className="text-sm font-bold text-[#2A3642] dark:text-slate-200">Schedule Clear</p>
                                <p className="text-xs text-slate-400 mt-0.5">No pending timeline tasks for this window.</p>
                            </div>
                        ) : getAgendaLogs().map(log => (
                            <div
                                key={log.id}
                                className="group p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200/80 dark:border-[#465769]/40 hover:border-[#465769] dark:hover:border-slate-400 hover:bg-white dark:hover:bg-[#232E38] transition-all shadow-2xs"
                            >
                                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#2A3642] dark:bg-[#465769] text-white">
                                        {log.type}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${getStatusBadgeStyle(log.status)}`}>
                                            {log.status}
                                        </span>
                                        <span className="text-xs font-bold text-[#465769] dark:text-slate-200 bg-white dark:bg-[#2A3642] px-2.5 py-0.5 rounded-lg border border-slate-200/70 dark:border-[#465769]/40">
                                            {log.date}
                                        </span>
                                    </div>
                                </div>

                                <h4 className="font-bold text-[#2A3642] dark:text-white text-sm leading-snug line-clamp-2">
                                    {log.caseTitle}
                                </h4>
                                <p className="text-xs text-[#465769] dark:text-slate-300 mt-1.5 truncate font-semibold">
                                    {log.clientName} • {log.contactNo}
                                </p>

                                {/* Action Bar */}
                                <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-slate-200/70 dark:border-[#465769]/30">
                                    <select
                                        value={log.status}
                                        onChange={e => handleStatusChange(log, e.target.value)}
                                        disabled={!hasWritePermission}
                                        className="text-xs py-2 px-3 border border-slate-200 dark:border-[#465769]/50 rounded-xl bg-white dark:bg-[#2A3642] flex-1 font-bold text-[#2A3642] dark:text-slate-100 outline-none focus:border-[#465769] disabled:opacity-50"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Completed">Complete</option>
                                        <option value="Postponed">Postpone</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>

                                    {hasSmsPermission && (
                                        <button
                                            onClick={() => setSmsModal({ isOpen: true, log, smsText: `Update on ${log.caseTitle}: ` })}
                                            className="p-2.5 rounded-xl bg-[#465769]/10 dark:bg-[#465769]/30 text-[#2A3642] dark:text-white hover:bg-[#2A3642] hover:text-white transition cursor-pointer"
                                            title="Send Quick SMS"
                                        >
                                            <MessageSquare size={16} />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => router.push(`/cases/${log.caseId}`)}
                                        className="p-2.5 rounded-xl bg-white dark:bg-[#2A3642] border border-slate-200 dark:border-[#465769]/50 text-[#2A3642] dark:text-slate-200 hover:bg-[#2A3642] hover:text-white transition cursor-pointer"
                                        title="Open Case File"
                                    >
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* ================= MASTER CALENDAR FULLSCREEN MODAL (Fixed Overlap using top-[72px]) ================= */}
            {showCalendar && (
                <div
                    className="fixed inset-x-0 bottom-0 top-[72px] z-[999] bg-[#F8FAFC] dark:bg-[#182028] overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col">
                    <div
                        className="flex flex-wrap justify-between items-center gap-4 mb-6 bg-white dark:bg-[#2A3642] px-6 py-4 rounded-2xl border border-slate-200/80 dark:border-[#465769]/40 shadow-xs">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center">
                                    <CalendarIcon size={20}/>
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-black text-[#2A3642] dark:text-white">Master
                                        Diary & Calendar</h2>
                                    <p className="text-xs text-[#465769] dark:text-slate-300">Firm-wide court dates and
                                        task schedule</p>
                                </div>
                            </div>

                            {overdueLogs.length > 0 && (
                                <button
                                    onClick={() => {
                                        setShowOverdueView(true);
                                        setSelectedCalDate('');
                                    }}
                                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                                        showOverdueView
                                            ? 'bg-rose-600 text-white shadow-md'
                                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                                    }`}
                                >
                                    <AlertTriangle size={15}/> {overdueLogs.length} Overdue
                                    Task{overdueLogs.length > 1 ? 's' : ''}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setShowCalendar(false)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] hover:bg-slate-200 dark:hover:bg-[#465769] text-[#2A3642] dark:text-white font-bold text-xs border border-slate-200 dark:border-[#465769]/50 transition cursor-pointer"
                        >
                            <X size={18}/> Close Diary
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                        <div
                            className="lg:col-span-8 bg-white dark:bg-[#2A3642] rounded-3xl p-6 border border-slate-200/80 dark:border-[#465769]/40 shadow-xs flex flex-col">
                            <div
                                className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-[#465769]/30">
                                <button onClick={handlePrevMonth}
                                        className="p-2.5 border border-slate-200 dark:border-[#465769]/50 rounded-xl hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] text-[#2A3642] dark:text-white transition cursor-pointer">
                                    <ChevronLeft size={20}/>
                                </button>
                                <h3 className="text-xl font-black text-[#2A3642] dark:text-white tracking-tight">
                                    {monthNames[calMonth]} {calYear}
                                </h3>
                                <button onClick={handleNextMonth}
                                        className="p-2.5 border border-slate-200 dark:border-[#465769]/50 rounded-xl hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] text-[#2A3642] dark:text-white transition cursor-pointer">
                                    <ChevronRight size={20}/>
                                </button>
                            </div>

                            <div
                                className="grid grid-cols-7 gap-2 mb-3 text-center font-extrabold text-[#465769] dark:text-slate-300 text-xs uppercase tracking-wider">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}
                                                                                                 className="py-1">{d}</div>)}
                            </div>

                            <div className="grid grid-cols-7 gap-2.5 flex-1">
                                {generateCalendarDays().map((dateStr, i) => {
                                    if (!dateStr) return <div key={i}
                                                              className="bg-[#F8FAFC]/60 dark:bg-[#1E2730]/40 rounded-2xl min-h-[100px]"></div>;

                                    const dayLogs = logs.filter(l => l.date === dateStr);
                                    const isToday = dateStr === todayStr;
                                    const isSelected = dateStr === selectedCalDate && !showOverdueView;

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => {
                                                setSelectedCalDate(dateStr);
                                                setShowOverdueView(false);
                                            }}
                                            className={`min-h-[100px] border rounded-2xl p-3 cursor-pointer transition-all flex flex-col justify-between ${
                                                isSelected
                                                    ? 'bg-[#2A3642] text-white border-[#2A3642] dark:bg-[#465769] dark:border-slate-300 shadow-md scale-[1.01]'
                                                    : isToday
                                                        ? 'bg-[#465769]/10 border-[#465769] dark:bg-[#465769]/25 text-[#2A3642] dark:text-white'
                                                        : 'bg-[#F8FAFC] dark:bg-[#1E2730] border-slate-200/70 dark:border-[#465769]/30 hover:border-[#465769] text-[#2A3642] dark:text-slate-200'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                {isToday && <span
                                                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-[#2A3642] text-white'}`}>Today</span>}
                                                <p className={`ml-auto text-sm font-extrabold ${isSelected ? 'text-white' : isToday ? 'text-[#2A3642] dark:text-white' : 'text-[#465769] dark:text-slate-300'}`}>
                                                    {dateStr.split('-')[2]}
                                                </p>
                                            </div>

                                            {dayLogs.length > 0 && (
                                                <div className="mt-2">
                                                    <span
                                                        className={`inline-block w-full text-center text-xs font-extrabold px-2 py-1 rounded-xl truncate ${
                                                            isSelected ? 'bg-white text-[#2A3642]' : 'bg-[#2A3642] dark:bg-[#465769] text-white'
                                                        }`}>
                                                        {dayLogs.length} {dayLogs.length > 1 ? 'Entries' : 'Entry'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Calendar Inspector */}
                        <div
                            className="lg:col-span-4 bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-xs flex flex-col overflow-hidden max-h-[85vh]">
                            <div
                                className={`px-6 py-5 border-b border-slate-200/80 dark:border-[#465769]/40 ${showOverdueView ? 'bg-rose-50 dark:bg-rose-950/30' : 'bg-[#F8FAFC] dark:bg-[#222C36]'}`}>
                                <h3 className={`font-extrabold text-base flex items-center justify-between gap-2 ${showOverdueView ? 'text-rose-700 dark:text-rose-300' : 'text-[#2A3642] dark:text-white'}`}>
                                    <span className="flex items-center gap-2">
                                        {showOverdueView ? <><AlertTriangle size={18}/> Overdue Matters</> : <>
                                            <CalendarIcon size={18} className="text-[#465769]"/> Schedule Inspector</>}
                                    </span>
                                    <span
                                        className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/40 font-bold">
                                        {showOverdueView ? 'All' : selectedCalDate}
                                    </span>
                                </h3>
                            </div>

                            <div className="p-5 flex-1 overflow-y-auto space-y-4">
                                {currentModalLogs.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <CalendarDays size={32} className="mx-auto mb-2 opacity-40"/>
                                        <p className="text-sm font-bold">No entries recorded</p>
                                    </div>
                                ) : currentModalLogs.map(log => (
                                    <div key={log.id}
                                         className={`p-4 border rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] ${showOverdueView ? 'border-rose-200 dark:border-rose-900/60' : 'border-slate-200/80 dark:border-[#465769]/40'}`}>
                                        {showOverdueView && (
                                            <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400 mb-1.5 uppercase">
                                                Due: {log.date} ({Math.floor((new Date().getTime() - new Date(log.date).getTime()) / (1000 * 3600 * 24))} days
                                                overdue)
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span
                                                className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#2A3642] dark:bg-[#465769] text-white">{log.type}</span>
                                            <span
                                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${getStatusBadgeStyle(log.status)}`}>{log.status}</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-[#2A3642] dark:text-white line-clamp-1">{log.caseTitle}</h4>
                                        <p className="text-xs text-[#465769] dark:text-slate-300 mb-3 mt-1 font-semibold">{log.clientName} • {log.contactNo}</p>

                                        <div className="flex gap-2.5">
                                            <select
                                                value={log.status}
                                                onChange={e => handleStatusChange(log, e.target.value)}
                                                disabled={!hasWritePermission}
                                                className="text-xs border border-slate-200 dark:border-[#465769]/50 rounded-xl px-3 py-2 flex-1 bg-white dark:bg-[#2A3642] font-bold text-[#2A3642] dark:text-white disabled:opacity-50"
                                            >
                                                <option>Pending</option>
                                                <option>Completed</option>
                                                <option>Postponed</option>
                                                <option>Urgent</option>
                                            </select>
                                            {hasSmsPermission && (
                                                <button onClick={() => setSmsModal({isOpen: true, log, smsText: ''})}
                                                        className="bg-[#465769]/15 text-[#2A3642] dark:text-white px-3.5 rounded-xl hover:bg-[#465769] hover:text-white transition">
                                                    <MessageSquare size={15}/>
                                                </button>
                                            )}
                                            <button onClick={() => {
                                                setShowCalendar(false);
                                                router.push(`/cases/${log.caseId}`);
                                            }}
                                                    className="bg-white dark:bg-[#2A3642] border border-slate-200 dark:border-[#465769]/50 text-[#2A3642] dark:text-white px-3.5 rounded-xl hover:bg-[#465769] hover:text-white transition">
                                                <ArrowRight size={15}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= POSTPONE MODAL (High Z-Index fixed) ================= */}
            {postponeModal.isOpen && postponeModal.log && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-[#2A3642]/85 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#465769]">
                        <h3 className="text-lg sm:text-xl font-black mb-1.5 flex items-center gap-2.5 text-[#2A3642] dark:text-white">
                            <Clock className="text-amber-500" size={22} /> Postpone Case Action
                        </h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-5">
                            Rescheduling <strong>{postponeModal.log.caseTitle}</strong>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className={labelStyle}>New Next Date <span className="text-rose-500">*</span></label>
                                <input type="date" value={postponeModal.newDate} onChange={e => setPostponeModal({ ...postponeModal, newDate: e.target.value })} className={inputStyle} />
                            </div>

                            {hasSmsPermission && (
                                <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200/80 dark:border-[#465769]/40 space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <input type="checkbox" id="sendSms" checked={postponeModal.sendSms} onChange={e => setPostponeModal({ ...postponeModal, sendSms: e.target.checked })} className="w-4 h-4 accent-[#2A3642]" />
                                        <label htmlFor="sendSms" className="text-xs font-bold text-[#2A3642] dark:text-white">Notify client via SMS</label>
                                    </div>
                                    {postponeModal.sendSms && (
                                        <textarea rows={3} value={postponeModal.smsText} onChange={e => setPostponeModal({ ...postponeModal, smsText: e.target.value })} className={inputStyle}></textarea>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setPostponeModal({ ...postponeModal, isOpen: false })} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 text-xs sm:text-sm font-bold cursor-pointer">Cancel</button>
                            <button onClick={savePostpone} className="px-6 py-2.5 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= QUICK SMS MODAL ================= */}
            {smsModal.isOpen && smsModal.log && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#465769]">
                        <h3 className="text-lg sm:text-xl font-black mb-1.5 flex items-center gap-2.5 text-[#2A3642] dark:text-white">
                            <MessageSquare className="text-[#465769] dark:text-slate-300" size={22} /> Dispatch Client SMS
                        </h3>
                        <p className="text-xs sm:text-sm font-semibold text-[#465769] dark:text-slate-300 mb-4">
                            Recipient: {smsModal.log.clientName} ({smsModal.log.contactNo})
                        </p>
                        <textarea rows={3} value={smsModal.smsText} onChange={e => setSmsModal({ ...smsModal, smsText: e.target.value })} className={inputStyle} placeholder="Type message..."></textarea>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setSmsModal({ ...smsModal, isOpen: false })} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 text-xs sm:text-sm font-bold">Cancel</button>
                            <button onClick={sendQuickSms} className="px-6 py-2.5 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md">
                                <Send size={15} /> Send SMS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= REGISTRATION SMS MODAL ================= */}
            {showRegSmsModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#465769]">
                        <h3 className="text-lg sm:text-xl font-black mb-2 text-[#2A3642] dark:text-white">Confirm Registration SMS</h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-4">
                            An official onboarding confirmation will be sent to <strong>{formData.contactNo}</strong>:
                        </p>
                        <div className="bg-[#F8FAFC] dark:bg-[#1E2730] p-4 rounded-2xl text-xs sm:text-sm text-[#2A3642] dark:text-slate-200 mb-6 font-mono whitespace-pre-wrap border border-slate-200/80 dark:border-[#465769]/40">
                            Dear {formData.clientName},{'\n'}
                            Your case "{formData.title}" ({formData.type === 'Other' ? formData.customType : formData.type}) has been successfully registered.{'\n\n'}
                            {userName}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowRegSmsModal(false)} className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-300 text-xs sm:text-sm font-bold">Cancel</button>
                            <button onClick={() => submitCase(true)} disabled={formSaving} className="px-6 py-2.5 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md disabled:opacity-50">
                                {formSaving ? 'Dispatching...' : 'Confirm & Register'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CUSTOM CONFIRMATION MODAL ================= */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#465769] text-center">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3.5">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-black text-[#2A3642] dark:text-white mb-1">
                            {confirmModal.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-6 font-medium">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                            >
                                Yes, Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CUSTOM ALERT MODAL ================= */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#465769] text-center animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 rounded-2xl bg-[#465769]/15 dark:bg-[#465769] text-[#2A3642] dark:text-white flex items-center justify-center mx-auto mb-3.5">
                            <CheckCircle size={24} className="text-[#2A3642] dark:text-white" />
                        </div>
                        <h3 className="text-lg font-black text-[#2A3642] dark:text-white mb-1">
                            {alertModal.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-6 font-medium">
                            {alertModal.message}
                        </p>
                        <button
                            onClick={() => setAlertModal({ isOpen: false, message: '' })}
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