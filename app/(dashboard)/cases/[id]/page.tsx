'use client';

import { useEffect, useState, use } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, increment } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
    ArrowLeft, Edit, Save, ChevronDown, ChevronUp, Plus,
    Trash2, Send, MessageSquare, History, Calendar, CalendarClock, FileText, X, Activity, User,
    MoreVertical, CheckCircle, Clock, AlertTriangle, Settings, Phone, Mail, Printer, Eye
} from 'lucide-react';

import { logActivity } from '@/lib/logger';

type PageProps = { params: Promise<{ id: string }> };
type DocEntry = { id: string; name: string; file?: File | null; url?: string };
type CustomField = { id: string; key: string; value: string };

type TimelineEntry = {
    id: string; date: string; type: string; customType?: string;
    notes: string; staffId: string; staffName: string; docs: DocEntry[];
    createdAt: string;
    status?: string;
};
type SmsEntry = {
    id: string; message: string; sentTo: string; status: string; sentAt: string;
};

// ============================================================================
// SMALL UI HELPERS (display only)
// ============================================================================
const timelineDotColor = (status?: string) => {
    if (status === 'Completed') return 'bg-emerald-500';
    if (status === 'Postponed') return 'bg-amber-500';
    if (status === 'Urgent') return 'bg-rose-500';
    return 'bg-[#465769] dark:bg-slate-400';
};

const timelineBadgeStyle = (status?: string) => {
    if (status === 'Completed') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    if (status === 'Postponed') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    if (status === 'Urgent') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
    return 'bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50';
};

const Field = ({ label, value }: { label: string; value?: string }) => (
    <div className="min-w-0">
        <p className="text-xs font-medium text-[#465769] dark:text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-[#2A3642] dark:text-slate-100 break-words">{value || '-'}</p>
    </div>
);

export default function AdvancedCaseViewPage(props: PageProps) {
    const params = use(props.params);
    const caseId = params.id;
    const router = useRouter();

    // --- Permissions State ---
    const [userPerms, setUserPerms] = useState({ read: false, write: false, sms: false });

    const [loading, setLoading] = useState(true);
    const [firmId, setFirmId] = useState('');
    const [activeUser, setActiveUser] = useState<{uid: string, name: string}>({uid: '', name: ''});
    const [staffList, setStaffList] = useState<{id: string, name: string}[]>([]);

    // UI-only state: which tab is open, whether "all logs" are shown, whether the add-event form is open
    const [activeTab, setActiveTab] = useState<'timeline' | 'sms'>('timeline');
    const [expandedSections, setExpandedSections] = useState({ timeline: false });
    const [showTlForm, setShowTlForm] = useState(false);

    // --- Custom Alert & Confirm Modals State ---
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'success' | 'error' | 'info' }>({
        isOpen: false, message: '', title: 'Notification', type: 'info'
    });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; title?: string; onConfirm: () => void }>({
        isOpen: false, message: '', title: 'Confirm Action', onConfirm: () => {}
    });

    const [isEditing, setIsEditing] = useState(false);
    const [caseData, setCaseData] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [editDocs, setEditDocs] = useState<DocEntry[]>([]);
    const [editCustomFields, setEditCustomFields] = useState<CustomField[]>([]);

    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [tlForm, setTlForm] = useState({ date: '', type: 'Status update (Proxy/Motion)', customType: '', notes: '', staffId: '' });
    const [tlDocs, setTlDocs] = useState<DocEntry[]>([]);
    const [tlSaving, setTlSaving] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const [tlSmsModal, setTlSmsModal] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: '' });
    const [tlSmsSending, setTlSmsSending] = useState(false);

    // --- Global Status Modal States ---
    const [statusModal, setStatusModal] = useState<{ isOpen: boolean; newStatus: string; customStatus: string }>({ isOpen: false, newStatus: 'Fully completed', customStatus: '' });
    const [statusUpdating, setStatusUpdating] = useState(false);

    const [smsHistory, setSmsHistory] = useState<SmsEntry[]>([]);
    const [smsMessage, setSmsMessage] = useState('');
    const [smsSending, setSmsSending] = useState(false);
    const [smsFilter, setSmsFilter] = useState('ALL');
    const [smsPage, setSmsPage] = useState(1);
    const SMS_PER_PAGE = 5;

    const [previewDoc, setPreviewDoc] = useState<{ isOpen: boolean; name: string; url: string }>({
        isOpen: false,
        name: '',
        url: '',
    });
    const [printingDoc, setPrintingDoc] = useState(false);

    const isImageFile = (url: string, name: string) =>
        /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url) ||
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);


    const handlePrintPreviewDoc = async () => {
        if (!previewDoc.url) return;
        setPrintingDoc(true);

        const cleanupIframe = (iframe: HTMLIFrameElement, blobUrl?: string) => {
            setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                if (blobUrl) URL.revokeObjectURL(blobUrl);
            }, 60_000);
        };

        try {
            // 1. Images: Render inside a same-origin srcdoc iframe (never hits cross-origin SecurityError)
            if (isImageFile(previewDoc.url, previewDoc.name)) {
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                iframe.srcdoc = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${previewDoc.name}</title>
                    <style>
                        @page { margin: 12mm; }
                        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                        img { max-width: 100%; max-height: 96vh; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <img src="${previewDoc.url}" onload="window.focus(); window.print();" />
                </body>
                </html>
            `;
                document.body.appendChild(iframe);
                setPrintingDoc(false);
                cleanupIframe(iframe);
                return;
            }

            // 2. PDFs / Other Docs: Fetch via same-origin proxy so it becomes a local Blob URL
            const proxyUrl = `/api/proxy-file?url=${encodeURIComponent(previewDoc.url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Failed to load document for printing.');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = blobUrl;

            iframe.onload = () => {
                setTimeout(() => {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                    setPrintingDoc(false);
                    cleanupIframe(iframe, blobUrl);
                }, 300);
            };

            document.body.appendChild(iframe);
        } catch (err: any) {
            setPrintingDoc(false);
            setAlertModal({
                isOpen: true,
                title: 'Print Error',
                message: err?.message || 'Unable to print this document directly.',
                type: 'error',
            });
        }
    };


    useEffect(() => {
        const fetchData = async (user: any) => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const uData = userDoc.data();

                const isLawyer = uData?.role === 'LAWYER';
                const perms = uData?.permissions || [];

                const canRead = isLawyer || perms.includes('cases.read');
                const canWrite = isLawyer || perms.includes('cases.write');
                const canSms = isLawyer || perms.includes('sms.send');

                setUserPerms({ read: canRead, write: canWrite, sms: canSms });

                if (!canRead) {
                    setLoading(false);
                    return;
                }

                const uFirmId = userDoc.data()?.firmId;
                setFirmId(uFirmId);
                setActiveUser({ uid: user.uid, name: userDoc.data()?.name });

                const caseRef = doc(db, 'cases', caseId);
                const caseSnap = await getDoc(caseRef);
                if (!caseSnap.exists() || caseSnap.data().firmId !== uFirmId) {
                    router.push('/cases'); return;
                }
                const data = caseSnap.data();
                setCaseData({ id: caseSnap.id, ...data });
                setEditForm({ ...data });
                setEditDocs(data.documents || []);
                setEditCustomFields(Object.entries(data.customFields || {}).map(([key, value]) => ({ id: Date.now()+key, key, value: value as string })));

                const staffQ = query(collection(db, 'users'), where('firmId', '==', uFirmId));
                const staffSnap = await getDocs(staffQ);
                setStaffList(staffSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

                const tlQ = query(collection(db, 'cases', caseId, 'timeline'), orderBy('createdAt', 'desc'));
                const tlSnap = await getDocs(tlQ);
                setTimeline(tlSnap.docs.map(d => ({ id: d.id, ...d.data() } as TimelineEntry)));

                const smsQ = query(collection(db, 'cases', caseId, 'messages'), orderBy('sentAt', 'desc'));
                const smsSnap = await getDocs(smsQ);
                setSmsHistory(smsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SmsEntry)));

            } catch (err) { console.error(err); } finally { setLoading(false); }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) fetchData(user); else router.push('/login');
        });
        return () => unsubscribe();
    }, [caseId, router]);

    const uploadFiles = async (docsArray: DocEntry[]) => {
        const uploaded = [];
        for (const d of docsArray) {
            if (d.url) { uploaded.push({ name: d.name, url: d.url }); continue; }
            if (d.file && d.name) {
                const formData = new FormData();
                formData.append('file', d.file);
                formData.append('fileName', d.file.name);
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) uploaded.push({ name: d.name, url: data.url });
            }
        }
        return uploaded;
    };

    const handleSaveCase = async () => {
        if (!userPerms.write) return;
        setLoading(true);
        try {
            const finalDocs = await uploadFiles(editDocs);
            const customFieldsObj = editCustomFields.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
            await updateDoc(doc(db, 'cases', caseId), { ...editForm, documents: finalDocs, customFields: customFieldsObj });
            await logActivity(firmId, activeUser.uid, activeUser.name, 'CASE_UPDATED', `Updated case details`, caseId, caseData.title);
            setCaseData({ ...editForm, documents: finalDocs, customFields: customFieldsObj });
            setIsEditing(false);
            setAlertModal({ isOpen: true, title: 'Success', message: 'Case updated successfully!', type: 'success' });
        } catch (err) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to update case.', type: 'error' });
        }
        setLoading(false);
    };

    const updateGlobalStatus = async () => {
        if (!userPerms.write) return;
        let finalStatus = statusModal.newStatus;
        if (finalStatus === 'Custom') {
            finalStatus = statusModal.customStatus.trim();
            if (!finalStatus) {
                setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Please enter a custom status.', type: 'error' });
                return;
            }
        }

        setStatusUpdating(true);
        try {
            await updateDoc(doc(db, 'cases', caseId), { status: finalStatus });
            await logActivity(firmId, activeUser.uid, activeUser.name, 'CASE_UPDATED', `Changed global status to: ${finalStatus}`, caseId, caseData.title);
            setCaseData({ ...caseData, status: finalStatus });
            setStatusModal({ isOpen: false, newStatus: 'Fully completed', customStatus: '' });
            setAlertModal({ isOpen: true, title: 'Success', message: 'Case status updated successfully!', type: 'success' });
        } catch (err) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to update status.', type: 'error' });
        }
        setStatusUpdating(false);
    };

    const getGlobalStatusStyle = (status: string) => {
        if (!status) return 'bg-slate-100 text-slate-800 border-slate-200';
        const s = status.toLowerCase();
        if (s === 'active') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-[#465769]/30 dark:text-blue-300 dark:border-[#465769]/50';
        if (s === 'fully completed') return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50';
        if (s === 'settled') return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50';
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50';
    };

    const handleAddTimeline = async () => {
        if (!userPerms.write) return;
        if (!tlForm.date || !tlForm.type) {
            setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Date and Update Type are required.', type: 'error' });
            return;
        }
        setTlSaving(true);
        try {
            const finalDocs = await uploadFiles(tlDocs);
            const staffName = staffList.find(s => s.id === tlForm.staffId)?.name || activeUser.name;
            const newEntry = { ...tlForm, staffName, docs: finalDocs, status: 'Pending', createdAt: new Date().toISOString() };
            const docRef = await addDoc(collection(db, 'cases', caseId, 'timeline'), newEntry);
            await logActivity(firmId, activeUser.uid, activeUser.name, 'TIMELINE_ADDED', `Added timeline update (${tlForm.type})`, caseId, caseData.title);
            setTimeline([{ id: docRef.id, ...newEntry } as TimelineEntry, ...timeline]);
            setTlForm({ date: '', type: 'Status update (Proxy/Motion)', customType: '', notes: '', staffId: '' });
            setTlDocs([]);

            // Expand timeline to show the newly added item
            setExpandedSections(prev => ({ ...prev, timeline: true }));
            setAlertModal({ isOpen: true, title: 'Success', message: 'Timeline updated successfully!', type: 'success' });
        } catch (err) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to add timeline update.', type: 'error' });
        }
        setTlSaving(false);
    };

    const updateTimelineStatus = async (id: string, newStatus: string) => {
        if (!userPerms.write) return;
        try {
            await updateDoc(doc(db, 'cases', caseId, 'timeline', id), { status: newStatus });
            setTimeline(timeline.map(t => t.id === id ? { ...t, status: newStatus } : t));
            setActiveDropdown(null);
        } catch (err) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to update status.', type: 'error' });
        }
    };

    const deleteTimelineEntry = async (id: string) => {
        if (!userPerms.write) return;
        setConfirmModal({
            isOpen: true,
            title: 'Remove Log',
            message: 'Are you sure you want to delete this log? This action cannot be undone.',
            onConfirm: async () => {
                await deleteDoc(doc(db, 'cases', caseId, 'timeline', id));
                setTimeline(timeline.filter(t => t.id !== id));
                setActiveDropdown(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const openTimelineSmsModal = (item: TimelineEntry) => {
        if (!userPerms.sms) return;
        const typeStr = item.type === 'Custom/Other' ? item.customType : item.type;
        const dateStr = new Date(item.date).toLocaleDateString();
        let defaultMsg = `Dear ${caseData.clientName},\n\nUpdate regarding your case "${caseData.title}":\n`;
        if (item.type === 'Hearing date') defaultMsg += `A hearing is scheduled for ${dateStr}.`;
        else if (item.type === 'Status update (Proxy/Motion)') defaultMsg += `A status update has been recorded on ${dateStr}.`;
        else if (item.type === 'Document filed') defaultMsg += `New document(s) were filed on ${dateStr}.`;
        else if (item.type === 'Payment') defaultMsg += `A payment was received on ${dateStr}.`;
        else defaultMsg += `A ${typeStr} was recorded on ${dateStr}.`;
        if (item.notes) defaultMsg += `\nNotes: ${item.notes}`;
        defaultMsg += `\n\nRegards,\n${item.staffName}`;
        setTlSmsModal({ isOpen: true, message: defaultMsg });
        setActiveDropdown(null);
    };

    const sendTimelineSms = async () => {
        if (!userPerms.sms) return;
        if (!tlSmsModal.message) {
            setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Message cannot be empty.', type: 'error' });
            return;
        }
        setTlSmsSending(true);
        try {
            const res = await fetch('/api/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: caseData.contactNo, message: tlSmsModal.message })
            });
            const data = await res.json();

            if (data.success) {
                const newSms = {
                    firmId: firmId,
                    message: tlSmsModal.message,
                    sentTo: caseData.contactNo,
                    status: 'Sent',
                    sentAt: new Date().toISOString()
                };
                const docRef = await addDoc(collection(db, 'cases', caseId, 'messages'), newSms);
                await updateDoc(doc(db, 'firms', firmId), { smsQuota: increment(-1) });
                await logActivity(firmId, activeUser.uid, activeUser.name, 'SMS_SENT', `Sent SMS update to client (${caseData.contactNo})`, caseId, caseData.title);

                setSmsHistory([{ id: docRef.id, ...newSms }, ...smsHistory]);
                setTlSmsModal({ isOpen: false, message: '' });
                setAlertModal({ isOpen: true, title: 'Success', message: 'SMS Sent Successfully!', type: 'success' });
            } else {
                const failedSms = {
                    firmId: firmId,
                    message: tlSmsModal.message,
                    sentTo: caseData.contactNo,
                    status: 'Failed',
                    sentAt: new Date().toISOString()
                };
                await addDoc(collection(db, 'cases', caseId, 'messages'), failedSms);
                throw new Error(data.error || "SMS API Provider Failed");
            }
        } catch (err: any) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: "Failed to send SMS: " + err.message, type: 'error' });
        } finally {
            setTlSmsSending(false);
        }
    };

    const handleSendSms = async () => {
        if (!userPerms.sms) return;
        if (!smsMessage) {
            setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Please type a message.', type: 'error' });
            return;
        }
        setSmsSending(true);
        try {
            const res = await fetch('/api/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: caseData.contactNo, message: smsMessage })
            });
            const data = await res.json();

            if (data.success) {
                const newSms = {
                    firmId: firmId,
                    message: smsMessage,
                    sentTo: caseData.contactNo,
                    status: 'Sent',
                    sentAt: new Date().toISOString()
                };
                const docRef = await addDoc(collection(db, 'cases', caseId, 'messages'), newSms);
                await updateDoc(doc(db, 'firms', firmId), { smsQuota: increment(-1) });
                await logActivity(firmId, activeUser.uid, activeUser.name, 'SMS_SENT', `Sent custom SMS to client (${caseData.contactNo})`, caseId, caseData.title);

                setSmsHistory([{ id: docRef.id, ...newSms }, ...smsHistory]);
                setSmsMessage('');
                setAlertModal({ isOpen: true, title: 'Success', message: 'SMS Sent Successfully!', type: 'success' });
            } else {
                const failedSms = {
                    firmId: firmId,
                    message: smsMessage,
                    sentTo: caseData.contactNo,
                    status: 'Failed',
                    sentAt: new Date().toISOString()
                };
                await addDoc(collection(db, 'cases', caseId, 'messages'), failedSms);
                throw new Error(data.error || "SMS API Provider Failed");
            }
        } catch (err: any) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: "Failed to send SMS: " + err.message, type: 'error' });
        } finally {
            setSmsSending(false);
        }
    };

    const filteredSms = smsHistory.filter(sms => {
        if (smsFilter === 'ALL') return true;
        const smsDate = new Date(sms.sentAt);
        const now = new Date();
        if (smsFilter === 'TODAY') return smsDate.toDateString() === now.toDateString();
        if (smsFilter === 'LAST_7') return smsDate >= new Date(now.setDate(now.getDate() - 7));
        if (smsFilter === 'THIS_MONTH') return smsDate.getMonth() === new Date().getMonth() && smsDate.getFullYear() === new Date().getFullYear();
        if (smsFilter === 'LAST_3_MONTHS') return smsDate >= new Date(now.setMonth(now.getMonth() - 3));
        return true;
    });

    const smsPageCount = Math.ceil(filteredSms.length / SMS_PER_PAGE);
    const currentSmsView = filteredSms.slice((smsPage - 1) * SMS_PER_PAGE, smsPage * SMS_PER_PAGE);

    if (loading) {
        return (
            <div className="flex h-[85vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-400"></div>
                    <p className="text-sm font-medium text-[#465769] dark:text-slate-400">Loading case file...</p>
                </div>
            </div>
        );
    }

    if (!userPerms.read) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto p-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-5 border border-rose-200 dark:border-rose-800/50">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-[#2A3642] dark:text-white">Access Denied</h2>
                <p className="text-sm text-[#465769] dark:text-slate-400 mt-2">You do not have permission to view this case details (cases.read required).</p>
                <button onClick={() => router.push('/cases')} className="mt-8 px-8 py-3 bg-[#2A3642] hover:bg-[#465769] text-white rounded-lg font-semibold text-sm transition shadow-md cursor-pointer">Back to Cases</button>
            </div>
        );
    }

    // ---------- Display-only derived values ----------
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const nextHearing = timeline
        .filter(t => t.type === 'Hearing date' && t.status !== 'Completed' && new Date(t.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    const daysToHearing = nextHearing ? Math.round((new Date(nextHearing.date).getTime() - today.getTime()) / 86400000) : null;
    const visibleTimeline = expandedSections.timeline ? timeline : timeline.slice(0, 4);
    const docCount = caseData.documents?.length || 0;
    const clientInitial = (caseData.clientName || '?').trim().charAt(0).toUpperCase();

    const inputStyle = "w-full px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 rounded-lg text-sm text-[#2A3642] dark:text-slate-100 placeholder:text-slate-400 outline-none focus:bg-white dark:focus:bg-[#2A3642] focus:border-[#465769] focus:ring-2 focus:ring-[#465769]/20 transition";
    const labelStyle = "block text-xs font-semibold text-[#465769] dark:text-slate-300 mb-1.5";
    const cardStyle = "bg-white dark:bg-[#2A3642] rounded-2xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm";
    const ghostBtn = "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#465769]/50 bg-white dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#354453] transition cursor-pointer";
    const primaryBtn = "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#566b80] text-white shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <>
            <div className="max-w-[1600px] mx-auto space-y-5 pb-12">

                {/* ================= BACK LINK ================= */}
                <button onClick={() => router.push('/cases')} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#465769] dark:text-slate-400 hover:text-[#2A3642] dark:hover:text-white transition cursor-pointer">
                    <ArrowLeft size={16} /> All cases
                </button>

                {/* ================= CASE HEADER ================= */}
                <section className={`${cardStyle} overflow-hidden`}>
                    <div className="p-5 sm:p-7 flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#465769]/10 text-[#2A3642] dark:bg-[#465769]/40 dark:text-slate-100">{caseData.type || 'Case'}</span>
                                {caseData.courtCaseNo && <span className="text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#465769]/50 text-[#465769] dark:text-slate-300">Court no. {caseData.courtCaseNo}</span>}
                                {caseData.referenceNo && <span className="text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#465769]/50 text-[#465769] dark:text-slate-300">Ref {caseData.referenceNo}</span>}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-[#2A3642] dark:text-white break-words">{caseData.title}</h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            <div className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border ${getGlobalStatusStyle(caseData.status)}`}>
                                <CheckCircle size={15} /> {caseData.status || 'ACTIVE'}
                            </div>
                            {userPerms.write && (
                                <button onClick={() => setStatusModal({ isOpen: true, newStatus: 'Fully completed', customStatus: '' })} className={ghostBtn}>
                                    <Settings size={14} /> Change status
                                </button>
                            )}
                            {userPerms.write && (
                                <button onClick={() => setIsEditing(!isEditing)} className={ghostBtn}>
                                    {isEditing ? <X size={14} /> : <Edit size={14} />} {isEditing ? 'Cancel edit' : 'Edit case'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Client strip */}
                    <div className="px-5 sm:px-7 py-4 bg-[#F8FAFC] dark:bg-[#222C36] border-t border-slate-200/80 dark:border-[#465769]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 shrink-0 rounded-full bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center font-bold">{clientInitial}</div>
                            <div className="min-w-0">
                                <p className="font-semibold text-[#2A3642] dark:text-white truncate">{caseData.clientName}</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-[#465769] dark:text-slate-400">
                                    <span className="inline-flex items-center gap-1"><Phone size={12} /> {caseData.contactNo}</span>
                                    {caseData.email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {caseData.email}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <a href={`tel:${caseData.contactNo}`} className={ghostBtn}><Phone size={14} /> Call</a>
                            {userPerms.sms && (
                                <button onClick={() => setActiveTab('sms')} className={ghostBtn}><MessageSquare size={14} /> Message client</button>
                            )}
                        </div>
                    </div>

                    {/* At-a-glance numbers */}
                    <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200/80 dark:divide-[#465769]/40 border-t border-slate-200/80 dark:border-[#465769]/40">
                        <div className="px-5 sm:px-7 py-4">
                            <p className="text-xs font-medium text-[#465769] dark:text-slate-400">Next hearing</p>
                            {nextHearing ? (
                                <>
                                    <p className="text-sm font-bold text-[#2A3642] dark:text-white mt-1">{new Date(nextHearing.date).toDateString()}</p>
                                    <p className={`text-xs font-medium mt-0.5 ${daysToHearing !== null && daysToHearing <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-[#465769] dark:text-slate-400'}`}>
                                        {daysToHearing === 0 ? 'Today' : daysToHearing === 1 ? 'Tomorrow' : `In ${daysToHearing} days`}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-medium text-slate-400 mt-1">None scheduled</p>
                            )}
                        </div>
                        <div className="px-5 sm:px-7 py-4">
                            <p className="text-xs font-medium text-[#465769] dark:text-slate-400">Timeline updates</p>
                            <p className="text-xl font-bold text-[#2A3642] dark:text-white mt-0.5">{timeline.length}</p>
                        </div>
                        <div className="px-5 sm:px-7 py-4">
                            <p className="text-xs font-medium text-[#465769] dark:text-slate-400">Messages sent</p>
                            <p className="text-xl font-bold text-[#2A3642] dark:text-white mt-0.5">{userPerms.sms ? smsHistory.length : '-'}</p>
                        </div>
                        <div className="px-5 sm:px-7 py-4">
                            <p className="text-xs font-medium text-[#465769] dark:text-slate-400">Documents</p>
                            <p className="text-xl font-bold text-[#2A3642] dark:text-white mt-0.5">{docCount}</p>
                        </div>
                    </div>
                </section>

                {/* ================= MAIN GRID ================= */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">

                    {/* ---------- LEFT: CASE DETAILS / EDIT ---------- */}
                    <section className={`${cardStyle} xl:col-span-5`}>
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-[#465769]/40 flex items-center gap-2.5">
                            <FileText size={18} className="text-[#465769] dark:text-slate-400" />
                            <h2 className="font-bold text-[#2A3642] dark:text-white">{isEditing ? 'Edit case information' : 'Case information'}</h2>
                        </div>

                        {isEditing && userPerms.write ? (
                            <div className="p-5 sm:p-6 space-y-7">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-[#2A3642] dark:text-white">Case details</h3>
                                    <div>
                                        <label className={labelStyle}>Case title *</label>
                                        <input type="text" placeholder="Title *" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className={inputStyle} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelStyle}>Reference no</label>
                                            <input type="text" placeholder="Reference No"
                                                   value={editForm.referenceNo || ''} onChange={e => setEditForm({
                                                ...editForm,
                                                referenceNo: e.target.value
                                            })} className={inputStyle}/>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Court case no</label>
                                            <input type="text" placeholder="Court Case No"
                                                   value={editForm.courtCaseNo || ''} onChange={e => setEditForm({
                                                ...editForm,
                                                courtCaseNo: e.target.value
                                            })} className={inputStyle}/>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Chamber ref</label>
                                            <input type="text" placeholder="Chamber Ref" value={editForm.chamberRef}
                                                   onChange={e => setEditForm({
                                                       ...editForm,
                                                       chamberRef: e.target.value
                                                   })} className={inputStyle}/>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Case type</label>
                                            <select
                                                value={editForm.type || ''}
                                                onChange={e => setEditForm({...editForm, type: e.target.value})}
                                                className={`${inputStyle} cursor-pointer`}
                                            >
                                                <option value="">Select Case Type *</option>
                                                <option value="Civil">Civil</option>
                                                <option value="Criminal">Criminal</option>
                                                <option value="Commercial">Commercial</option>
                                                <option value="Family">Family</option>
                                                <option value="Other">Add New...</option>
                                            </select>
                                            {editForm.type === 'Other' && (
                                                <input
                                                    type="text"
                                                    placeholder="Specify Case Type"
                                                    value={editForm.customType || ''}
                                                    onChange={e => setEditForm({
                                                        ...editForm,
                                                        customType: e.target.value
                                                    })}
                                                    className={`${inputStyle} mt-2`}
                                                    required
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-[#465769]/30">
                                    <h3 className="text-sm font-bold text-[#2A3642] dark:text-white">Client</h3>
                                    <div>
                                        <label className={labelStyle}>Client name</label>
                                        <input
                                            type="text"
                                            placeholder="Client Name"
                                            value={editForm.clientName || ''}
                                            onChange={e => setEditForm({...editForm, clientName: e.target.value})}
                                            className={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Contact no</label>
                                        <input
                                            type="text"
                                            placeholder="Contact No"
                                            value={editForm.contactNo || ''}
                                            onChange={e => setEditForm({...editForm, contactNo: e.target.value})}
                                            className={inputStyle}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelStyle}>ID type</label>
                                            <select
                                                value={editForm.idType || 'NIC'}
                                                onChange={e => setEditForm({...editForm, idType: e.target.value})}
                                                className={`${inputStyle} cursor-pointer`}
                                            >
                                                <option value="NIC">NIC</option>
                                                <option value="Passport">Passport</option>
                                                <option value="Driving License">Driving License</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>{editForm.idType || 'NIC'} number</label>
                                            <input
                                                type="text"
                                                placeholder={
                                                    editForm.idType === 'Passport'
                                                        ? 'Passport Number'
                                                        : editForm.idType === 'Driving License'
                                                            ? 'Driving License Number'
                                                            : 'NIC Number'
                                                }
                                                value={editForm.idNumber || ''}
                                                onChange={e => setEditForm({...editForm, idNumber: e.target.value})}
                                                className={inputStyle}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Email address</label>
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={editForm.email || ''}
                                            onChange={e => setEditForm({...editForm, email: e.target.value})}
                                            className={inputStyle}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-6 border-t border-slate-200/80 dark:border-[#465769]/30">
                                    <h3 className="text-sm font-bold text-[#2A3642] dark:text-white">Documents</h3>
                                    {editDocs.length === 0 &&
                                        <p className="text-xs text-slate-400">No documents yet. Add one below.</p>}
                                    {editDocs.map((d, i) => (
                                        <div key={d.id || i}
                                             className="flex flex-wrap sm:flex-nowrap gap-3 items-center bg-[#F8FAFC] dark:bg-[#1E2730] p-3 rounded-xl border border-dashed border-slate-300 dark:border-[#465769]/50">
                                            <input type="text" value={d.name} onChange={e => {
                                                const nd = [...editDocs];
                                                nd[i].name = e.target.value;
                                                setEditDocs(nd);
                                            }}
                                                   className="px-3 py-2 bg-white dark:bg-[#2A3642] border border-slate-200 dark:border-[#465769]/50 rounded-lg w-full sm:w-2/5 text-xs font-semibold outline-none focus:border-[#465769] dark:text-white"
                                                   placeholder="Document name"/>
                                            {d.url ? <span
                                                    className="text-xs text-emerald-600 font-bold truncate flex-1">Uploaded</span> :
                                                <input type="file" onChange={e => {
                                                    const nd = [...editDocs];
                                                    nd[i].file = e.target.files?.[0];
                                                    setEditDocs(nd);
                                                }}
                                                       className="flex-1 min-w-0 text-xs dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#2A3642] dark:file:bg-[#465769] file:text-white hover:file:opacity-90 file:cursor-pointer"/>}
                                            <button onClick={() => setEditDocs(editDocs.filter((_, idx) => idx !== i))}
                                                    aria-label="Remove document"
                                                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition">
                                                <Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setEditDocs([...editDocs, {
                                        id: Date.now().toString(),
                                        name: ''
                                    }])}
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#465769] dark:text-slate-300 hover:text-[#2A3642] dark:hover:text-white cursor-pointer transition">
                                        <Plus size={14}/> Add document
                                    </button>
                                </div>

                                {/* Sticky save bar */}
                                <div className="sticky bottom-3 flex gap-3 pt-2">
                                    <button onClick={() => setIsEditing(false)} className={`${ghostBtn} px-5 py-3`}>Cancel</button>
                                    <button onClick={handleSaveCase} disabled={loading} className={`${primaryBtn} flex-1 py-3 shadow-lg`}><Save size={17}/> Save changes</button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 sm:p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                                    <Field label="Reference no" value={caseData.referenceNo}/>
                                    <Field label="Court case no" value={caseData.courtCaseNo}/>
                                    <Field label="Chamber ref" value={caseData.chamberRef}/>
                                    <Field label="Case type" value={caseData.type}/>
                                </div>

                                <div className="pt-5 border-t border-slate-200/80 dark:border-[#465769]/30">
                                    <h3 className="text-sm font-bold text-[#2A3642] dark:text-white mb-3 flex items-center gap-2">
                                        <User size={15} className="text-[#465769] dark:text-slate-400"/> Client
                                    </h3>
                                    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                                        <Field label="Name" value={caseData.clientName}/>
                                        <Field label="Contact number" value={caseData.contactNo}/>
                                        <Field label={`${caseData.idType || 'NIC'} number`} value={caseData.idNumber}/>
                                        <Field label="Email" value={caseData.email}/>
                                    </div>
                                </div>

                                <div className="pt-5 border-t border-slate-200/80 dark:border-[#465769]/30">
                                    <h3 className="text-sm font-bold text-[#2A3642] dark:text-white mb-3">
                                        Documents ({docCount})
                                    </h3>
                                    {docCount === 0 ? (
                                        <p className="text-xs text-slate-400">
                                            No documents attached.{userPerms.write ? ' Use Edit case to add some.' : ''}
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {caseData.documents?.map((d: any, i: number) => (
                                                <div
                                                    key={i}
                                                    onClick={() => setPreviewDoc({
                                                        isOpen: true,
                                                        name: d.name || `Document ${i + 1}`,
                                                        url: d.url
                                                    })}
                                                    className="flex items-center justify-between gap-3 text-sm font-medium bg-[#F8FAFC] dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#465769]/50 hover:border-[#465769] dark:hover:border-slate-400 transition cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <FileText size={16}
                                                                  className="text-[#465769] dark:text-slate-400 shrink-0"/>
                                                        <span className="truncate">{d.name}</span>
                                                    </div>
                                                    <span
                                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#465769] dark:text-slate-300 group-hover:text-[#2A3642] dark:group-hover:text-white shrink-0">
                        <Eye size={14}/> Preview &amp; Print
                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ---------- RIGHT: TABS (TIMELINE / MESSAGES) ---------- */}
                    <section className={`${cardStyle} xl:col-span-7`}>
                        <div
                            className="px-3 sm:px-4 border-b border-slate-200/80 dark:border-[#465769]/40 flex items-center gap-1"
                            role="tablist">
                            <button
                                role="tab" aria-selected={activeTab === 'timeline'}
                                onClick={() => setActiveTab('timeline')}
                                className={`relative flex items-center gap-2 px-4 py-4 text-sm font-semibold transition cursor-pointer ${activeTab === 'timeline' ? 'text-[#2A3642] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-[#2A3642] dark:hover:text-white'}`}
                            >
                                <Activity size={17}/> Timeline
                                <span
                                    className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E2730] text-[#465769] dark:text-slate-300">{timeline.length}</span>
                                {activeTab === 'timeline' && <span
                                    className="absolute left-3 right-3 -bottom-px h-0.5 bg-[#2A3642] dark:bg-slate-200 rounded-full"/>}
                            </button>
                            <button
                                role="tab" aria-selected={activeTab === 'sms'}
                                onClick={() => setActiveTab('sms')}
                                className={`relative flex items-center gap-2 px-4 py-4 text-sm font-semibold transition cursor-pointer ${activeTab === 'sms' ? 'text-[#2A3642] dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-[#2A3642] dark:hover:text-white'}`}
                            >
                                <MessageSquare size={17} /> Messages
                                {userPerms.sms && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1E2730] text-[#465769] dark:text-slate-300">{smsHistory.length}</span>}
                                {activeTab === 'sms' && <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-[#2A3642] dark:bg-slate-200 rounded-full" />}
                            </button>
                        </div>

                        {/* ===== TIMELINE TAB ===== */}
                        {activeTab === 'timeline' && (
                            <div className="p-5 sm:p-6 space-y-5">
                                {userPerms.write ? (
                                    showTlForm ? (
                                        <div className="bg-[#F8FAFC] dark:bg-[#1E2730] p-5 rounded-xl border border-slate-200/80 dark:border-[#465769]/40 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-sm text-[#2A3642] dark:text-white">New timeline event</h3>
                                                <button onClick={() => setShowTlForm(false)} aria-label="Close form" className="p-1.5 rounded-md text-slate-400 hover:text-[#2A3642] dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#354453] cursor-pointer transition"><X size={16} /></button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelStyle}>Date *</label>
                                                    <input type="date" value={tlForm.date} onChange={e => setTlForm({...tlForm, date: e.target.value})} className={inputStyle} />
                                                </div>
                                                <div>
                                                    <label className={labelStyle}>Event type *</label>
                                                    <select value={tlForm.type} onChange={e => setTlForm({...tlForm, type: e.target.value})} className={inputStyle}>
                                                        <option>Status update (Proxy/Motion)</option><option>Hearing date</option><option>Minute/Proceeding</option><option>Document filed</option><option>Payment</option><option>Custom/Other</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {tlForm.type === 'Custom/Other' && (
                                                <div>
                                                    <label className={labelStyle}>Specify type</label>
                                                    <input type="text" placeholder="Specify..." value={tlForm.customType} onChange={e => setTlForm({...tlForm, customType: e.target.value})} className={inputStyle}/>
                                                </div>
                                            )}

                                            <div>
                                                <label className={labelStyle}>Assigned staff</label>
                                                <select value={tlForm.staffId} onChange={e => setTlForm({...tlForm, staffId: e.target.value})} className={inputStyle}>
                                                    <option value="">Select staff...</option>{staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className={labelStyle}>Notes</label>
                                                <textarea rows={3} value={tlForm.notes} onChange={e => setTlForm({...tlForm, notes: e.target.value})} className={inputStyle} placeholder="What happened or what is planned?"></textarea>
                                            </div>

                                            <button onClick={handleAddTimeline} disabled={tlSaving} className={`${primaryBtn} w-full`}><Save size={16}/> {tlSaving ? 'Saving...' : 'Save event'}</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowTlForm(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-[#465769]/60 text-sm font-semibold text-[#465769] dark:text-slate-300 hover:border-[#465769] hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] transition cursor-pointer">
                                            <Plus size={17} /> Add timeline event
                                        </button>
                                    )
                                ) : (
                                    <div className="p-4 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl border border-slate-200 dark:border-[#465769]/40 text-center">
                                        <p className="text-slate-400 text-xs font-medium">You do not have permission to add updates (cases.write required).</p>
                                    </div>
                                )}

                                {/* History */}
                                {timeline.length === 0 ? (
                                    <div className="text-center py-12">
                                        <CalendarClock size={34} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                        <p className="text-sm font-semibold text-[#2A3642] dark:text-white">No timeline events yet</p>
                                        <p className="text-xs text-slate-400 mt-1">Hearings, filings and payments you record will show here, newest first.</p>
                                    </div>
                                ) : (
                                    <ol className="relative border-l-2 border-slate-200 dark:border-[#465769]/40 ml-2 space-y-4">
                                        {visibleTimeline.map(item => (
                                            <li key={item.id} className="relative pl-6">
                                                <span className={`absolute -left-[9px] top-5 w-4 h-4 rounded-full ring-4 ring-white dark:ring-[#2A3642] ${timelineDotColor(item.status)}`}></span>

                                                <div className="bg-[#F8FAFC] dark:bg-[#1E2730] p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-[#465769]/40">
                                                    <div className="flex justify-between items-start gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
    <span className="text-sm font-bold text-[#2A3642] dark:text-white">
        {item.type === 'Custom/Other' ? item.customType : item.type}
    </span>
                                                                <span
                                                                    className={`text-xs font-semibold px-2 py-0.5 rounded-md ${timelineBadgeStyle(item.status || 'Pending')}`}>
        {item.status || 'Pending'}
    </span>
                                                            </div>
                                                            <p className="text-xs font-medium text-[#465769] dark:text-slate-400 mt-1 flex items-center gap-1.5">
                                                                <Calendar
                                                                    size={13}/> {new Date(item.date).toDateString()}
                                                            </p>
                                                        </div>

                                                        {(userPerms.write || userPerms.sms) && (
                                                            <div className="relative shrink-0">
                                                                <button
                                                                    onClick={() => setActiveDropdown(activeDropdown === item.id ? null : item.id)}
                                                                    aria-label="Actions" className="text-slate-400 hover:text-[#2A3642] dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#354453] transition cursor-pointer"><MoreVertical size={18}/></button>

                                                                {activeDropdown === item.id && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                                                        <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-[#2A3642] border border-slate-200 dark:border-[#465769] shadow-xl rounded-xl z-20 overflow-hidden text-xs font-semibold">
                                                                            {userPerms.sms && (
                                                                                <button onClick={() => openTimelineSmsModal(item)} className="w-full text-left px-4 py-3 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] flex items-center gap-3 text-[#2A3642] dark:text-white cursor-pointer transition"><Send size={15} className="text-blue-500" /> Send SMS to client</button>
                                                                            )}
                                                                            {userPerms.write && (
                                                                                <>
                                                                                    <div className="h-px bg-slate-100 dark:bg-[#465769]/40"></div>
                                                                                    <button onClick={() => updateTimelineStatus(item.id, 'Pending')} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1E2730] flex items-center gap-3 text-slate-600 dark:text-slate-300 cursor-pointer transition"><Clock size={15} /> Mark pending</button>
                                                                                    <button onClick={() => updateTimelineStatus(item.id, 'Completed')} className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 cursor-pointer transition"><CheckCircle size={15} /> Mark complete</button>
                                                                                    <button onClick={() => updateTimelineStatus(item.id, 'Postponed')} className="w-full text-left px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-3 text-amber-700 dark:text-amber-300 cursor-pointer transition"><Clock size={15} /> Postpone</button>
                                                                                    <button onClick={() => updateTimelineStatus(item.id, 'Urgent')} className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-3 text-rose-700 dark:text-rose-300 cursor-pointer transition"><AlertTriangle size={15} /> Mark urgent</button>
                                                                                    <div className="h-px bg-slate-100 dark:bg-[#465769]/40"></div>
                                                                                    <button onClick={() => deleteTimelineEntry(item.id)} className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-3 text-rose-600 cursor-pointer transition"><Trash2 size={15} /> Remove log</button>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {item.notes && <p className="text-sm text-[#2A3642] dark:text-slate-300 mt-3 whitespace-pre-wrap">{item.notes}</p>}
                                                    <p className="mt-3 text-xs text-slate-400">Updated by <span className="font-semibold text-[#2A3642] dark:text-slate-200">{item.staffName}</span></p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}

                                {timeline.length > 4 && (
                                    <button
                                        onClick={() => setExpandedSections(prev => ({ ...prev, timeline: !prev.timeline }))}
                                        className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#465769] dark:text-slate-300 hover:text-[#2A3642] dark:hover:text-white bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/40 rounded-lg transition cursor-pointer"
                                    >
                                        {expandedSections.timeline ? <>Show fewer <ChevronUp size={14} /></> : <>Show all {timeline.length} updates <ChevronDown size={14} /></>}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ===== MESSAGES TAB ===== */}
                        {activeTab === 'sms' && (
                            userPerms.sms ? (
                                <div className="p-5 sm:p-6 space-y-6">
                                    <div className="bg-[#F8FAFC] dark:bg-[#1E2730] p-5 rounded-xl border border-slate-200/80 dark:border-[#465769]/40 space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="font-bold text-sm text-[#2A3642] dark:text-white flex items-center gap-2"><Send size={16} className="text-[#465769] dark:text-slate-400"/> New message</h3>
                                            <p className="text-xs text-[#465769] dark:text-slate-400">To <span className="font-semibold text-[#2A3642] dark:text-white">{caseData.clientName}</span> ({caseData.contactNo})</p>
                                        </div>
                                        <textarea rows={4} value={smsMessage} onChange={e => setSmsMessage(e.target.value)} className={inputStyle} placeholder="Type your message to the client..."></textarea>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">{smsMessage.length} characters</span>
                                            <button onClick={handleSendSms} disabled={smsSending || !smsMessage.trim()} className={primaryBtn}>{smsSending ? 'Sending...' : <><Send size={15}/> Send SMS</>}</button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center gap-3">
                                            <h3 className="font-bold text-sm text-[#2A3642] dark:text-white flex items-center gap-2"><History size={16} className="text-[#465769] dark:text-slate-400"/> Sent history</h3>
                                            <select value={smsFilter} onChange={e => {setSmsFilter(e.target.value); setSmsPage(1);}} className="px-3 py-2 text-xs font-semibold border border-slate-200 dark:border-[#465769]/50 rounded-lg bg-white dark:bg-[#1E2730] text-[#2A3642] dark:text-white outline-none cursor-pointer focus:border-[#465769]">
                                                <option value="ALL">All time</option><option value="TODAY">Today</option><option value="LAST_7">Past 7 days</option><option value="THIS_MONTH">This month</option><option value="LAST_3_MONTHS">Last 3 months</option>
                                            </select>
                                        </div>

                                        {currentSmsView.length === 0 ? (
                                            <div className="text-center py-10">
                                                <MessageSquare size={30} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                                                <p className="text-sm text-slate-400">No messages in this period.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {currentSmsView.map(sms => (
                                                    <div key={sms.id} className="flex flex-col items-end">
                                                        <div className={`max-w-[92%] sm:max-w-[80%] px-4 py-3 rounded-2xl rounded-tr-md text-sm whitespace-pre-wrap ${sms.status === 'Failed' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-800/50' : 'bg-[#2A3642] dark:bg-[#465769] text-white'}`}>
                                                            {sms.message}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                                                            <span className={`font-semibold ${sms.status === 'Failed' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{sms.status}</span>
                                                            <span>{new Date(sms.sentAt).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {smsPageCount > 1 && (
                                            <div className="flex justify-between items-center pt-2">
                                                <button disabled={smsPage === 1} onClick={() => setSmsPage(p => p-1)} className={`${ghostBtn} disabled:opacity-40 disabled:cursor-not-allowed`}>Previous</button>
                                                <span className="text-xs font-medium text-[#465769] dark:text-slate-300">Page {smsPage} of {smsPageCount}</span>
                                                <button disabled={smsPage === smsPageCount} onClick={() => setSmsPage(p => p+1)} className={`${ghostBtn} disabled:opacity-40 disabled:cursor-not-allowed`}>Next</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-14 text-center">
                                    <AlertTriangle size={38} className="mx-auto mb-3 text-slate-400" />
                                    <h3 className="text-base font-bold text-[#2A3642] dark:text-white">Permission required</h3>
                                    <p className="text-sm text-[#465769] dark:text-slate-400 mt-1.5 max-w-sm mx-auto">You do not have permission to view or send SMS messages (sms.send required).</p>
                                </div>
                            )
                        )}
                    </section>
                </div>
            </div>

            {/* ================= STATUS MODAL ================= */}
            {statusModal.isOpen && userPerms.write && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#465769]">
                        <h3 className="text-lg font-bold mb-1 text-[#2A3642] dark:text-white">Change case status</h3>
                        <p className="text-xs text-[#465769] dark:text-slate-400 mb-5">Currently: {caseData.status || 'ACTIVE'}</p>

                        <div className="space-y-2" role="radiogroup">
                            {[
                                { value: 'ACTIVE', label: 'Active', hint: 'Case is ongoing' },
                                { value: 'Fully completed', label: 'Fully completed', hint: 'All work is done' },
                                { value: 'Settled', label: 'Settled', hint: 'Resolved by agreement' },
                                { value: 'Custom', label: 'Custom status', hint: 'Write your own, e.g. On hold' },
                            ].map(opt => (
                                <label key={opt.value} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${statusModal.newStatus === opt.value ? 'border-[#2A3642] dark:border-slate-300 bg-[#F8FAFC] dark:bg-[#1E2730]' : 'border-slate-200 dark:border-[#465769]/50 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730]'}`}>
                                    <input type="radio" name="case-status" className="mt-1 accent-[#2A3642]" checked={statusModal.newStatus === opt.value} onChange={() => setStatusModal({ ...statusModal, newStatus: opt.value })} />
                                    <span>
                                        <span className="block text-sm font-semibold text-[#2A3642] dark:text-white">{opt.label}</span>
                                        <span className="block text-xs text-[#465769] dark:text-slate-400">{opt.hint}</span>
                                    </span>
                                </label>
                            ))}
                        </div>

                        {statusModal.newStatus === 'Custom' && (
                            <div className="mt-4">
                                <label className={labelStyle}>Custom status</label>
                                <input type="text" placeholder="e.g. On Hold" value={statusModal.customStatus} onChange={(e) => setStatusModal({ ...statusModal, customStatus: e.target.value })} className={inputStyle} />
                            </div>
                        )}

                        <div className="flex gap-3 justify-end mt-7">
                            <button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className={`${ghostBtn} px-5 py-2.5 text-sm`}>Cancel</button>
                            <button onClick={updateGlobalStatus} disabled={statusUpdating} className={primaryBtn}>{statusUpdating ? 'Updating...' : 'Update status'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= TIMELINE SMS MODAL ================= */}
            {tlSmsModal.isOpen && userPerms.sms && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#465769]">
                        <h3 className="text-lg font-bold mb-1 text-[#2A3642] dark:text-white">Send update via SMS</h3>
                        <p className="text-xs text-[#465769] dark:text-slate-300 mb-4">
                            To <strong className="text-[#2A3642] dark:text-white">{caseData.clientName}</strong> ({caseData.contactNo}). You can edit the message before sending.
                        </p>
                        <textarea rows={7} value={tlSmsModal.message} onChange={(e) => setTlSmsModal({...tlSmsModal, message: e.target.value})} className={inputStyle}></textarea>
                        <p className="text-xs text-slate-400 mt-1.5">{tlSmsModal.message.length} characters</p>
                        <div className="flex gap-3 justify-end mt-6">
                            <button onClick={() => setTlSmsModal({ isOpen: false, message: '' })} className={`${ghostBtn} px-5 py-2.5 text-sm`}>Cancel</button>
                            <button onClick={sendTimelineSms} disabled={tlSmsSending} className={primaryBtn}>
                                {tlSmsSending ? 'Sending...' : <><Send size={14}/> Send SMS</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= CONFIRM MODAL ================= */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-2xl p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#465769] text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={28} />
                        </div>
                        <h3 className="text-lg font-bold text-[#2A3642] dark:text-white mb-2">{confirmModal.title}</h3>
                        <p className="text-sm text-[#465769] dark:text-slate-300 mb-7">{confirmModal.message}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className={`${ghostBtn} flex-1 justify-center py-3 text-sm`}>Cancel</button>
                            <button onClick={confirmModal.onConfirm} className="flex-1 py-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition cursor-pointer">Yes, proceed</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= ALERT MODAL ================= */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-2xl p-6 sm:p-7 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#465769] text-center animate-in fade-in zoom-in duration-200">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                            alertModal.type === 'error' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' :
                                alertModal.type === 'success' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                                    'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        }`}>
                            {alertModal.type === 'error' ? <AlertTriangle size={28} /> : <CheckCircle size={28} />}
                        </div>
                        <h3 className="text-lg font-bold text-[#2A3642] dark:text-white mb-2">{alertModal.title}</h3>
                        <p className="text-sm text-[#465769] dark:text-slate-300 mb-7">{alertModal.message}</p>
                        <button onClick={() => setAlertModal({ isOpen: false, message: '' })} className={`${primaryBtn} w-full`}>OK</button>
                    </div>
                </div>
            )}
            {/* ================= DOCUMENT PREVIEW & PRINT MODAL ================= */}
            {previewDoc.isOpen && (
                <div className="fixed mt-14 inset-0 z-[140] flex items-center justify-center bg-[#2A3642]/80 backdrop-blur-xs p-3 sm:p-6">
                    <div className="bg-white dark:bg-[#2A3642] rounded-2xl w-full max-w-4xl h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-[#465769] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-5 py-4 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/50 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <FileText size={18} className="text-[#465769] dark:text-slate-300 shrink-0" />
                                <h3 className="text-sm sm:text-base font-bold text-[#2A3642] dark:text-white truncate">
                                    {previewDoc.name}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handlePrintPreviewDoc}
                                    disabled={printingDoc}
                                    className={primaryBtn}
                                >
                                    <Printer size={15} />
                                    {printingDoc ? 'Preparing...' : 'Print Document'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDoc({ isOpen: false, name: '', url: '' })}
                                    aria-label="Close preview"
                                    className="p-2 rounded-lg text-slate-500 hover:text-[#2A3642] dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-[#354453] transition cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Document Viewer Body */}
                        <div className="flex-1 bg-slate-100 dark:bg-[#182028] overflow-auto flex items-center justify-center p-3 sm:p-5">
                            {isImageFile(previewDoc.url, previewDoc.name) ? (
                                <img
                                    src={previewDoc.url}
                                    alt={previewDoc.name}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-md bg-white"
                                />
                            ) : (
                                <iframe
                                    src={previewDoc.url}
                                    title={previewDoc.name}
                                    className="w-full h-full rounded-lg border border-slate-200 dark:border-[#465769]/40 bg-white"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}