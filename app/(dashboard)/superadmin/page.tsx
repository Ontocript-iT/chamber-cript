'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import {
    collection, query, getDocs, updateDoc, doc, setDoc, addDoc, deleteDoc, where
} from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
    ShieldAlert, CheckCircle, XCircle, Power, Database,
    Building2, Briefcase, CreditCard, Eye, X, Search, Clock,
    Plus, Mail, Calendar, AlertTriangle, RefreshCw, Ban,
    MessageSquare, RotateCcw, Trash2, ArrowDownRight,
    KeyRound, Send, Copy, Check
} from 'lucide-react';

type Firm = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    ownerName?: string;
    ownerId?: string;
    smsQuota?: number;
    isActive?: boolean;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    planType?: 'TRIAL' | 'PAID';
    trialStartsAt?: string;
    trialEndsAt?: string;
    createdAt?: string;
};

type PaymentRecord = {
    id: string;
    firmId: string;
    firmName: string;
    billingMonth: string; // e.g., "2026-11"
    amount: number;
    method: string;
    reference?: string;
    status: 'PAID' | 'PENDING';
    paidAt: string;
};

export default function SuperAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const [firms, setFirms] = useState<Firm[]>([]);
    const [smsRequests, setSmsRequests] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [cases, setCases] = useState<any[]>([]);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);

    // Month Tracking (hydrated in useEffect to keep Next.js 16 prerendering deterministic)
    const [currentMonthKey, setCurrentMonthKey] = useState('2026-11');
    const [lastMonthKey, setLastMonthKey] = useState('2026-10');
    const [selectedBillingMonth, setSelectedBillingMonth] = useState('2026-11');

    // Law Firm Filter & Search States
    const [firmTab, setFirmTab] = useState<
        'ALL' | 'UNPAID' | 'PAID' | 'TRIAL' | 'TRIAL_EXPIRED' | 'PENDING' | 'ACTIVE' | 'SUSPENDED'
    >('ALL');
    const [firmSearch, setFirmSearch] = useState('');

    // SMS Quota Request Filter States
    const [smsStatusFilter, setSmsStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
    const [smsSearch, setSmsSearch] = useState('');

    // Firm Detail & Payment Slide-Over Drawer
    const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);
    const [drawerTab, setDrawerTab] = useState<'OVERVIEW' | 'MEMBERS' | 'PAYMENTS'>('OVERVIEW');

    // New Monthly Payment Form
    const [payMonth, setPayMonth] = useState('2026-11');
    const [payAmount, setPayAmount] = useState('5000');
    const [payMethod, setPayMethod] = useState('Bank Transfer');
    const [payRef, setPayRef] = useState('');
    const [savingPayment, setSavingPayment] = useState(false);

    // Password Reset Modal State
    const [resetModal, setResetModal] = useState<{
        isOpen: boolean;
        firmName: string;
        targetUid?: string;
        targetName: string;
        targetEmail: string;
        mode: 'EMAIL_LINK' | 'TEMP_PASSWORD';
        tempPassword: string;
        resetPin: boolean;
        submitting: boolean;
        copied: boolean;
    }>({
        isOpen: false,
        firmName: '',
        targetUid: undefined,
        targetName: '',
        targetEmail: '',
        mode: 'EMAIL_LINK',
        tempPassword: '',
        resetPin: false,
        submitting: false,
        copied: false,
    });

    // Custom Modals
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        isOpen: false, title: 'Notification', message: '', type: 'info'
    });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; danger?: boolean; onConfirm: () => void }>({
        isOpen: false, title: 'Confirm Action', message: '', danger: false, onConfirm: () => {}
    });

    useEffect(() => {
        const now = new Date();
        const curr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        setCurrentMonthKey(curr);
        setLastMonthKey(prev);
        setSelectedBillingMonth(curr);
        setPayMonth(curr);
    }, []);

    const getTrialInfo = (firm: Firm) => {
        if (firm.planType !== 'TRIAL' || !firm.trialEndsAt) {
            return { isTrial: false, isExpired: false, daysLeft: null, endDateStr: '' };
        }
        const endMs = new Date(firm.trialEndsAt).getTime();
        const diffMs = endMs - Date.now();
        const isExpired = diffMs <= 0;
        const daysLeft = isExpired ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const endDateStr = new Date(firm.trialEndsAt).toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
        return { isTrial: true, isExpired, daysLeft, endDateStr };
    };

    const activeTrialFirms = firms.filter(f => {
        const t = getTrialInfo(f);
        return f.approvalStatus === 'APPROVED' && t.isTrial && !t.isExpired;
    });

    const expiredTrialFirms = firms.filter(f => {
        const t = getTrialInfo(f);
        return f.approvalStatus === 'APPROVED' && t.isTrial && t.isExpired;
    });

    const fetchAllData = async () => {
        // 1. Firms
        const firmSnap = await getDocs(collection(db, 'firms'));
        const firmList = firmSnap.docs.map(d => ({ id: d.id, ...d.data() } as Firm));
        firmList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setFirms(firmList);

        // 2. SMS Requests
        const reqSnap = await getDocs(collection(db, 'sms_requests'));
        const reqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        reqs.sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
        setSmsRequests(reqs);

        // 3. Users (Lawyers & Staff)
        const userSnap = await getDocs(collection(db, 'users'));
        setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 4. Cases (for firm case counts)
        const caseSnap = await getDocs(collection(db, 'cases'));
        setCases(caseSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 5. Monthly Payments
        const paySnap = await getDocs(collection(db, 'firm_payments'));
        const payList = paySnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord));
        payList.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
        setPayments(payList);
    };

    const handleManualRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchAllData();
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (!u) return router.push('/login');
            try {
                const uDocSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', u.uid)));
                if (uDocSnap.docs[0]?.data().role !== 'SUPER_ADMIN') {
                    router.push('/dashboard');
                    return;
                }
                setIsSuperAdmin(true);
                await fetchAllData();
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    // --- Password Reset Helpers ---
    const generateTempPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
        let rand = '';
        for (let i = 0; i < 6; i++) {
            rand += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `Law@${rand}9`;
    };

    const openResetPasswordModal = (firm: Firm, member?: any) => {
        const owner =
            member ||
            users.find(u => u.firmId === firm.id && u.role === 'LAWYER') ||
            users.find(u => u.id === firm.ownerId);

        const targetEmail = owner?.email || firm.email || '';
        const targetName = owner?.name || firm.ownerName || firm.name || 'Principal Lawyer';

        if (!targetEmail && !owner?.id) {
            setAlertModal({
                isOpen: true,
                title: 'Missing Account Email',
                message: 'No user email or account ID was found for this law firm.',
                type: 'error',
            });
            return;
        }

        setResetModal({
            isOpen: true,
            firmName: firm.name || 'Unnamed Firm',
            targetUid: owner?.id,
            targetName,
            targetEmail,
            mode: 'EMAIL_LINK',
            tempPassword: generateTempPassword(),
            resetPin: false,
            submitting: false,
            copied: false,
        });
    };

    const handleCopyTempPassword = async () => {
        try {
            await navigator.clipboard.writeText(resetModal.tempPassword);
            setResetModal(prev => ({ ...prev, copied: true }));
            setTimeout(() => setResetModal(prev => ({ ...prev, copied: false })), 2000);
        } catch {
            // Clipboard fallback ignored
        }
    };

    const handleExecutePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetModal(prev => ({ ...prev, submitting: true }));

        try {
            if (resetModal.mode === 'EMAIL_LINK') {
                if (!resetModal.targetEmail) {
                    throw new Error('No email address found for this user.');
                }
                await sendPasswordResetEmail(auth, resetModal.targetEmail.trim());
                const sentTo = resetModal.targetEmail;
                setResetModal(prev => ({ ...prev, isOpen: false, submitting: false }));
                setAlertModal({
                    isOpen: true,
                    title: 'Reset Email Sent',
                    message: `A Firebase password reset link has been emailed to ${sentTo}.`,
                    type: 'success',
                });
            } else {
                const cleanPass = resetModal.tempPassword.trim();
                if (cleanPass.length < 8) {
                    throw new Error('Temporary password must be at least 8 characters.');
                }

                const idToken = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/admin/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        targetUid: resetModal.targetUid,
                        targetEmail: resetModal.targetEmail,
                        newPassword: cleanPass,
                        resetPin: resetModal.resetPin,
                    }),
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to update password.');
                }

                const targetLabel = `${resetModal.targetName} (${resetModal.targetEmail})`;
                const pinNote = resetModal.resetPin ? ' Their 6-digit PIN was also cleared.' : '';
                setResetModal(prev => ({ ...prev, isOpen: false, submitting: false }));
                setAlertModal({
                    isOpen: true,
                    title: 'Temporary Password Set',
                    message: `Password updated for ${targetLabel}. Share "${cleanPass}" with them — they will be required to set a new password on next login.${pinNote}`,
                    type: 'success',
                });
            }
        } catch (err: any) {
            setResetModal(prev => ({ ...prev, submitting: false }));
            setAlertModal({
                isOpen: true,
                title: 'Password Reset Failed',
                message: err?.message || 'Unable to complete password reset.',
                type: 'error',
            });
        }
    };

    // --- Firm Approval / Rejection / Access Control ---
    const handleApproveFirm = (firm: Firm) => {
        setConfirmModal({
            isOpen: true,
            title: 'Approve Law Firm & Start 14-Day Trial',
            message: `Approve "${firm.name}", activate their 14-day free trial, and send SMS & Email confirmation?`,
            danger: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const now = new Date();
                    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                    const trialEndDateStr = trialEnd.toLocaleDateString('en-LK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    });

                    // 1. Update Firestore directly
                    await setDoc(
                        doc(db, 'firms', firm.id),
                        {
                            approvalStatus: 'APPROVED',
                            isActive: true,
                            planType: 'TRIAL',
                            approvedAt: now.toISOString(),
                            trialStartsAt: now.toISOString(),
                            trialEndsAt: trialEnd.toISOString(),
                        },
                        { merge: true }
                    );

                    // 2. Send SMS notification if phone exists
                    if (firm.phone) {
                        const smsText = `ChamberCript: Your law firm "${firm.name}" is approved! Your 14-day free trial is active until ${trialEndDateStr}. Sign in now to set up your 6-digit PIN.`;
                        await fetch('/api/sms', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ phone: firm.phone, message: smsText }),
                        }).catch(() => {});
                    }

                    // 3. Send Email notification (if you have /api/notify-approval or Brevo route)
                    if (firm.email) {
                        await fetch('/api/admin/notify-approval', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: firm.email,
                                ownerName: firm.ownerName || firm.name,
                                firmName: firm.name,
                                trialEndDate: trialEndDateStr,
                            }),
                        }).catch(() => {});
                    }

                    setFirms(prev =>
                        prev.map(f =>
                            f.id === firm.id
                                ? {
                                    ...f,
                                    approvalStatus: 'APPROVED',
                                    isActive: true,
                                    planType: 'TRIAL',
                                    trialEndsAt: trialEnd.toISOString(),
                                }
                                : f
                        )
                    );

                    setAlertModal({
                        isOpen: true,
                        title: 'Firm Approved & Trial Activated',
                        message: `${firm.name} is now active on a 14-day trial until ${trialEndDateStr}.`,
                        type: 'success',
                    });
                } catch (err: any) {
                    setAlertModal({
                        isOpen: true,
                        title: 'Error',
                        message: err?.message || 'Failed to approve law firm.',
                        type: 'error',
                    });
                }
            },
        });
    };

    const handleRejectFirm = (firm: Firm) => {
        setConfirmModal({
            isOpen: true,
            title: 'Reject Registration',
            message: `Reject "${firm.name}"? Their account will remain blocked from logging in.`,
            danger: true,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await setDoc(doc(db, 'firms', firm.id), {
                        approvalStatus: 'REJECTED',
                        isActive: false,
                        rejectedAt: new Date().toISOString()
                    }, { merge: true });

                    setFirms(prev => prev.map(f => f.id === firm.id ? { ...f, approvalStatus: 'REJECTED', isActive: false } : f));
                    if (selectedFirm?.id === firm.id) {
                        setSelectedFirm(prev => prev ? { ...prev, approvalStatus: 'REJECTED', isActive: false } : null);
                    }
                    setAlertModal({ isOpen: true, title: 'Registration Rejected', message: `${firm.name} has been rejected and denied access.`, type: 'info' });
                } catch (err) {
                    setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to reject registration.', type: 'error' });
                }
            }
        });
    };

    const toggleFirmStatus = (firm: Firm) => {
        const currentlyActive = firm.isActive !== false && firm.approvalStatus !== 'PENDING' && firm.approvalStatus !== 'REJECTED';
        setConfirmModal({
            isOpen: true,
            title: currentlyActive ? 'Suspend System Access' : 'Activate System Access',
            message: currentlyActive
                ? `Deny access for "${firm.name}"? Both the Principal Lawyer and all staff members will be immediately locked out.`
                : `Restore system access for "${firm.name}" and its members?`,
            danger: currentlyActive,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    const nextActive = !currentlyActive;
                    await setDoc(doc(db, 'firms', firm.id), {
                        isActive: nextActive,
                        approvalStatus: nextActive ? 'APPROVED' : (firm.approvalStatus || 'APPROVED')
                    }, { merge: true });

                    setFirms(prev => prev.map(f => f.id === firm.id ? { ...f, isActive: nextActive, approvalStatus: nextActive ? 'APPROVED' : f.approvalStatus } : f));
                    if (selectedFirm?.id === firm.id) {
                        setSelectedFirm(prev => prev ? { ...prev, isActive: nextActive, approvalStatus: nextActive ? 'APPROVED' : prev.approvalStatus } : null);
                    }
                    setAlertModal({
                        isOpen: true,
                        title: nextActive ? 'Access Restored' : 'Access Denied',
                        message: nextActive ? `${firm.name} is now active.` : `${firm.name} and all its members are now blocked.`,
                        type: nextActive ? 'success' : 'info'
                    });
                } catch (err) {
                    setAlertModal({ isOpen: true, title: 'Error', message: 'Status update failed.', type: 'error' });
                }
            }
        });
    };

    // --- Open Payment Drawer pre-filled with the selected billing month ---
    const openPaymentForFirm = (firm: Firm) => {
        setSelectedFirm(firm);
        setPayMonth(selectedBillingMonth);
        setDrawerTab('PAYMENTS');
    };

    // --- Record Monthly Payment ---
    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFirm) return;
        const amountNum = Number(payAmount);
        if (!payMonth || isNaN(amountNum) || amountNum <= 0) {
            setAlertModal({ isOpen: true, title: 'Validation Error', message: 'Please enter a valid billing month and amount.', type: 'error' });
            return;
        }

        setSavingPayment(true);
        try {
            const payload = {
                firmId: selectedFirm.id,
                firmName: selectedFirm.name || 'Unnamed Firm',
                billingMonth: payMonth,
                amount: amountNum,
                method: payMethod,
                reference: payRef.trim(),
                status: 'PAID' as const,
                paidAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, 'firm_payments'), payload);
            setPayments(prev => [{ id: docRef.id, ...payload }, ...prev]);
            setPayRef('');
            setAlertModal({
                isOpen: true,
                title: 'Payment Recorded',
                message: `Recorded Rs. ${amountNum.toLocaleString()} for ${selectedFirm.name} (${payMonth}).`,
                type: 'success'
            });
        } catch (err) {
            console.error(err);
            setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to record payment.', type: 'error' });
        } finally {
            setSavingPayment(false);
        }
    };

    const handleDeletePayment = (payment: PaymentRecord) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Payment Entry',
            message: `Delete the ${payment.billingMonth} payment record (Rs. ${Number(payment.amount).toLocaleString()}) for ${payment.firmName}?`,
            danger: true,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await deleteDoc(doc(db, 'firm_payments', payment.id));
                    setPayments(prev => prev.filter(p => p.id !== payment.id));
                    setAlertModal({ isOpen: true, title: 'Removed', message: 'Payment record deleted.', type: 'info' });
                } catch (err) {
                    setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to remove payment entry.', type: 'error' });
                }
            }
        });
    };

    // --- SMS Request Actions ---
    const handleApproveSms = (req: any) => {
        setConfirmModal({
            isOpen: true,
            title: 'Approve SMS Top-Up',
            message: `Credit +${Number(req.quota).toLocaleString()} SMS to ${req.firmName} (Rs. ${Number(req.price).toLocaleString()})?`,
            danger: false,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await updateDoc(doc(db, 'sms_requests', req.id), { status: 'APPROVED', approvedAt: new Date().toISOString() });
                    const firm = firms.find(f => f.id === req.firmId);
                    const newQuota = (firm?.smsQuota || 0) + Number(req.quota);

                    await setDoc(doc(db, 'firms', req.firmId), {
                        smsQuota: newQuota,
                        name: req.firmName
                    }, { merge: true });

                    setSmsRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'APPROVED' } : r));
                    setFirms(prev => prev.map(f => f.id === req.firmId ? { ...f, smsQuota: newQuota } : f));
                    setAlertModal({ isOpen: true, title: 'Quota Credited', message: `Added +${Number(req.quota).toLocaleString()} SMS credits to ${req.firmName}.`, type: 'success' });
                } catch (err) {
                    setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to approve SMS request.', type: 'error' });
                }
            }
        });
    };

    const handleRejectSms = (reqId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Reject SMS Request',
            message: 'Are you sure you want to reject this SMS quota request?',
            danger: true,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await updateDoc(doc(db, 'sms_requests', reqId), { status: 'REJECTED' });
                    setSmsRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'REJECTED' } : r));
                    setAlertModal({ isOpen: true, title: 'Rejected', message: 'SMS request has been rejected.', type: 'info' });
                } catch (err) {
                    setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to reject request.', type: 'error' });
                }
            }
        });
    };

    // --- Derived Counts & Payment Status Helpers ---
    const getPaidRecordForMonth = (firmId: string, monthKey: string) =>
        payments.find(p => p.firmId === firmId && p.billingMonth === monthKey && p.status === 'PAID');

    const isFirmPaidForMonth = (firmId: string, monthKey: string) =>
        Boolean(getPaidRecordForMonth(firmId, monthKey));

    const pendingFirms = firms.filter(f => f.approvalStatus === 'PENDING');
    const activeFirms = firms.filter(f => f.approvalStatus !== 'PENDING' && f.approvalStatus !== 'REJECTED' && f.isActive !== false);
    const suspendedFirms = firms.filter(f => f.approvalStatus === 'REJECTED' || (f.approvalStatus !== 'PENDING' && f.isActive === false));

    const billableFirms = firms.filter(f => f.approvalStatus !== 'PENDING' && f.approvalStatus !== 'REJECTED');
    const unpaidFirmsForSelectedMonth = billableFirms.filter(f => !isFirmPaidForMonth(f.id, selectedBillingMonth));
    const paidFirmsForSelectedMonth = billableFirms.filter(f => isFirmPaidForMonth(f.id, selectedBillingMonth));

    const filteredFirms = firms.filter(firm => {
        const q = firmSearch.toLowerCase();
        const matchesSearch =
            (firm.name || '').toLowerCase().includes(q) ||
            (firm.email || '').toLowerCase().includes(q) ||
            (firm.ownerName || '').toLowerCase().includes(q) ||
            (firm.phone || '').toLowerCase().includes(q);

        if (!matchesSearch) return false;

        const trial = getTrialInfo(firm);

        if (firmTab === 'TRIAL') {
            return firm.approvalStatus === 'APPROVED' && trial.isTrial && !trial.isExpired;
        }
        if (firmTab === 'TRIAL_EXPIRED') {
            return firm.approvalStatus === 'APPROVED' && trial.isTrial && trial.isExpired;
        }
        if (firmTab === 'UNPAID') {
            return firm.approvalStatus !== 'PENDING' && firm.approvalStatus !== 'REJECTED' && !isFirmPaidForMonth(firm.id, selectedBillingMonth);
        }
        if (firmTab === 'PAID') {
            return firm.approvalStatus !== 'PENDING' && firm.approvalStatus !== 'REJECTED' && isFirmPaidForMonth(firm.id, selectedBillingMonth);
        }
        if (firmTab === 'PENDING') return firm.approvalStatus === 'PENDING';
        if (firmTab === 'ACTIVE') return firm.approvalStatus !== 'PENDING' && firm.approvalStatus !== 'REJECTED' && firm.isActive !== false;
        if (firmTab === 'SUSPENDED') return firm.approvalStatus === 'REJECTED' || (firm.approvalStatus !== 'PENDING' && firm.isActive === false);
        return true;
    });

    // --- Filtered SMS Quota Requests ---
    const pendingSmsCount = smsRequests.filter(r => r.status === 'PENDING').length;
    const approvedSmsCount = smsRequests.filter(r => r.status === 'APPROVED').length;
    const rejectedSmsCount = smsRequests.filter(r => r.status === 'REJECTED').length;

    const filteredSmsRequests = smsRequests.filter(req => {
        const matchesStatus = smsStatusFilter === 'ALL' || req.status === smsStatusFilter;
        const q = smsSearch.toLowerCase();
        const matchesQuery =
            (req.firmName || '').toLowerCase().includes(q) ||
            (req.packageName || '').toLowerCase().includes(q) ||
            String(req.quota || '').includes(q);
        return matchesStatus && matchesQuery;
    });

    const selectedMonthRevenue = payments
        .filter(p => p.billingMonth === selectedBillingMonth && p.status === 'PAID')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const inputStyle = "w-full px-4 py-2.5 bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-xl text-sm font-medium text-[#2A3642] dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#2A3642] dark:focus:border-slate-300 focus:ring-4 focus:ring-[#465769]/15 transition-all";
    const labelStyle = "block text-[11px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-1.5";

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-300"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#465769] dark:text-slate-400">Loading Super Admin Panel...</p>
                </div>
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    // Selected Firm Drawer Data
    const drawerMembers = selectedFirm ? users.filter(u => u.firmId === selectedFirm.id) : [];
    const drawerCases = selectedFirm ? cases.filter(c => c.firmId === selectedFirm.id) : [];
    const drawerPayments = selectedFirm ? payments.filter(p => p.firmId === selectedFirm.id) : [];
    const drawerActiveCases = drawerCases.filter(c => (c.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const drawerCompletedCases = drawerCases.filter(c => ['FULLY COMPLETED', 'SETTLED', 'COMPLETED'].includes((c.status || '').toUpperCase())).length;

    return (
        <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">

            {/* ================= TOP COMMAND BAR ================= */}
            <div className="bg-[#465769] dark:bg-[#2A3642] rounded-2xl px-6 py-4 shadow-sm border border-slate-200/80 dark:border-[#465769]/40 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-sm">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                            Super Admin Control Panel
                        </h1>
                        <p className="text-xs text-slate-200/85 font-medium mt-1">
                            Approve chambers, filter unpaid monthly fees, reset passwords, process SMS requests & control access
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Global Billing Month Switcher */}
                    <div className="flex items-center gap-1.5 bg-white/95 dark:bg-[#182028] px-3 py-1.5 rounded-xl border border-white/20 dark:border-[#465769]/50">
                        <Calendar size={14} className="text-[#465769] dark:text-slate-300" />
                        <span className="text-[11px] font-extrabold uppercase text-[#465769] dark:text-slate-400 hidden sm:inline">
                            Billing:
                        </span>
                        <input
                            type="month"
                            value={selectedBillingMonth}
                            onChange={(e) => setSelectedBillingMonth(e.target.value)}
                            className="text-xs font-black text-[#2A3642] dark:text-white bg-transparent outline-none cursor-pointer"
                        />
                        <button
                            type="button"
                            onClick={() => setSelectedBillingMonth(currentMonthKey)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase transition cursor-pointer ${
                                selectedBillingMonth === currentMonthKey
                                    ? 'bg-[#2A3642] text-white dark:bg-[#465769]'
                                    : 'bg-slate-100 text-[#465769] hover:bg-slate-200 dark:bg-[#2A3642] dark:text-slate-300'
                            }`}
                        >
                            This Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedBillingMonth(lastMonthKey)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase transition cursor-pointer ${
                                selectedBillingMonth === lastMonthKey
                                    ? 'bg-[#2A3642] text-white dark:bg-[#465769]'
                                    : 'bg-slate-100 text-[#465769] hover:bg-slate-200 dark:bg-[#2A3642] dark:text-slate-300'
                            }`}
                        >
                            Last Month
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer disabled:opacity-50"
                        title="Refresh live data"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ================= ACTIONABLE TASK KPI CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <button
                    type="button"
                    onClick={() => {
                        setFirmTab('PENDING');
                        scrollToSection(pendingFirms.length > 0 ? 'pending-approvals-section' : 'firms-directory-section');
                    }}
                    className={`p-5 rounded-2xl border text-left transition cursor-pointer group ${
                        firmTab === 'PENDING'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/20'
                            : 'bg-white dark:bg-[#2A3642] border-slate-200/80 dark:border-[#465769]/40 hover:border-amber-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                            New Firm Approvals
                        </span>
                        <Clock size={17} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                        <p className="text-3xl font-black text-[#2A3642] dark:text-white">{pendingFirms.length}</p>
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Review <ArrowDownRight size={13} />
                        </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#465769] dark:text-slate-400 mt-1">
                        {pendingFirms.length > 0 ? 'Awaiting your activation' : 'No pending registrations'}
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setSmsStatusFilter('PENDING');
                        scrollToSection('sms-requests-section');
                    }}
                    className={`p-5 rounded-2xl border text-left transition cursor-pointer group ${
                        smsStatusFilter === 'PENDING' && pendingSmsCount > 0
                            ? 'bg-white dark:bg-[#2A3642] border-blue-400/80 dark:border-blue-500/50 hover:border-blue-500'
                            : 'bg-white dark:bg-[#2A3642] border-slate-200/80 dark:border-[#465769]/40 hover:border-[#465769]'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                            New SMS Quota Requests
                        </span>
                        <MessageSquare size={17} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{pendingSmsCount}</p>
                        <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Process <ArrowDownRight size={13} />
                        </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#465769] dark:text-slate-400 mt-1">
                        {approvedSmsCount} approved • {smsRequests.length} total
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setFirmTab('UNPAID');
                        scrollToSection('firms-directory-section');
                    }}
                    className={`p-5 rounded-2xl border text-left transition cursor-pointer group ${
                        firmTab === 'UNPAID'
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-400/20'
                            : 'bg-white dark:bg-[#2A3642] border-slate-200/80 dark:border-[#465769]/40 hover:border-rose-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                            Not Paid Yet ({selectedBillingMonth})
                        </span>
                        <AlertTriangle size={17} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                        <p className="text-3xl font-black text-rose-600 dark:text-rose-400">{unpaidFirmsForSelectedMonth.length}</p>
                        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 inline-flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            Filter Unpaid <ArrowDownRight size={13} />
                        </span>
                    </div>
                    <p className="text-[11px] font-semibold text-[#465769] dark:text-slate-400 mt-1">
                        Out of {billableFirms.length} approved chambers
                    </p>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setFirmTab('PAID');
                        scrollToSection('firms-directory-section');
                    }}
                    className={`p-5 rounded-2xl border text-left transition cursor-pointer group ${
                        firmTab === 'PAID'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/20'
                            : 'bg-white dark:bg-[#2A3642] border-slate-200/80 dark:border-[#465769]/40 hover:border-emerald-400'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                            Collected ({selectedBillingMonth})
                        </span>
                        <CreditCard size={17} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-baseline justify-between mt-2">
                        <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            Rs. {selectedMonthRevenue.toLocaleString()}
                        </p>
                    </div>
                    <p className="text-[11px] font-semibold text-[#465769] dark:text-slate-400 mt-1">
                        {paidFirmsForSelectedMonth.length} chamber{paidFirmsForSelectedMonth.length === 1 ? '' : 's'} settled
                    </p>
                </button>
            </div>

            {/* ================= PRIORITY QUEUE 1: NEW LAW FIRM APPROVALS ================= */}
            {pendingFirms.length > 0 && (
                <div id="pending-approvals-section" className="bg-amber-50/80 dark:bg-amber-950/25 rounded-3xl border border-amber-200 dark:border-amber-800/60 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-base sm:text-lg font-black text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
                            <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                            New Law Firm Registrations Awaiting Approval ({pendingFirms.length})
                        </h2>
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                            System access stays blocked until approved
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingFirms.map(firm => {
                            const owner = users.find(u => u.firmId === firm.id && u.role === 'LAWYER');
                            return (
                                <div key={firm.id} className="bg-white dark:bg-[#2A3642] p-5 rounded-2xl border border-amber-300/80 dark:border-amber-700/50 shadow-xs flex flex-col justify-between gap-4">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-extrabold text-base text-[#2A3642] dark:text-white">{firm.name || 'Unnamed Firm'}</h3>
                                            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                                Pending
                                            </span>
                                        </div>
                                        <p className="text-xs font-semibold text-[#465769] dark:text-slate-300 mt-1.5">
                                            Principal Lawyer: <strong className="text-[#2A3642] dark:text-white">{firm.ownerName || owner?.name || 'N/A'}</strong>
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{firm.email || owner?.email || 'No email'}</p>
                                        {firm.phone && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tel: {firm.phone}</p>}
                                        {firm.createdAt && (
                                            <p className="text-[11px] text-slate-400 mt-2">
                                                Registered: {new Date(firm.createdAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-[#465769]/30">
                                        <button
                                            onClick={() => handleApproveFirm(firm)}
                                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                                        >
                                            <CheckCircle size={15} /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleRejectFirm(firm)}
                                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                        >
                                            <XCircle size={15} /> Reject
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ================= PRIORITY QUEUE 2: SMS QUOTA REQUESTS WITH FILTERING ================= */}
            <div id="sms-requests-section" className="bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm overflow-hidden">
                <div className="px-6 sm:px-8 py-5 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center relative">
                            <Database size={19} />
                            {pendingSmsCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                                    {pendingSmsCount}
                                </span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold text-[#2A3642] dark:text-white leading-none">
                                SMS Quota Recharge Requests
                            </h2>
                            <p className="text-xs text-[#465769] dark:text-slate-400 font-medium mt-1">
                                Filter by status or search firm name to approve top-up packages
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex flex-wrap bg-white dark:bg-[#182028] p-1 rounded-xl border border-slate-200 dark:border-[#465769]/60 text-xs font-bold gap-1">
                            {([
                                { key: 'PENDING', label: `New / Pending (${pendingSmsCount})` },
                                { key: 'APPROVED', label: `Approved (${approvedSmsCount})` },
                                { key: 'REJECTED', label: `Rejected (${rejectedSmsCount})` },
                                { key: 'ALL', label: `All (${smsRequests.length})` },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setSmsStatusFilter(tab.key)}
                                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                                        smsStatusFilter === tab.key
                                            ? tab.key === 'PENDING'
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-[#2A3642] dark:bg-[#465769] text-white shadow-xs'
                                            : 'text-[#465769] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A3642]'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#465769] dark:text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search firm or quota..."
                                value={smsSearch}
                                onChange={e => setSmsSearch(e.target.value)}
                                className={`${inputStyle} pl-9 pr-8 py-2 text-xs`}
                            />
                            {smsSearch && (
                                <button
                                    type="button"
                                    onClick={() => setSmsSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2A3642] dark:hover:text-white cursor-pointer"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[780px]">
                        <thead>
                        <tr className="bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/90 dark:border-[#465769]/40 text-[11px] uppercase tracking-wider text-[#465769] dark:text-slate-300 font-black">
                            <th className="px-6 py-4">Firm Name</th>
                            <th className="px-6 py-4">Package Requested</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Requested Date</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#465769]/30">
                        {filteredSmsRequests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-slate-400 text-sm">
                                    No {smsStatusFilter !== 'ALL' ? smsStatusFilter.toLowerCase() : ''} SMS quota requests found.
                                </td>
                            </tr>
                        ) : filteredSmsRequests.map(req => {
                            const matchingFirm = firms.find(f => f.id === req.firmId);
                            return (
                                <tr key={req.id} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730]/60 transition">
                                    <td className="px-6 py-4">
                                        <p className="font-extrabold text-sm text-[#2A3642] dark:text-white">{req.firmName}</p>
                                        {matchingFirm && (
                                            <p className="text-[11px] text-[#465769] dark:text-slate-400">
                                                Current Balance: <strong>{matchingFirm.smsQuota || 0} SMS</strong>
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-black text-blue-600 dark:text-blue-400">
                                        +{Number(req.quota).toLocaleString()} SMS
                                        {req.packageName && (
                                            <span className="ml-2 text-[11px] font-semibold text-slate-400">({req.packageName})</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-[#2A3642] dark:text-slate-300">Rs. {Number(req.price).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono">{new Date(req.requestedAt).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                req.status === 'PENDING'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                    : req.status === 'APPROVED'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                            }`}>
                                                {req.status}
                                            </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {req.status === 'PENDING' ? (
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleApproveSms(req)}
                                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                                >
                                                    <CheckCircle size={14} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectSms(req.id)}
                                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ================= REGISTERED FIRMS DIRECTORY, UNPAID BILLING FILTER & ACCESS CONTROL ================= */}
            <div id="firms-directory-section" className="bg-white dark:bg-[#2A3642] rounded-3xl border border-slate-200/80 dark:border-[#465769]/40 shadow-sm overflow-hidden">
                <div
                    className="px-6 sm:px-8 py-5 bg-[#F8FAFC] dark:bg-[#222C36] border-b border-slate-200/80 dark:border-[#465769]/40 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center">
                                <Building2 size={19}/>
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-extrabold text-[#2A3642] dark:text-white leading-none">
                                    Registered Law Firms, Monthly Payments & Access Control
                                </h2>
                                <p className="text-xs text-[#465769] dark:text-slate-400 font-medium mt-1">
                                    Select a billing month, filter <strong className="text-rose-600 dark:text-rose-400">Not
                                    Paid Yet ({selectedBillingMonth})</strong> chambers, reset passwords, or suspend
                                    access
                                </p>
                            </div>
                        </div>

                        {/* Month Picker + Search Controls */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div
                                className="flex items-center gap-2 bg-white dark:bg-[#182028] border border-slate-300 dark:border-[#465769]/80 rounded-xl px-3 py-2">
                                <Calendar size={14} className="text-[#465769] dark:text-slate-400"/>
                                <span className="text-[11px] font-bold text-[#465769] dark:text-slate-400">Month:</span>
                                <input
                                    type="month"
                                    value={selectedBillingMonth}
                                    onChange={(e) => setSelectedBillingMonth(e.target.value)}
                                    className="text-xs font-black text-[#2A3642] dark:text-white bg-transparent outline-none cursor-pointer"
                                    title="Select relevant billing month"
                                />
                            </div>

                            <div className="relative min-w-[230px] flex-1 sm:flex-initial">
                                <Search size={15}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#465769] dark:text-slate-400"/>
                                <input
                                    type="text"
                                    placeholder="Search firm, lawyer, email, phone..."
                                    value={firmSearch}
                                    onChange={e => setFirmSearch(e.target.value)}
                                    className={`${inputStyle} pl-9 pr-8 py-2 text-xs`}
                                />
                                {firmSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setFirmSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#2A3642] dark:hover:text-white cursor-pointer"
                                    >
                                        <X size={14}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div
                        className="flex flex-wrap bg-white dark:bg-[#182028] p-1 rounded-xl border border-slate-200 dark:border-[#465769]/60 text-xs font-bold gap-1">
                        {([
                            {key: 'ALL', label: `All Firms (${firms.length})`},
                            {key: 'TRIAL', label: `14-Day Trial (${activeTrialFirms.length})`},
                            {key: 'TRIAL_EXPIRED', label: `Trial Expired (${expiredTrialFirms.length})`},
                            {
                                key: 'UNPAID',
                                label: `Not Paid Yet • ${selectedBillingMonth} (${unpaidFirmsForSelectedMonth.length})`
                            },
                            {
                                key: 'PAID',
                                label: `Paid • ${selectedBillingMonth} (${paidFirmsForSelectedMonth.length})`
                            },
                            {key: 'PENDING', label: `Pending Approval (${pendingFirms.length})`},
                            {key: 'ACTIVE', label: `Active (${activeFirms.length})`},
                            {key: 'SUSPENDED', label: `Access Denied (${suspendedFirms.length})`},
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setFirmTab(tab.key)}
                                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                                    firmTab === tab.key
                                        ? tab.key === 'UNPAID' || tab.key === 'TRIAL_EXPIRED'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : tab.key === 'TRIAL'
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : tab.key === 'PAID'
                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                    : 'bg-[#2A3642] dark:bg-[#465769] text-white shadow-xs'
                                        : tab.key === 'TRIAL' && activeTrialFirms.length > 0
                                            ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                                            : (tab.key === 'UNPAID' && unpaidFirmsForSelectedMonth.length > 0) ||
                                            (tab.key === 'TRIAL_EXPIRED' && expiredTrialFirms.length > 0)
                                                ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                                : 'text-[#465769] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#2A3642]'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredFirms.length === 0 ? (
                        <div
                            className="col-span-full text-center py-12 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-2xl border border-dashed border-slate-200 dark:border-[#465769]/40">
                            <p className="text-sm font-bold text-[#2A3642] dark:text-white">
                                {firmTab === 'UNPAID'
                                    ? `All approved law firms have paid for ${selectedBillingMonth}!`
                                    : 'No law firms match the selected filter'}
                            </p>
                            <p className="text-xs text-[#465769] dark:text-slate-400 mt-1">
                                Switch the billing month or reset filters to view other chambers.
                            </p>
                        </div>
                    ) : filteredFirms.map(firm => {
                        const firmUsers = users.filter(u => u.firmId === firm.id);
                        const firmCases = cases.filter(c => c.firmId === firm.id);
                        const activeCaseCount = firmCases.filter(c => (c.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
                        const paidRecord = getPaidRecordForMonth(firm.id, selectedBillingMonth);

                        const isPending = firm.approvalStatus === 'PENDING';
                        const isRejected = firm.approvalStatus === 'REJECTED';
                        const isAccessible = !isPending && !isRejected && firm.isActive !== false;

                        return (
                            <div
                                key={firm.id}
                                className={`rounded-2xl p-6 border flex flex-col justify-between gap-5 transition-all ${
                                    isPending
                                        ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-300/80 dark:border-amber-800/50'
                                        : isAccessible
                                            ? 'bg-[#F8FAFC] dark:bg-[#1E2730] border-slate-200 dark:border-[#465769]/50 hover:border-[#465769]'
                                            : 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/50'
                                }`}
                            >
                                <div>
                                    {/* Top Row: Name & Status Badge */}
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <h3 className="font-black text-lg text-[#2A3642] dark:text-white truncate">
                                                {firm.name || 'Unnamed Firm'}
                                            </h3>
                                            <p className="text-xs font-medium text-[#465769] dark:text-slate-400 truncate mt-0.5">
                                                {firm.ownerName ? `Adv. ${firm.ownerName}` : firm.email || 'No owner recorded'}
                                                {firm.phone ? ` • ${firm.phone}` : ''}
                                            </p>
                                        </div>

                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                            isPending
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                : isRejected
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                    : isAccessible
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        }`}>
                                            {isPending ? 'Pending Approval' : isRejected ? 'Rejected' : isAccessible ? 'Active' : 'Access Denied'}
                                        </span>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-2.5 mt-5">
                                        <div className="bg-white dark:bg-[#2A3642] p-3 rounded-xl border border-slate-200/80 dark:border-[#465769]/40 text-center">
                                            <p className="text-[10px] font-bold uppercase text-[#465769] dark:text-slate-400">Members</p>
                                            <p className="text-lg font-black text-[#2A3642] dark:text-white mt-0.5">{firmUsers.length}</p>
                                        </div>
                                        <div className="bg-white dark:bg-[#2A3642] p-3 rounded-xl border border-slate-200/80 dark:border-[#465769]/40 text-center">
                                            <p className="text-[10px] font-bold uppercase text-[#465769] dark:text-slate-400">Cases</p>
                                            <p className="text-lg font-black text-[#2A3642] dark:text-white mt-0.5">
                                                {firmCases.length}
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">({activeCaseCount})</span>
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-[#2A3642] p-3 rounded-xl border border-slate-200/80 dark:border-[#465769]/40 text-center">
                                            <p className="text-[10px] font-bold uppercase text-[#465769] dark:text-slate-400">SMS Left</p>
                                            <p className={`text-lg font-black mt-0.5 ${(firm.smsQuota || 0) <= 50 ? 'text-rose-600' : 'text-[#2A3642] dark:text-white'}`}>
                                                {firm.smsQuota || 0}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Monthly Payment Status + One-Click Record Button */}
                                    <div className={`mt-3.5 px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                                        !isPending && !isRejected && !paidRecord
                                            ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50'
                                            : 'bg-white dark:bg-[#2A3642] border-slate-200/80 dark:border-[#465769]/40'
                                    }`}>
                                        <span className="font-bold text-[#465769] dark:text-slate-300 flex items-center gap-1.5">
                                            <CreditCard size={13} /> {selectedBillingMonth}:
                                        </span>

                                        {isPending || isRejected ? (
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Not Billed</span>
                                        ) : paidRecord ? (
                                            <span className="font-black uppercase text-[10px] px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                Paid • Rs. {Number(paidRecord.amount).toLocaleString()}
                                            </span>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="font-black uppercase text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                    Not Paid Yet
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => openPaymentForFirm(firm)}
                                                    className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-[#2A3642] hover:bg-[#465769] text-white transition cursor-pointer"
                                                >
                                                    + Record Pay
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2 pt-2 border-t border-slate-200/70 dark:border-[#465769]/30">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <button
                                            onClick={() => { setSelectedFirm(firm); setDrawerTab('OVERVIEW'); }}
                                            className="py-2.5 px-3 bg-white dark:bg-[#2A3642] hover:bg-[#2A3642] hover:text-white dark:hover:bg-[#465769] text-[#2A3642] dark:text-slate-100 border border-slate-300 dark:border-[#465769] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        >
                                            <Eye size={14} /> Details & Members
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openResetPasswordModal(firm)}
                                            className="py-2.5 px-3 bg-white dark:bg-[#2A3642] hover:bg-amber-600 hover:text-white hover:border-amber-600 text-[#2A3642] dark:text-slate-100 border border-slate-300 dark:border-[#465769] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                                        >
                                            <KeyRound size={14} /> Reset Password
                                        </button>
                                    </div>

                                    {isPending ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApproveFirm(firm)}
                                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                                            >
                                                <CheckCircle size={15} /> Approve Firm
                                            </button>
                                            <button
                                                onClick={() => handleRejectFirm(firm)}
                                                className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                                            >
                                                <XCircle size={15} /> Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => toggleFirmStatus(firm)}
                                            className={`w-full py-2.5 flex justify-center items-center gap-2 rounded-xl font-bold text-xs text-white transition cursor-pointer shadow-xs ${
                                                isAccessible
                                                    ? 'bg-rose-600 hover:bg-rose-700'
                                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                            }`}
                                        >
                                            <Power size={15} />
                                            {isAccessible ? 'Deny System Access (Suspend)' : 'Grant System Access (Activate)'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ================= FIRM DETAILS, MEMBERS & MONTHLY PAYMENTS DRAWER ================= */}
            {selectedFirm && (
                <div className="fixed inset-0 z-[1000] flex justify-end bg-[#2A3642]/75 backdrop-blur-xs">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#2A3642] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-[#465769]">

                        {/* Drawer Header */}
                        <div className="px-6 py-5 bg-[#465769] dark:bg-[#222C36] text-white flex justify-between items-center gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h2 className="text-lg font-black truncate">{selectedFirm.name || 'Unnamed Firm'}</h2>
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${
                                        selectedFirm.approvalStatus === 'PENDING'
                                            ? 'bg-amber-400 text-slate-900'
                                            : selectedFirm.isActive !== false && selectedFirm.approvalStatus !== 'REJECTED'
                                                ? 'bg-emerald-400 text-slate-900'
                                                : 'bg-rose-500 text-white'
                                    }`}>
                                        {selectedFirm.approvalStatus === 'PENDING'
                                            ? 'Pending Approval'
                                            : selectedFirm.isActive !== false && selectedFirm.approvalStatus !== 'REJECTED'
                                                ? 'Active'
                                                : 'Access Denied'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-200/85 mt-1">
                                    Firm ID: <span className="font-mono">{selectedFirm.id}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => openResetPasswordModal(selectedFirm)}
                                    className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <KeyRound size={14} /> Reset Owner Password
                                </button>
                                <button
                                    onClick={() => setSelectedFirm(null)}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Sub-Navigation Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-[#465769]/50 bg-[#F8FAFC] dark:bg-[#1E2730]">
                            <button
                                onClick={() => setDrawerTab('OVERVIEW')}
                                className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                                    drawerTab === 'OVERVIEW'
                                        ? 'border-[#2A3642] dark:border-white text-[#2A3642] dark:text-white bg-white dark:bg-[#2A3642]'
                                        : 'border-transparent text-[#465769] dark:text-slate-400'
                                }`}
                            >
                                Overview & Cases ({drawerCases.length})
                            </button>
                            <button
                                onClick={() => setDrawerTab('MEMBERS')}
                                className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                                    drawerTab === 'MEMBERS'
                                        ? 'border-[#2A3642] dark:border-white text-[#2A3642] dark:text-white bg-white dark:bg-[#2A3642]'
                                        : 'border-transparent text-[#465769] dark:text-slate-400'
                                }`}
                            >
                                Members ({drawerMembers.length})
                            </button>
                            <button
                                onClick={() => setDrawerTab('PAYMENTS')}
                                className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                                    drawerTab === 'PAYMENTS'
                                        ? 'border-[#2A3642] dark:border-white text-[#2A3642] dark:text-white bg-white dark:bg-[#2A3642]'
                                        : 'border-transparent text-[#465769] dark:text-slate-400'
                                }`}
                            >
                                Monthly Payments ({drawerPayments.length})
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* TAB 1: OVERVIEW & CASE STATS */}
                            {drawerTab === 'OVERVIEW' && (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50">
                                            <p className="text-[10px] font-black uppercase text-[#465769] dark:text-slate-400">Total Cases</p>
                                            <p className="text-2xl font-black text-[#2A3642] dark:text-white mt-1">{drawerCases.length}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                                            <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">Running (Active)</p>
                                            <p className="text-2xl font-black text-blue-800 dark:text-blue-200 mt-1">{drawerActiveCases}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                                            <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">Completed</p>
                                            <p className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">{drawerCompletedCases}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50">
                                            <p className="text-[10px] font-black uppercase text-[#465769] dark:text-slate-400">SMS Balance</p>
                                            <p className="text-2xl font-black text-[#2A3642] dark:text-white mt-1">{selectedFirm.smsQuota || 0}</p>
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                                                Chamber Details
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => openResetPasswordModal(selectedFirm)}
                                                className="text-xs font-extrabold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                            >
                                                <KeyRound size={13} /> Reset Principal Lawyer Password
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <span className="text-slate-400 block">Principal Lawyer</span>
                                                <strong className="text-[#2A3642] dark:text-white text-sm">{selectedFirm.ownerName || '—'}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Registered Email</span>
                                                <strong className="text-[#2A3642] dark:text-white text-sm">{selectedFirm.email || '—'}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Contact Phone</span>
                                                <strong className="text-[#2A3642] dark:text-white text-sm">{selectedFirm.phone || '—'}</strong>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Registered Date</span>
                                                <strong className="text-[#2A3642] dark:text-white text-sm">
                                                    {selectedFirm.createdAt ? new Date(selectedFirm.createdAt).toLocaleDateString() : '—'}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-3 flex items-center gap-2">
                                            <Briefcase size={14} /> Cases in This Firm ({drawerCases.length})
                                        </h3>
                                        {drawerCases.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-4">No cases created by this firm yet.</p>
                                        ) : (
                                            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                                                {drawerCases.slice(0, 15).map(c => (
                                                    <div key={c.id} className="p-3.5 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200/80 dark:border-[#465769]/40 flex justify-between items-center gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-extrabold text-[#2A3642] dark:text-white truncate">{c.title}</p>
                                                            <p className="text-[11px] text-[#465769] dark:text-slate-400 truncate">Client: {c.clientName || 'N/A'}</p>
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-white dark:bg-[#2A3642] border border-slate-200 dark:border-[#465769]/50 text-[#2A3642] dark:text-slate-200 shrink-0">
                                                            {c.status || 'ACTIVE'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* TAB 2: MEMBERS LIST WITH INDIVIDUAL PASSWORD RESET */}
                            {drawerTab === 'MEMBERS' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-[#465769] dark:text-slate-300 font-medium">
                                        All members below inherit this firm&apos;s access status ({selectedFirm.isActive !== false && selectedFirm.approvalStatus !== 'PENDING' && selectedFirm.approvalStatus !== 'REJECTED' ? 'Allowed' : 'Blocked'}). You can reset any member&apos;s password individually.
                                    </p>
                                    {drawerMembers.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-6 text-center">No members found.</p>
                                    ) : drawerMembers.map(member => (
                                        <div key={member.id} className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 space-y-2.5">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div>
                                                    <p className="text-sm font-extrabold text-[#2A3642] dark:text-white">{member.name}</p>
                                                    <p className="text-xs text-[#465769] dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                        <Mail size={12} /> {member.email}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                                                        member.role === 'LAWYER'
                                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                                            : 'bg-white dark:bg-[#2A3642] text-[#2A3642] dark:text-slate-200 border border-slate-200 dark:border-[#465769]/50'
                                                    }`}>
                                                        {(member.role || 'STAFF').replace('_', ' ')}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => openResetPasswordModal(selectedFirm, member)}
                                                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#2A3642] hover:bg-amber-600 hover:text-white text-[#2A3642] dark:text-slate-200 border border-slate-300 dark:border-[#465769] text-[11px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                                                    >
                                                        <KeyRound size={12} /> Reset Password
                                                    </button>
                                                </div>
                                            </div>

                                            {member.role !== 'LAWYER' && (
                                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70 dark:border-[#465769]/30">
                                                    {member.permissions && member.permissions.length > 0 ? member.permissions.map((p: string) => (
                                                        <span key={p} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-[#2A3642] text-[#465769] dark:text-slate-300 border border-slate-200 dark:border-[#465769]/40">
                                                            {p}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[11px] text-slate-400 italic">No permissions assigned</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* TAB 3: MONTHLY PAYMENTS */}
                            {drawerTab === 'PAYMENTS' && (
                                <div className="space-y-6">
                                    <form onSubmit={handleAddPayment} className="p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 space-y-4">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-[#2A3642] dark:text-white flex items-center gap-2">
                                            <Plus size={15} /> Record Monthly Subscription Payment
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label className={labelStyle}>Billing Month *</label>
                                                <input
                                                    type="month"
                                                    value={payMonth}
                                                    onChange={e => setPayMonth(e.target.value)}
                                                    className={inputStyle}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Amount (Rs.) *</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={payAmount}
                                                    onChange={e => setPayAmount(e.target.value)}
                                                    className={inputStyle}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            <div>
                                                <label className={labelStyle}>Payment Method</label>
                                                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={`${inputStyle} cursor-pointer`}>
                                                    <option value="Bank Transfer">Bank Transfer</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Online / Card">Online / Card</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Reference / Slip No</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. TXN-98412"
                                                    value={payRef}
                                                    onChange={e => setPayRef(e.target.value)}
                                                    className={inputStyle}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={savingPayment}
                                            className="w-full py-3 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-sm"
                                        >
                                            {savingPayment ? 'Saving Payment...' : 'Save Monthly Payment'}
                                        </button>
                                    </form>

                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                                            Payment History ({drawerPayments.length})
                                        </h3>

                                        {drawerPayments.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-6 text-center bg-[#F8FAFC] dark:bg-[#1E2730] rounded-2xl border border-dashed border-slate-200 dark:border-[#465769]/40">
                                                No monthly payments recorded for this firm yet.
                                            </p>
                                        ) : drawerPayments.map(p => (
                                            <div key={p.id} className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-[#2A3642] dark:text-white">
                                                            {p.billingMonth}
                                                        </span>
                                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                                                            Rs. {Number(p.amount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[#465769] dark:text-slate-400 mt-1">
                                                        {p.method} {p.reference ? `• Ref: ${p.reference}` : ''} • Recorded {new Date(p.paidAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                        {p.status}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeletePayment(p)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                                        title="Delete payment entry"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ================= PASSWORD RESET MODAL ================= */}
            {resetModal.isOpen && (
                <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#465769] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-[#465769] dark:bg-[#222C36] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <KeyRound size={18} />
                                <div>
                                    <h3 className="text-sm font-black">Reset Account Password</h3>
                                    <p className="text-[11px] text-slate-200/85 truncate max-w-[270px]">
                                        {resetModal.firmName}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setResetModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleExecutePasswordReset} className="p-6 space-y-5">
                            {/* Target Account Summary */}
                            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 text-xs">
                                <p className="font-extrabold text-[#2A3642] dark:text-white text-sm">{resetModal.targetName}</p>
                                <p className="text-[#465769] dark:text-slate-300 mt-0.5 flex items-center gap-1.5">
                                    <Mail size={12} /> {resetModal.targetEmail || 'No email recorded'}
                                </p>
                            </div>

                            {/* Mode Switcher */}
                            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#182028] border border-slate-200 dark:border-[#465769]/50 text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setResetModal(prev => ({ ...prev, mode: 'EMAIL_LINK' }))}
                                    className={`py-2 px-3 rounded-lg transition cursor-pointer ${
                                        resetModal.mode === 'EMAIL_LINK'
                                            ? 'bg-[#2A3642] dark:bg-[#465769] text-white shadow-xs'
                                            : 'text-[#465769] dark:text-slate-300'
                                    }`}
                                >
                                    Send Email Link
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setResetModal(prev => ({ ...prev, mode: 'TEMP_PASSWORD' }))}
                                    className={`py-2 px-3 rounded-lg transition cursor-pointer ${
                                        resetModal.mode === 'TEMP_PASSWORD'
                                            ? 'bg-[#2A3642] dark:bg-[#465769] text-white shadow-xs'
                                            : 'text-[#465769] dark:text-slate-300'
                                    }`}
                                >
                                    Set Temp Password
                                </button>
                            </div>

                            {resetModal.mode === 'EMAIL_LINK' ? (
                                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                                    Firebase will send a secure password reset link directly to <strong>{resetModal.targetEmail}</strong> so the user can choose a new password themselves.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#465769] dark:text-slate-300">
                                                New Temporary Password *
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setResetModal(prev => ({ ...prev, tempPassword: generateTempPassword() }))}
                                                className="text-[11px] font-bold text-[#2A3642] dark:text-slate-200 hover:underline cursor-pointer"
                                            >
                                                Regenerate
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={resetModal.tempPassword}
                                                onChange={(e) => setResetModal(prev => ({ ...prev, tempPassword: e.target.value }))}
                                                minLength={8}
                                                required
                                                className={`${inputStyle} font-mono`}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopyTempPassword}
                                                className="px-3.5 rounded-xl bg-slate-100 dark:bg-[#1E2730] border border-slate-300 dark:border-[#465769] text-[#2A3642] dark:text-white hover:bg-slate-200 transition cursor-pointer shrink-0"
                                                title="Copy password"
                                            >
                                                {resetModal.copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                                            </button>
                                        </div>
                                        <p className="text-[11px] text-[#465769] dark:text-slate-400 mt-1.5">
                                            User will be forced to change this password on their next login.
                                        </p>
                                    </div>

                                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 cursor-pointer text-xs font-semibold text-[#2A3642] dark:text-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={resetModal.resetPin}
                                            onChange={(e) => setResetModal(prev => ({ ...prev, resetPin: e.target.checked }))}
                                            className="rounded accent-[#2A3642]"
                                        />
                                        Also reset their 6-digit security PIN
                                    </label>
                                </div>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setResetModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 font-bold text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetModal.submitting}
                                    className="flex-1 py-3 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                                >
                                    {resetModal.mode === 'EMAIL_LINK' ? (
                                        <>
                                            <Send size={14} /> {resetModal.submitting ? 'Sending...' : 'Send Reset Link'}
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound size={14} /> {resetModal.submitting ? 'Updating...' : 'Apply Temp Password'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================= CUSTOM CONFIRM MODAL ================= */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#465769] text-center">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                            confirmModal.danger ? 'bg-rose-500/15 text-rose-600' : 'bg-[#465769]/15 text-[#2A3642] dark:text-white'
                        }`}>
                            {confirmModal.danger ? <Ban size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <h3 className="text-lg font-black text-[#2A3642] dark:text-white mb-1.5">{confirmModal.title}</h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-6 font-medium">{confirmModal.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 font-bold text-xs sm:text-sm cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModal.onConfirm}
                                className={`flex-1 py-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer ${
                                    confirmModal.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769]'
                                }`}
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
                                ? 'bg-rose-500/15 text-rose-600'
                                : alertModal.type === 'success'
                                    ? 'bg-emerald-500/15 text-emerald-600'
                                    : 'bg-[#465769]/15 text-[#2A3642] dark:text-white'
                        }`}>
                            {alertModal.type === 'error' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                        </div>
                        <h3 className="text-lg font-black text-[#2A3642] dark:text-white mb-1.5">{alertModal.title}</h3>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 mb-6 font-medium">{alertModal.message}</p>
                        <button
                            onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                            className="w-full py-3 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer"
                        >
                            OK, Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}