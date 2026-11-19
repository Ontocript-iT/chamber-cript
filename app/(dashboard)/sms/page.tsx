'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc, increment, collectionGroup } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
    MessageSquare, Send, CheckCircle, Clock, AlertTriangle,
    Search, Package, X, RefreshCw, History, User, Phone,
    ChevronDown, ChevronUp, CreditCard
} from 'lucide-react';

const PACKAGES = [
    { id: 'BASIC', name: 'Basic Plan', quota: 1000, price: 2000 },
    { id: 'PRO', name: 'Pro Plan', quota: 5000, price: 8000 },
    { id: 'ENTERPRISE', name: 'Enterprise Plan', quota: 10000, price: 15000 }
];

export default function SMSManagementPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [firmData, setFirmData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [smsRequests, setSmsRequests] = useState<any[]>([]);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [showHistory, setShowHistory] = useState(true);

    // Custom SMS Send State
    const [cases, setCases] = useState<any[]>([]);
    const [caseSearch, setCaseSearch] = useState('');
    const [showCaseDropdown, setShowCaseDropdown] = useState(false);
    const [selectedClient, setSelectedClient] = useState<{ name: string; phone: string; caseTitle: string } | null>(null);
    const [messageBody, setMessageBody] = useState('');
    const [sendingSms, setSendingSms] = useState(false);

    // --- FAILED SMS STATES ---
    const [failedSmsList, setFailedSmsList] = useState<any[]>([]);
    const [showFailedPanel, setShowFailedPanel] = useState(false);
    const [resendingId, setResendingId] = useState<string | null>(null);

    // --- CUSTOM MODALS ---
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: 'Notification', message: '', type: 'info'
    });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
        isOpen: false, title: 'Confirm Action', message: '', onConfirm: () => {}
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (!u) return router.push('/login');
            try {
                const uDocSnap = await getDoc(doc(db, 'users', u.uid));
                if (!uDocSnap.exists()) return router.push('/login');

                const uData = uDocSnap.data();
                if (uData?.role !== 'LAWYER') return router.push('/dashboard');

                setUser({ uid: u.uid, ...uData });

                const firmDocSnap = await getDoc(doc(db, 'firms', uData.firmId));
                if (firmDocSnap.exists()) {
                    setFirmData({ id: firmDocSnap.id, ...firmDocSnap.data() });
                } else {
                    setFirmData({ id: uData.firmId, name: 'My Law Firm', smsQuota: 0 });
                }

                const reqSnap = await getDocs(query(collection(db, 'sms_requests'), where('firmId', '==', uData.firmId)));
                const reqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                reqs.sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
                setSmsRequests(reqs);
                setHasPendingRequest(reqs.some((r: any) => r.status === 'PENDING'));

                const caseSnap = await getDocs(query(collection(db, 'cases'), where('firmId', '==', uData.firmId)));
                setCases(caseSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // --- FETCH FAILED SMS ---
                const msgQuery = query(collectionGroup(db, 'messages'), where('firmId', '==', uData.firmId));
                const msgSnap = await getDocs(msgQuery);
                const allFailedMsgs = msgSnap.docs
                    .map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
                    .filter((m: any) => m.status === 'Failed')
                    .sort((a: any, b: any) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

                setFailedSmsList(allFailedMsgs);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const requestPackage = (pkg: typeof PACKAGES[0]) => {
        if (hasPendingRequest) {
            setAlertModal({
                isOpen: true,
                title: 'Request Pending',
                message: 'You already have a pending SMS package request awaiting approval.',
                type: 'info'
            });
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: `Request ${pkg.name}`,
            message: `Submit a recharge request for ${pkg.quota.toLocaleString()} SMS credits at Rs. ${pkg.price.toLocaleString()}?`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const newReq = {
                        firmId: firmData?.id || user.firmId,
                        firmName: firmData?.name || 'My Law Firm',
                        packageName: pkg.name,
                        quota: pkg.quota,
                        price: pkg.price,
                        status: 'PENDING',
                        requestedAt: new Date().toISOString()
                    };
                    const docRef = await addDoc(collection(db, 'sms_requests'), newReq);
                    setSmsRequests(prev => [{ id: docRef.id, ...newReq }, ...prev]);
                    setHasPendingRequest(true);
                    setAlertModal({
                        isOpen: true,
                        title: 'Request Submitted',
                        message: 'Your package request has been sent to the Super Admin for approval.',
                        type: 'success'
                    });
                } catch (err) {
                    setAlertModal({
                        isOpen: true,
                        title: 'Request Failed',
                        message: 'Failed to submit package request. Please try again.',
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleSendCustomSms = async () => {
        if (!selectedClient || !messageBody.trim()) {
            setAlertModal({
                isOpen: true,
                title: 'Missing Details',
                message: 'Please select a client and enter a message before sending.',
                type: 'error'
            });
            return;
        }
        if (!firmData || firmData.smsQuota <= 0) {
            setAlertModal({
                isOpen: true,
                title: 'Zero Quota',
                message: 'Your SMS quota is depleted. Please request a package to continue.',
                type: 'error'
            });
            return;
        }

        setSendingSms(true);
        try {
            const res = await fetch('/api/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: selectedClient.phone, message: messageBody })
            });
            const data = await res.json();

            if (data.success) {
                await updateDoc(doc(db, 'firms', firmData.id), { smsQuota: increment(-1) });
                await addDoc(collection(db, 'messages'), {
                    firmId: firmData.id,
                    sentTo: selectedClient.phone,
                    message: messageBody,
                    status: 'Sent',
                    sentAt: new Date().toISOString()
                });
                setMessageBody('');
                setFirmData((prev: any) => ({ ...prev, smsQuota: prev.smsQuota - 1 }));
                setAlertModal({
                    isOpen: true,
                    title: 'SMS Dispatched',
                    message: `Message successfully sent to ${selectedClient.name} (${selectedClient.phone}).`,
                    type: 'success'
                });
            } else {
                const failedPayload = {
                    firmId: firmData.id,
                    sentTo: selectedClient.phone,
                    message: messageBody,
                    status: 'Failed',
                    sentAt: new Date().toISOString()
                };
                const failedRef = await addDoc(collection(db, 'messages'), failedPayload);
                setFailedSmsList(prev => [{ id: failedRef.id, ref: failedRef, ...failedPayload }, ...prev]);
                throw new Error(data.error || 'Provider Failed');
            }
        } catch (err: any) {
            setAlertModal({
                isOpen: true,
                title: 'Delivery Failed',
                message: 'Failed to send SMS: ' + err.message,
                type: 'error'
            });
        } finally {
            setSendingSms(false);
        }
    };

    // --- RETRY FAILED SMS LOGIC ---
    const handleRetrySms = async (msg: any) => {
        if (!firmData || firmData.smsQuota <= 0) {
            setAlertModal({
                isOpen: true,
                title: 'Zero Quota',
                message: 'Your SMS quota is zero. Please recharge before retrying.',
                type: 'error'
            });
            return;
        }
        setResendingId(msg.id);

        try {
            const res = await fetch('/api/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: msg.sentTo, message: msg.message })
            });
            const data = await res.json();

            if (data.success) {
                if (msg.ref) {
                    await updateDoc(msg.ref, { status: 'Sent', sentAt: new Date().toISOString() });
                }
                await updateDoc(doc(db, 'firms', firmData.id), { smsQuota: increment(-1) });

                setFirmData((prev: any) => ({ ...prev, smsQuota: prev.smsQuota - 1 }));
                setFailedSmsList(prev => prev.filter(m => m.id !== msg.id));
                setAlertModal({
                    isOpen: true,
                    title: 'SMS Resent',
                    message: `Message was successfully delivered to ${msg.sentTo}.`,
                    type: 'success'
                });
            } else {
                throw new Error(data.error || 'SMS API Provider Failed');
            }
        } catch (err: any) {
            setAlertModal({
                isOpen: true,
                title: 'Retry Failed',
                message: 'Retry failed: ' + err.message,
                type: 'error'
            });
        } finally {
            setResendingId(null);
        }
    };

    const filteredCases = cases.filter(c =>
        (c.clientName || '').toLowerCase().includes(caseSearch.toLowerCase()) ||
        (c.title || '').toLowerCase().includes(caseSearch.toLowerCase()) ||
        (c.contactNo || '').toLowerCase().includes(caseSearch.toLowerCase())
    );

    const smsSegments = Math.max(1, Math.ceil(messageBody.length / 160));

    // Distinct high-contrast field styling for comfortable visual scanning
    const inputStyle = "w-full px-4 py-3 bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-xl text-sm font-medium text-[#2A3642] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[#2A3642] dark:focus:border-slate-300 focus:ring-4 focus:ring-[#465769]/15 transition-all";
    const labelStyle = "block text-[11px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2";

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-300"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#465769] dark:text-slate-400">Loading SMS Center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">

            {/* ================= TOP COMMAND BAR ================= */}
            <div className="bg-[#465769] dark:bg-[#2A3642] rounded-2xl px-6 py-4 shadow-sm border border-slate-200/80 dark:border-[#465769]/40 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-sm">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                            SMS & Quota Management
                        </h1>
                        <p className="text-xs text-slate-200/85 font-medium mt-1">
                            {firmData?.name || 'Law Firm'} • Client notifications, recharge plans & failed delivery recovery
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {failedSmsList.length > 0 && (
                        <button
                            onClick={() => setShowFailedPanel(true)}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md cursor-pointer"
                        >
                            <AlertTriangle size={15} />
                            <span>Failed SMS ({failedSmsList.length})</span>
                        </button>
                    )}

                    <div className="flex items-center gap-2.5 bg-white/95 dark:bg-[#182028] px-4 py-2 rounded-xl border border-white/20 dark:border-[#465769]/50">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#465769] dark:text-slate-400">Balance:</span>
                        <span className={`text-sm font-black ${(firmData?.smsQuota || 0) <= 50 ? 'text-rose-600 dark:text-rose-400' : 'text-[#2A3642] dark:text-white'}`}>
                            {(firmData?.smsQuota || 0).toLocaleString()} SMS
                        </span>
                    </div>
                </div>
            </div>

            {/* ================= CRITICAL LOW QUOTA ALERT ================= */}
            {(firmData?.smsQuota || 0) <= 50 && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-5 rounded-2xl flex items-start sm:items-center gap-4 text-rose-800 dark:text-rose-200 shadow-xs">
                    <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 shrink-0">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <p className="font-black text-sm">Critical Low SMS Quota</p>
                        <p className="text-xs sm:text-sm opacity-90 mt-0.5 font-medium">
                            System access is restricted when your balance falls at or below 50 credits. Submit a recharge request below to restore uninterrupted service.
                        </p>
                    </div>
                </div>
            )}

            {/* ================= MAIN 12-COLUMN WORKSPACE ================= */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

                {/* ================= LEFT (8 Cols): PACKAGES & PURCHASE HISTORY ================= */}
                <div className="xl:col-span-8 space-y-6">

                    {/* Recharge Packages Card */}
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-xs">
                                    <Package size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-extrabold text-[#2A3642] dark:text-white leading-none">
                                        SMS Recharge Plans
                                    </h2>
                                    <p className="text-xs text-[#465769] dark:text-slate-300 mt-1 font-medium">
                                        Select a credit bundle to request instant top-up approval
                                    </p>
                                </div>
                            </div>

                            {hasPendingRequest && (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-extrabold">
                                    <Clock size={14} /> Pending Admin Approval
                                </span>
                            )}
                        </div>

                        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                            {PACKAGES.map(pkg => {
                                const isPopular = pkg.id === 'PRO';
                                const unitCost = (pkg.price / pkg.quota).toFixed(2);

                                return (
                                    <div
                                        key={pkg.id}
                                        className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all ${
                                            isPopular
                                                ? 'bg-[#2A3642] dark:bg-[#1E2730] text-white border-2 border-[#465769] shadow-lg'
                                                : 'bg-[#F8FAFC] dark:bg-[#1E2730] text-[#2A3642] dark:text-white border border-slate-200 dark:border-[#465769]/50 hover:border-[#465769]'
                                        }`}
                                    >
                                        {isPopular && (
                                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#465769] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                                                Most Popular
                                            </span>
                                        )}

                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className={`font-extrabold text-sm uppercase tracking-wider ${isPopular ? 'text-slate-200' : 'text-[#465769] dark:text-slate-300'}`}>
                                                    {pkg.name}
                                                </h3>
                                                <CreditCard size={16} className={isPopular ? 'text-slate-300' : 'text-slate-400'} />
                                            </div>

                                            <div className="my-4">
                                                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                                                    {pkg.quota.toLocaleString()}
                                                </span>
                                                <span className={`text-xs font-bold uppercase ml-1.5 ${isPopular ? 'text-slate-300' : 'text-[#465769] dark:text-slate-400'}`}>
                                                    SMS
                                                </span>
                                            </div>

                                            <div className={`py-3 px-3.5 rounded-xl mb-6 ${isPopular ? 'bg-white/10' : 'bg-white dark:bg-[#2A3642] border border-slate-200/80 dark:border-[#465769]/40'}`}>
                                                <p className="text-lg font-black">
                                                    Rs. {pkg.price.toLocaleString()}
                                                </p>
                                                <p className={`text-[11px] font-semibold mt-0.5 ${isPopular ? 'text-slate-300' : 'text-[#465769] dark:text-slate-400'}`}>
                                                    Rs. {unitCost} per SMS
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => requestPackage(pkg)}
                                            disabled={hasPendingRequest}
                                            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                                                isPopular
                                                    ? 'bg-white text-[#2A3642] hover:bg-slate-100 shadow-md'
                                                    : 'bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#56697e] text-white shadow-sm'
                                            }`}
                                        >
                                            {hasPendingRequest ? 'Request Pending' : 'Request Plan'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Purchase & Request History Card (Collapsible) */}
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowHistory(!showHistory)}
                            className="w-full px-6 sm:px-8 py-5 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 flex justify-between items-center text-left cursor-pointer hover:bg-slate-100/70 dark:hover:bg-[#1E2730] transition"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#465769]/15 dark:bg-[#465769] text-[#2A3642] dark:text-white flex items-center justify-center">
                                    <History size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-[#2A3642] dark:text-white flex items-center gap-2">
                                        Purchase History
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#2A3642] dark:bg-[#465769] text-white">
                                            {smsRequests.length}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-[#465769] dark:text-slate-400 font-medium">
                                        Log of all quota top-up requests and approval statuses
                                    </p>
                                </div>
                            </div>
                            <div className="p-2 rounded-xl bg-white dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 text-[#465769] dark:text-slate-300">
                                {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                        </button>

                        {showHistory && (
                            <div className="p-6 sm:p-8">
                                {smsRequests.length === 0 ? (
                                    <div className="text-center py-10 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-2xl border border-dashed border-slate-200 dark:border-[#465769]/50">
                                        <Package size={32} className="mx-auto mb-2 text-slate-400 opacity-50" />
                                        <p className="text-sm font-bold text-[#2A3642] dark:text-slate-200">No recharge requests yet</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Choose a plan above to submit your first quota request.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                                        {smsRequests.map(req => (
                                            <div
                                                key={req.id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200/80 dark:border-[#465769]/40"
                                            >
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-extrabold text-sm text-[#2A3642] dark:text-white">
                                                            {req.packageName}
                                                        </p>
                                                        <span className="text-xs font-bold text-[#465769] dark:text-slate-300 bg-white dark:bg-[#2A3642] px-2 py-0.5 rounded-md border border-slate-200 dark:border-[#465769]/50">
                                                            {Number(req.quota).toLocaleString()} SMS
                                                        </span>
                                                        {req.price && (
                                                            <span className="text-xs font-bold text-[#465769] dark:text-slate-400">
                                                                • Rs. {Number(req.price).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                        Requested on {new Date(req.requestedAt).toLocaleString()}
                                                    </p>
                                                </div>

                                                <span className={`self-start sm:self-center px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border ${
                                                    req.status === 'APPROVED'
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                                        : req.status === 'REJECTED'
                                                            ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                                            : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= RIGHT (4 Cols): QUOTA CARD & CUSTOM SMS COMPOSER ================= */}
                <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-24">

                    {/* Available Quota Hero Tile */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2A3642] via-[#354453] to-[#465769] text-white p-6 sm:p-7 shadow-lg border border-white/10">
                        <MessageSquare size={110} className="absolute -right-5 -bottom-5 opacity-10 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                                    Available SMS Balance
                                </span>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                    (firmData?.smsQuota || 0) <= 50
                                        ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                                        : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                                }`}>
                                    {(firmData?.smsQuota || 0) <= 50 ? 'Low Credit' : 'Active'}
                                </span>
                            </div>

                            <p className="text-5xl font-black tracking-tight mt-3">
                                {(firmData?.smsQuota || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-300 font-medium mt-1.5">
                                Remaining outbound SMS credits for {firmData?.name || 'your firm'}
                            </p>
                        </div>
                    </div>

                    {/* Custom SMS Composer Card */}
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 overflow-hidden">
                        <div className="px-6 py-4 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center">
                                <Send size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-base font-extrabold text-[#2A3642] dark:text-white leading-none">
                                    Send Direct SMS
                                </h3>
                                <p className="text-[11px] text-[#465769] dark:text-slate-400 mt-1 font-medium">
                                    Dispatch an instant update to any registered client
                                </p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5 bg-[#F8FAFC]/50 dark:bg-[#2A3642]">
                            {/* Searchable Client/Case Dropdown */}
                            <div className="relative">
                                <label className={labelStyle}>Recipient Client / Case <span className="text-rose-500">*</span></label>
                                <div className="relative flex items-center">
                                    <Search size={16} className="absolute left-3.5 text-[#465769] dark:text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search by client name, case, or phone..."
                                        value={caseSearch}
                                        onFocus={() => setShowCaseDropdown(true)}
                                        onChange={e => {
                                            setCaseSearch(e.target.value);
                                            setShowCaseDropdown(true);
                                        }}
                                        className={`${inputStyle} pl-10 pr-9`}
                                    />
                                    {caseSearch && (
                                        <button
                                            type="button"
                                            onClick={() => { setCaseSearch(''); setSelectedClient(null); setShowCaseDropdown(false); }}
                                            className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>

                                {showCaseDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setShowCaseDropdown(false)}></div>
                                        <div className="absolute top-full left-0 w-full mt-2 max-h-56 overflow-y-auto bg-white dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769] rounded-2xl shadow-xl z-40 divide-y divide-slate-100 dark:divide-[#465769]/30">
                                            {filteredCases.length === 0 ? (
                                                <div className="p-4 text-center text-xs font-medium text-slate-400">
                                                    No matching clients found.
                                                </div>
                                            ) : filteredCases.map(c => (
                                                <button
                                                    type="button"
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedClient({ name: c.clientName, phone: c.contactNo, caseTitle: c.title });
                                                        setCaseSearch(`${c.clientName} - ${c.title}`);
                                                        setShowCaseDropdown(false);
                                                    }}
                                                    className="w-full text-left p-3.5 hover:bg-[#F8FAFC] dark:hover:bg-[#2A3642] transition cursor-pointer"
                                                >
                                                    <div className="flex justify-between items-center gap-2">
                                                        <p className="font-bold text-xs sm:text-sm text-[#2A3642] dark:text-white truncate">{c.clientName}</p>
                                                        <span className="text-[11px] font-mono font-bold text-[#465769] dark:text-slate-300 shrink-0">{c.contactNo}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{c.title}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Selected Recipient Confirmation Pill */}
                            {selectedClient && (
                                <div className="p-3.5 rounded-2xl bg-[#465769]/10 dark:bg-[#1E2730] border border-[#465769]/25 dark:border-[#465769]/60 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-extrabold text-[#2A3642] dark:text-white flex items-center gap-1.5 truncate">
                                            <User size={13} className="text-[#465769] dark:text-slate-300 shrink-0" />
                                            {selectedClient.name}
                                        </p>
                                        <p className="text-[11px] font-bold text-[#465769] dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                                            <Phone size={12} className="shrink-0" />
                                            {selectedClient.phone}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setSelectedClient(null); setCaseSearch(''); }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white dark:hover:bg-[#2A3642] transition cursor-pointer"
                                        title="Clear recipient"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Message Composer */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-300">
                                        Message Content <span className="text-rose-500">*</span>
                                    </label>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                        {messageBody.length} chars • {smsSegments} SMS
                                    </span>
                                </div>
                                <textarea
                                    rows={5}
                                    placeholder="Write your client notification message here..."
                                    value={messageBody}
                                    onChange={e => setMessageBody(e.target.value)}
                                    className={`${inputStyle} resize-none`}
                                ></textarea>
                            </div>

                            <button
                                onClick={handleSendCustomSms}
                                disabled={sendingSms}
                                className="w-full py-3.5 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#56697e] text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                            >
                                {sendingSms ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" /> Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} /> Dispatch SMS
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* ================= FAILED SMS SLIDE-OUT DRAWER ================= */}
            {showFailedPanel && (
                <div className="fixed inset-0 z-[1000] flex justify-end bg-[#2A3642]/70 backdrop-blur-xs">
                    <div className="w-full max-w-md bg-white dark:bg-[#2A3642] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-[#465769]">

                        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-[#465769]/40 flex justify-between items-center bg-rose-50 dark:bg-rose-950/30">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-rose-800 dark:text-rose-200 leading-none">
                                        Failed SMS Logs
                                    </h2>
                                    <p className="text-[11px] text-rose-600/80 dark:text-rose-300/80 font-semibold mt-1">
                                        {failedSmsList.length} message{failedSmsList.length === 1 ? '' : 's'} awaiting retry
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFailedPanel(false)}
                                className="p-2 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {failedSmsList.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <CheckCircle size={40} className="mx-auto mb-3 opacity-40 text-emerald-500" />
                                    <p className="text-sm font-bold text-[#2A3642] dark:text-slate-200">All clear!</p>
                                    <p className="text-xs mt-0.5">No failed messages remaining.</p>
                                </div>
                            ) : failedSmsList.map(sms => (
                                <div
                                    key={sms.id}
                                    className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 bg-[#F8FAFC] dark:bg-[#1E2730] shadow-2xs space-y-3"
                                >
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 uppercase tracking-wider">
                                            Failed
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                            {new Date(sms.sentAt).toLocaleString()}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-xs font-extrabold text-[#2A3642] dark:text-white flex items-center gap-1.5">
                                            <Phone size={12} className="text-[#465769] dark:text-slate-400" /> {sms.sentTo}
                                        </p>
                                        <p className="text-xs text-[#465769] dark:text-slate-300 mt-2 p-3 rounded-xl bg-white dark:bg-[#2A3642] border border-slate-200/80 dark:border-[#465769]/40 whitespace-pre-wrap font-medium">
                                            {sms.message}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleRetrySms(sms)}
                                        disabled={resendingId === sms.id}
                                        className="w-full py-2.5 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#56697e] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                                    >
                                        <RefreshCw size={14} className={resendingId === sms.id ? 'animate-spin' : ''} />
                                        {resendingId === sms.id ? 'Retrying...' : 'Retry Delivery'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CUSTOM CONFIRMATION MODAL ================= */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#465769] text-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#465769]/15 dark:bg-[#465769] text-[#2A3642] dark:text-white flex items-center justify-center mx-auto mb-4">
                            <Package size={24} />
                        </div>
                        <h3 className="text-lg font-black text-[#2A3642] dark:text-white mb-1.5">
                            {confirmModal.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-6 font-medium">
                            {confirmModal.message}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-[#1E2730] hover:bg-slate-200 text-[#2A3642] dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className="flex-1 py-3 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CUSTOM ALERT MODAL ================= */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
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