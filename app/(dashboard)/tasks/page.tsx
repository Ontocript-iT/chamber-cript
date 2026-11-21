'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import {
    CheckCircle, Plus, Search, User, Clock, AlertTriangle,
    Trash2, X, ChevronDown
} from 'lucide-react';
import { logActivity } from '@/lib/logger';

type Task = {
    id: string; firmId: string; assigneeId: string; assigneeName: string;
    assignerId: string; assignerName: string; caseId: string; caseTitle: string;
    note: string; progressNote?: string; progressUpdatedBy?: string; progressUpdatedAt?: string;
    priority: 'Normal' | 'Urgent'; status: 'Pending' | 'In Progress' | 'Completed';
    dueDate: string; createdAt: string;
};

type Member = { id: string; name: string; role: string };
type CaseMin = { id: string; title: string; caseNumber: string };

export default function TaskManagementPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [activeUser, setActiveUser] = useState<any>(null);
    const [hasWritePerm, setHasWritePerm] = useState(false);

    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
    const [editingNoteTaskId, setEditingNoteTaskId] = useState<string | null>(null);
    const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

    const [members, setMembers] = useState<Member[]>([]);
    const [cases, setCases] = useState<CaseMin[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);

    // UI States
    const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
    const [taskFilter, setTaskFilter] = useState<'ALL' | 'Pending' | 'In Progress' | 'Completed' | 'Urgent'>('ALL');

    // Delegate Task Modal
    const [showDelegateModal, setShowDelegateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ assigneeId: '', caseId: '', caseTitle: '', note: '', priority: 'Normal', dueDate: '' });

    // Custom Case Search Dropdown State
    const [caseSearch, setCaseSearch] = useState('');
    const [showCaseDropdown, setShowCaseDropdown] = useState(false);

    useEffect(() => {
        const fetchData = async (userUid: string) => {
            try {
                const uSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', userUid)));
                const uData = uSnap.docs[0]?.data();
                if (!uData) return;

                const firmId = uData.firmId;
                setActiveUser({ uid: userUid, name: uData.name, firmId, role: uData.role });

                const canWrite = uData.role === 'LAWYER' || uData.permissions?.includes('tasks.write');
                const canRead = uData.role === 'LAWYER' || uData.permissions?.includes('tasks.read') || canWrite;
                setHasWritePerm(canWrite);

                if (!canRead) {
                    alert("You don't have permission to view tasks.");
                    router.push('/dashboard'); return;
                }

                // Fetch Members
                const memSnap = await getDocs(query(collection(db, 'users'), where('firmId', '==', firmId)));
                setMembers(memSnap.docs.map(d => ({ id: d.id, name: d.data().name, role: d.data().role })));

                // Fetch Cases (for dropdown)
                const caseSnap = await getDocs(query(collection(db, 'cases'), where('firmId', '==', firmId)));
                setCases(caseSnap.docs.map(d => ({ id: d.id, title: d.data().title, caseNumber: d.data().caseNumber })));

                // Fetch All Tasks for firm
                const taskSnap = await getDocs(query(collection(db, 'tasks'), where('firmId', '==', firmId)));
                const fetchedTasks = taskSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
                fetchedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setTasks(fetchedTasks);

            } catch (err) { console.error(err); } finally { setLoading(false); }
        };

        const unsub = onAuthStateChanged(auth, user => {
            if (user) fetchData(user.uid); else router.push('/login');
        });
        return () => unsub();
    }, [router]);


    const handleSaveTaskNote = async (task: Task) => {
        const canEditNote = activeUser?.role === 'LAWYER' || task.assigneeId === activeUser?.uid;
        if (!canEditNote) return alert("Permission denied.");

        const updatedNote = (noteDrafts[task.id] ?? task.progressNote ?? '').trim();
        setSavingNoteId(task.id);
        try {
            const meta = {
                progressNote: updatedNote,
                progressUpdatedBy: activeUser.name,
                progressUpdatedAt: new Date().toISOString(),
            };
            await updateDoc(doc(db, 'tasks', task.id), meta);
            setTasks(tasks.map(t => (t.id === task.id ? { ...t, ...meta } : t)));
            setEditingNoteTaskId(null);
        } catch (err) {
            alert("Failed to save note.");
        } finally {
            setSavingNoteId(null);
        }
    };

    const handleDelegate = async () => {
        if (!form.assigneeId || !form.note) return alert("Assignee and Note are required.");
        setIsSubmitting(true);
        try {
            const assigneeName = members.find(m => m.id === form.assigneeId)?.name || 'Unknown';
            const newTask = {
                firmId: activeUser.firmId,
                assignerId: activeUser.uid,
                assignerName: activeUser.name,
                assigneeId: form.assigneeId,
                assigneeName,
                caseId: form.caseId,
                caseTitle: form.caseTitle,
                note: form.note,
                priority: form.priority as 'Normal' | 'Urgent',
                dueDate: form.dueDate,
                status: 'Pending' as const,
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(collection(db, 'tasks'), newTask);
            await logActivity(activeUser.firmId, activeUser.uid, activeUser.name, 'TASK_ASSIGNED', `Assigned task to ${assigneeName}: "${form.note}"`, form.caseId, form.caseTitle);
            setTasks([{ id: docRef.id, ...newTask } as Task, ...tasks]);

            setShowDelegateModal(false);
            setForm({ assigneeId: '', caseId: '', caseTitle: '', note: '', priority: 'Normal', dueDate: '' });
            setCaseSearch('');
            alert("Task Delegated Successfully!");
        } catch (err) { alert("Failed to delegate task."); }
        setIsSubmitting(false);
    };

    // --- Task Actions ---
    const updateTaskStatus = async (id: string, newStatus: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const canUpdate = activeUser?.role === 'LAWYER' || task.assigneeId === activeUser?.uid || task.assignerId === activeUser?.uid;
        if (!canUpdate) return alert("Permission denied. You can only update tasks assigned to you.");

        try {
            await updateDoc(doc(db, 'tasks', id), { status: newStatus });
            setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
        } catch (err) { alert("Update failed."); }
    };

    const deleteTask = async (id: string) => {
        if (!hasWritePerm) return alert("Permission denied.");
        if (!confirm("Delete this task?")) return;
        try {
            await deleteDoc(doc(db, 'tasks', id));
            setTasks(tasks.filter(t => t.id !== id));
        } catch (err) { alert("Delete failed."); }
    };

    // --- Filters ---
    const displayTasks = tasks.filter(t => {
        const matchMember = selectedMemberId === 'ALL' || t.assigneeId === selectedMemberId;
        const matchStatus =
            taskFilter === 'ALL' ? true :
                taskFilter === 'Urgent' ? t.priority === 'Urgent' && t.status !== 'Completed' :
                    t.status === taskFilter;
        return matchMember && matchStatus;
    });

    if (loading) {
        return (
            <div className="flex h-[85vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-11 w-11 border-b-2 border-[#465769] dark:border-slate-300"></div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#465769] dark:text-slate-400">Loading Tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#2A3642] p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#2A3642] dark:bg-[#465769] text-white flex items-center justify-center shadow-sm">
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[#2A3642] dark:text-white tracking-tight">Task Management</h1>
                        <p className="text-xs sm:text-sm text-[#465769] dark:text-slate-300 font-medium mt-0.5">Delegate, track, and manage team tasks seamlessly.</p>
                    </div>
                </div>

                {hasWritePerm && (
                    <button onClick={() => setShowDelegateModal(true)} className="flex items-center gap-2 bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] dark:hover:bg-[#56697e] text-white px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer">
                        <Plus size={18} /> Delegate Task
                    </button>
                )}
            </div>

            {/* MEMBER OVERVIEW ROW */}
            <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
                <button
                    onClick={() => setSelectedMemberId('ALL')}
                    className={`flex-shrink-0 p-5 rounded-3xl border min-w-[170px] text-left transition cursor-pointer ${
                        selectedMemberId === 'ALL'
                            ? 'bg-[#2A3642] dark:bg-[#465769] border-[#2A3642] dark:border-slate-300 text-white shadow-md'
                            : 'bg-white dark:bg-[#2A3642] border-slate-200/80 dark:border-[#465769]/40 text-[#2A3642] dark:text-slate-200 hover:border-[#465769]'
                    }`}
                >
                    <p className="font-bold text-xs uppercase tracking-wider opacity-80 mb-2">All Team</p>
                    <p className="text-3xl font-black">{tasks.filter(t => t.status !== 'Completed').length}</p>
                    <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Pending Total</p>
                </button>

                {members.map(m => {
                    const mTasks = tasks.filter(t => t.assigneeId === m.id && t.status !== 'Completed');
                    const urgent = mTasks.filter(t => t.priority === 'Urgent').length;
                    const isSelected = selectedMemberId === m.id;

                    return (
                        <button
                            key={m.id} onClick={() => setSelectedMemberId(m.id)}
                            className={`flex-shrink-0 p-5 rounded-3xl border min-w-[190px] text-left transition cursor-pointer ${
                                isSelected
                                    ? 'bg-[#465769]/15 dark:bg-[#465769]/40 border-[#465769] text-[#2A3642] dark:text-white shadow-sm'
                                    : 'bg-white dark:bg-[#2A3642] border-slate-200/80 dark:border-[#465769]/40 hover:border-[#465769]'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <p className="font-extrabold text-sm truncate text-[#2A3642] dark:text-white">{m.name.split(' ')[0]}</p>
                                {urgent > 0 && (
                                    <span className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <AlertTriangle size={10}/> {urgent}
                                    </span>
                                )}
                            </div>
                            <p className="text-3xl font-black text-[#2A3642] dark:text-white">{mTasks.length}</p>
                            <p className="text-[10px] text-[#465769] dark:text-slate-300 uppercase tracking-wider font-bold mt-1">{m.role.replace('_', ' ')}</p>
                        </button>
                    )
                })}
            </div>

            {/* TASK LIST AREA */}
            <div className="bg-white dark:bg-[#2A3642] rounded-3xl shadow-sm border border-slate-200/80 dark:border-[#465769]/40 flex flex-col min-h-[500px] overflow-hidden">

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5 p-5 border-b border-slate-200/80 dark:border-[#465769]/40 bg-[#F8FAFC] dark:bg-[#222C36]">
                    {['ALL', 'Pending', 'In Progress', 'Completed', 'Urgent'].map(f => (
                        <button
                            key={f} onClick={() => setTaskFilter(f as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                taskFilter === f
                                    ? 'bg-[#2A3642] text-white dark:bg-[#465769] shadow-sm'
                                    : 'bg-white dark:bg-[#1E2730] text-[#465769] dark:text-slate-300 border border-slate-200 dark:border-[#465769]/40 hover:bg-slate-100 dark:hover:bg-[#354453]'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* List */}
                <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displayTasks.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-slate-400">
                            <CheckCircle size={48} className="mx-auto mb-3 opacity-30"/>
                            <p className="text-base font-bold text-[#2A3642] dark:text-slate-300">No tasks found for this view.</p>
                            <p className="text-xs text-slate-400 mt-1">Try selecting another member or task status filter.</p>
                        </div>
                    ) : displayTasks.map(task => {

                        const canUpdateStatus = activeUser?.role === 'LAWYER' || task.assigneeId === activeUser?.uid || task.assignerId === activeUser?.uid;
                        const canAccessTaskNote = activeUser?.role === 'LAWYER' || task.assigneeId === activeUser?.uid;
                        const isEditingThisNote = editingNoteTaskId === task.id;

                        return (
                            <div key={task.id} className="p-5 sm:p-6 border border-slate-200/90 dark:border-[#465769]/40 rounded-3xl bg-[#F8FAFC] dark:bg-[#1E2730] shadow-2xs hover:border-[#465769] transition-all flex flex-col relative overflow-hidden group">

                                {task.priority === 'Urgent' && task.status !== 'Completed' && <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500"></div>}
                                {task.status === 'Completed' && <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>}

                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-2 flex-wrap">
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                            task.status === 'Completed'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : task.status === 'In Progress'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                    : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                        }`}>
                                            {task.status}
                                        </span>
                                        {task.priority === 'Urgent' && (
                                            <span className="text-[10px] font-black px-2.5 py-1 rounded-md uppercase bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                                Urgent
                                            </span>
                                        )}
                                    </div>
                                    {hasWritePerm && (
                                        <button onClick={() => deleteTask(task.id)} className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition cursor-pointer" title="Delete Task">
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>

                                <div className="mb-4">
                                    {task.caseTitle && (
                                        <span className="text-[11px] font-extrabold text-[#2A3642] dark:text-slate-200 bg-white dark:bg-[#2A3642] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#465769]/40 mb-2.5 inline-block truncate max-w-full shadow-2xs">
                                            📁 {task.caseTitle}
                                        </span>
                                    )}
                                    <p className={`text-sm sm:text-base text-[#2A3642] dark:text-slate-100 whitespace-pre-wrap ${task.status === 'Completed' ? 'line-through opacity-70' : 'font-medium'}`}>
                                        {task.note}
                                    </p>
                                    {/* Private Task Note (Visible & Editable ONLY by Assignee and Admin Lawyer) */}
                                    {canAccessTaskNote && (
                                        <div className="mb-4 p-3 rounded-2xl bg-white dark:bg-[#2A3642] border border-slate-200/90 dark:border-[#465769]/50 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#465769] dark:text-slate-300">
                Work Note
            </span>
                                                {!isEditingThisNote && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNoteDrafts(prev => ({ ...prev, [task.id]: task.progressNote || '' }));
                                                            setEditingNoteTaskId(task.id);
                                                        }}
                                                        className="text-[11px] font-extrabold text-[#2A3642] dark:text-slate-200 hover:underline cursor-pointer"
                                                    >
                                                        {task.progressNote ? 'Edit Note' : '+ Add Note'}
                                                    </button>
                                                )}
                                            </div>

                                            {isEditingThisNote ? (
                                                <div className="space-y-2">
                <textarea
                    rows={2}
                    value={noteDrafts[task.id] ?? ''}
                    onChange={e => setNoteDrafts(prev => ({ ...prev, [task.id]: e.target.value }))}
                    placeholder="Add progress update or remarks..."
                    className="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 rounded-xl text-xs font-medium text-[#2A3642] dark:text-white outline-none resize-none"
                />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingNoteTaskId(null)}
                                                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1E2730] text-[#465769] dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={savingNoteId === task.id}
                                                            onClick={() => handleSaveTaskNote(task)}
                                                            className="px-3.5 py-1.5 rounded-lg bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                                        >
                                                            {savingNoteId === task.id ? 'Saving...' : 'Save Note'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : task.progressNote ? (
                                                <div>
                                                    <p className="text-xs text-[#2A3642] dark:text-slate-200 whitespace-pre-wrap">
                                                        {task.progressNote}
                                                    </p>
                                                    {task.progressUpdatedBy && (
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            Updated by {task.progressUpdatedBy}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-slate-400 italic">No notes added yet.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-200/80 dark:border-[#465769]/40 space-y-3.5">
                                    <div className="flex justify-between text-xs font-semibold text-[#465769] dark:text-slate-300">
                                        <span className="flex items-center gap-1.5"><User size={13}/> {task.assigneeName}</span>
                                        {task.dueDate && <span className="flex items-center gap-1.5"><Clock size={13}/> {task.dueDate}</span>}
                                    </div>

                                    <div className="flex gap-2.5">
                                        <select
                                            value={task.status}
                                            onChange={e => updateTaskStatus(task.id, e.target.value)}
                                            disabled={!canUpdateStatus}
                                            className={`flex-1 text-xs py-2 px-3 border rounded-xl font-bold transition outline-none ${
                                                canUpdateStatus
                                                    ? 'bg-white dark:bg-[#2A3642] border-slate-200 dark:border-[#465769]/50 cursor-pointer text-[#2A3642] dark:text-white'
                                                    : 'bg-slate-100 dark:bg-[#1E2730] text-slate-400 cursor-not-allowed border-transparent'
                                            }`}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                        </select>

                                        {canUpdateStatus && task.status !== 'Completed' && (
                                            <button onClick={() => updateTaskStatus(task.id, 'Completed')} className="px-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-black rounded-xl transition flex items-center justify-center shadow-xs cursor-pointer">
                                                Done
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ================= DELEGATE TASK MODAL ================= */}
            {showDelegateModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#2A3642]/75 backdrop-blur-xs p-4">
                    <div className="bg-white dark:bg-[#2A3642] rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-[#465769] overflow-visible">
                        <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-[#465769]/30">
                            <h3 className="text-xl font-black flex items-center gap-2.5 text-[#2A3642] dark:text-white">
                                <Plus className="text-[#465769] dark:text-slate-300" size={22}/> Delegate New Task
                            </h3>
                            <button onClick={() => setShowDelegateModal(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-[#1E2730] hover:bg-slate-200 text-[#2A3642] dark:text-white transition cursor-pointer">
                                <X size={18}/>
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* Assignee */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2">Assign To <span className="text-rose-500">*</span></label>
                                <select value={form.assigneeId} onChange={e => setForm({...form, assigneeId: e.target.value})} className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 rounded-xl text-sm font-bold text-[#2A3642] dark:text-white outline-none">
                                    <option value="">Select Member...</option>
                                    {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role.replace('_',' ')})</option>)}
                                </select>
                            </div>

                            {/* Case Search Dropdown (Custom) */}
                            <div className="relative">
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2">Related Case (Optional)</label>
                                <div
                                    className="flex items-center bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 rounded-xl p-1.5 cursor-text"
                                    onClick={() => setShowCaseDropdown(true)}
                                >
                                    <Search size={18} className="text-slate-400 ml-2" />
                                    <input
                                        type="text"
                                        placeholder="Search by case title or reference..."
                                        value={caseSearch}
                                        onChange={e => { setCaseSearch(e.target.value); setShowCaseDropdown(true); if(!e.target.value) setForm({...form, caseId:'', caseTitle:''}); }}
                                        className="w-full p-2 bg-transparent outline-none text-sm font-medium text-[#2A3642] dark:text-white placeholder-slate-400"
                                    />
                                    <ChevronDown size={18} className="text-slate-400 mr-2 cursor-pointer" />
                                </div>

                                {showCaseDropdown && (
                                    <div className="absolute top-full left-0 w-full mt-2 max-h-52 overflow-y-auto bg-white dark:bg-[#2A3642] border border-slate-200 dark:border-[#465769] rounded-2xl shadow-xl z-50">
                                        {cases.filter(c => c.title.toLowerCase().includes(caseSearch.toLowerCase()) || (c.caseNumber && c.caseNumber.toLowerCase().includes(caseSearch.toLowerCase()))).map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => { setForm({...form, caseId: c.id, caseTitle: c.title}); setCaseSearch(c.title); setShowCaseDropdown(false); }}
                                                className="p-3.5 hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] cursor-pointer text-xs border-b border-slate-100 dark:border-[#465769]/30 last:border-0"
                                            >
                                                <p className="font-extrabold text-[#2A3642] dark:text-white">{c.title}</p>
                                                {c.caseNumber && <p className="text-[10px] text-[#465769] dark:text-slate-400 font-mono mt-0.5">{c.caseNumber}</p>}
                                            </div>
                                        ))}
                                        {cases.length > 0 && cases.filter(c => c.title.toLowerCase().includes(caseSearch.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-xs text-slate-400 text-center font-medium">No cases found</div>
                                        )}
                                    </div>
                                )}
                                {showCaseDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowCaseDropdown(false)}></div>}
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2">Task Description <span className="text-rose-500">*</span></label>
                                <textarea rows={3} value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="What needs to be accomplished?" className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 rounded-xl text-sm font-medium text-[#2A3642] dark:text-white outline-none resize-none"></textarea>
                            </div>

                            {/* Priority & Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2">Priority</label>
                                    <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})} className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 rounded-xl text-sm font-bold text-[#2A3642] dark:text-white outline-none">
                                        <option value="Normal">Normal</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#465769] dark:text-slate-300 mb-2">Due Date</label>
                                    <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full px-4 py-3 bg-[#F8FAFC] dark:bg-[#1E2730] border border-slate-200 dark:border-[#465769]/50 rounded-xl text-sm font-bold text-[#2A3642] dark:text-white outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-[#465769]/30">
                            <button onClick={() => setShowDelegateModal(false)} className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-[#1E2730] text-[#2A3642] dark:text-slate-200 font-bold text-xs sm:text-sm cursor-pointer">Cancel</button>
                            <button onClick={handleDelegate} disabled={isSubmitting} className="px-6 py-3 rounded-xl bg-[#2A3642] hover:bg-[#465769] dark:bg-[#465769] text-white font-bold text-xs sm:text-sm shadow-md disabled:opacity-50 cursor-pointer">
                                {isSubmitting ? 'Assigning...' : 'Assign Task'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}