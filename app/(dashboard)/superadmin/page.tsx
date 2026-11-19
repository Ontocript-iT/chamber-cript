'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, getDocs, updateDoc, doc, setDoc, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle, XCircle, Power, Users, Database } from 'lucide-react';

export default function SuperAdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const [firms, setFirms] = useState<any[]>([]);
    const [smsRequests, setSmsRequests] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (!u) return router.push('/login');
            try {
                const uDocSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', u.uid)));
                if (uDocSnap.docs[0]?.data().role !== 'SUPER_ADMIN') {
                    alert("Access Denied.");
                    return router.push('/dashboard');
                }
                setIsSuperAdmin(true);

                // Fetch All Firms
                const firmSnap = await getDocs(collection(db, 'firms'));
                setFirms(firmSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // Fetch All SMS Requests
                const reqSnap = await getDocs(collection(db, 'sms_requests'));
                const reqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                reqs.sort((a: any, b: any) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
                setSmsRequests(reqs);

                // Fetch All Users
                const userSnap = await getDocs(collection(db, 'users'));
                setUsers(userSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            } catch (err) { console.error(err); } finally { setLoading(false); }
        });
        return () => unsubscribe();
    }, [router]);

    // --- Actions ---
    const handleApproveSms = async (req: any) => {
        if (!confirm(`Approve ${req.quota} SMS for ${req.firmName}?`)) return;
        try {
            await updateDoc(doc(db, 'sms_requests', req.id), { status: 'APPROVED', approvedAt: new Date().toISOString() });

            const firm = firms.find(f => f.id === req.firmId);
            const newQuota = (firm?.smsQuota || 0) + req.quota;

            // Safely set or update the firm's data
            await setDoc(doc(db, 'firms', req.firmId), {
                smsQuota: newQuota,
                name: req.firmName,
                isActive: true
            }, { merge: true });

            alert("Approved Successfully!");
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Failed to approve. Please try again.");
        }
    };

    const handleRejectSms = async (reqId: string) => {
        if (!confirm("Reject this SMS request?")) return;
        try {
            await updateDoc(doc(db, 'sms_requests', reqId), { status: 'REJECTED' });
            alert("Rejected.");
            window.location.reload();
        } catch (err) { alert("Failed to reject."); }
    };

    const toggleFirmStatus = async (firmId: string, currentStatus: boolean) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'SUSPEND' : 'ACTIVATE'} this firm?`)) return;
        try {
            await setDoc(doc(db, 'firms', firmId), { isActive: !currentStatus }, { merge: true });
            setFirms(firms.map(f => f.id === firmId ? { ...f, isActive: !currentStatus } : f));
        } catch (err) { alert("Status update failed."); }
    };

    if (loading) return <div className="p-10 text-center">Loading Admin Portal...</div>;
    if (!isSuperAdmin) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-purple-700 dark:text-purple-400">
                <ShieldAlert size={32}/> Super Admin Control Panel
            </h1>

            {/* SMS Requests Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><Database/> Pending SMS Requests</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-500 uppercase border-b border-gray-200 dark:border-gray-800">
                            <th className="p-3">Firm Name</th>
                            <th className="p-3">Package Requested</th>
                            <th className="p-3">Price</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {smsRequests.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-400">No requests found.</td></tr> : null}
                        {smsRequests.map(req => (
                            <tr key={req.id}>
                                <td className="p-3 font-bold text-gray-900 dark:text-gray-100">{req.firmName}</td>
                                <td className="p-3 text-blue-600 font-bold">+{req.quota} SMS</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">Rs. {req.price}</td>
                                <td className="p-3 text-xs text-gray-500">{new Date(req.requestedAt).toLocaleString()}</td>
                                <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {req.status}
                                        </span>
                                </td>
                                <td className="p-3 text-center">
                                    {req.status === 'PENDING' && (
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleApproveSms(req)} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded transition"><CheckCircle size={18}/></button>
                                            <button onClick={() => handleRejectSms(req.id)} className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded transition"><XCircle size={18}/></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registered Firms Management Section */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><Users/> Registered Law Firms (Access Control)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {firms.map(firm => {
                        const staffCount = users.filter(u => u.firmId === firm.id).length;
                        return (
                            <div key={firm.id} className={`p-5 rounded-xl border ${firm.isActive !== false ? 'border-green-200 bg-green-50/30 dark:bg-green-900/10' : 'border-red-300 bg-red-50 dark:bg-red-900/10'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{firm.name || 'Unnamed Firm'}</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${firm.isActive !== false ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {firm.isActive !== false ? 'Active' : 'Suspended'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Staff Members: <strong className="text-gray-900 dark:text-white">{staffCount}</strong></p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Current SMS Quota: <strong className={firm.smsQuota <= 50 ? 'text-red-600' : 'text-blue-600'}>{firm.smsQuota || 0}</strong></p>

                                <button
                                    onClick={() => toggleFirmStatus(firm.id, firm.isActive !== false)}
                                    className={`w-full py-2 flex justify-center items-center gap-2 rounded-lg font-bold text-sm text-white transition ${firm.isActive !== false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                    <Power size={16}/> {firm.isActive !== false ? 'Suspend System Access' : 'Reactivate Firm'}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

        </div>
    );
}