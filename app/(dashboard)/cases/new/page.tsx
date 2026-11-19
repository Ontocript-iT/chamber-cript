'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Trash2, FileText, Send, Save, X, Briefcase } from 'lucide-react';

// Section Types
type SectionState = { details: boolean; client: boolean; docs: boolean; notes: boolean; };
type DocEntry = { id: string; name: string; file: File | null; url?: string };
type CustomField = { id: string; key: string; value: string };

export default function NewCasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [lawyerName, setLawyerName] = useState('');
    const [firmId, setFirmId] = useState('');
    const [hasPermission, setHasPermission] = useState(false);

    // Sections Expand/Collapse State
    const [sections, setSections] = useState<SectionState>({
        details: true, client: true, docs: true, notes: true
    });

    // Modal State
    const [showSmsModal, setShowSmsModal] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        caseNumber: '', chamberRef: '', title: '', type: '', customType: '',
        subtype: '', clientRole: '', customClientRole: '',
        clientName: '', idType: 'NIC', idNumber: '', contactNo: '', email: '', address: '',
        notes: ''
    });

    const [docs, setDocs] = useState<DocEntry[]>([{ id: Date.now().toString(), name: '', file: null }]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);

    // Permissions Check on Load
    useEffect(() => {
        const checkAuth = async () => {
            const user = auth.currentUser;
            if (!user) return router.push('/login');

            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const data = userDoc.data();

            if (data && (data.role === 'LAWYER' || data.permissions?.includes('cases.write'))) {
                setHasPermission(true);
                setLawyerName(data.name);
                setFirmId(data.firmId);
            } else {
                alert("You don't have permission to register cases.");
                router.push('/dashboard');
            }
        };
        checkAuth();
    }, [router]);

    // Validations
    const validateForm = () => {
        if (!formData.title) return "Case title is required.";
        if (!formData.clientName) return "Client name is required.";

        // Contact Number (Sri Lankan) validation
        const phoneRegex = /^(?:0|94|\+94)?(?:7\d{8}|[1-9]\d{8})$/;
        if (!phoneRegex.test(formData.contactNo)) return "Invalid contact number format.";

        // NIC validation (if selected)
        if (formData.idType === 'NIC' && formData.idNumber) {
            const nicRegex = /^([0-9]{9}[x|X|v|V]|[0-9]{12})$/;
            if (!nicRegex.test(formData.idNumber)) return "Invalid NIC format.";
        }
        return null;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleSection = (sec: keyof SectionState) => {
        setSections({ ...sections, [sec]: !sections[sec] });
    };

    const clearForm = () => {
        if(confirm("Are you sure you want to clear all fields?")) {
            setFormData({
                caseNumber: '', chamberRef: '', title: '', type: '', customType: '', subtype: '',
                clientRole: '', customClientRole: '', clientName: '', idType: 'NIC', idNumber: '',
                contactNo: '', email: '', address: '', notes: ''
            });
            setDocs([{ id: Date.now().toString(), name: '', file: null }]);
            setCustomFields([]);
        }
    };

    // Submission Handler
    const submitCase = async (sendSms: boolean) => {
        const error = validateForm();
        if (error) return alert(error);

        setLoading(true);
        try {
            // 1. Upload Documents to Bunny.net via our API
            const uploadedDocs = [];
            for (const d of docs) {
                if (d.file && d.name) {
                    const fileData = new FormData();
                    fileData.append('file', d.file);
                    fileData.append('fileName', d.file.name);

                    const uploadRes = await fetch('/api/upload', { method: 'POST', body: fileData });
                    const uploadData = await uploadRes.json();

                    if (uploadData.success) {
                        uploadedDocs.push({ name: d.name, url: uploadData.url });
                    }
                }
            }

            // 2. Prepare Data
            const finalType = formData.type === 'Other' ? formData.customType : formData.type;
            const finalRole = formData.clientRole === 'Other' ? formData.customClientRole : formData.clientRole;

            // 3. Save to Firestore
            const caseRef = await addDoc(collection(db, 'cases'), {
                firmId,
                ...formData,
                type: finalType,
                clientRole: finalRole,
                documents: uploadedDocs,
                customFields: customFields.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
                status: 'ACTIVE',
                createdAt: new Date().toISOString()
            });

            // 4. Send SMS if requested
            if (sendSms) {
                const message = `Dear ${formData.clientName},\nYour case "${formData.title}" (${finalType}) has been successfully registered.\n\n${lawyerName}`;
                await fetch('/api/sms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: formData.contactNo, message })
                });
            }

            alert("Case Registered Successfully!");
            router.push('/cases'); // Redirect to cases list

        } catch (err: any) {
            console.error(err);
            alert("An error occurred: " + err.message);
        } finally {
            setLoading(false);
            setShowSmsModal(false);
        }
    };

    if (!hasPermission) return null;

    return (
        <div className="max-w-5xl mx-auto bg-gray-50 dark:bg-gray-950 p-6 rounded-2xl shadow-sm transition-colors">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Briefcase className="text-blue-600" /> New Case Registration
                </h1>
                <button onClick={clearForm} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm font-medium transition">
                    Clear Form
                </button>
            </div>

            <div className="space-y-6">

                {/* ================= SECTION 1: Case Details ================= */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleSection('details')} className="w-full flex justify-between items-center p-4 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">1. Case Details</h2>
                        {sections.details ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {sections.details && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" name="caseNumber" placeholder="Case Number (Optional)" value={formData.caseNumber} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full" />
                            <input type="text" name="chamberRef" placeholder="Chamber Ref (Optional)" value={formData.chamberRef} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full" />
                            <input type="text" name="title" placeholder="Case Name / Title *" value={formData.title} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full md:col-span-2" required />

                            <div>
                                <select name="type" value={formData.type} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full text-gray-700 dark:text-gray-300">
                                    <option value="">Select Case Type *</option>
                                    <option value="Civil">Civil</option>
                                    <option value="Criminal">Criminal</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="Family">Family</option>
                                    <option value="Other">Add New...</option>
                                </select>
                                {formData.type === 'Other' && (
                                    <input type="text" name="customType" placeholder="Specify Case Type" value={formData.customType} onChange={handleInputChange} className="mt-2 p-3 border rounded-lg w-full dark:bg-gray-800 dark:border-gray-700" />
                                )}
                            </div>

                            <div>
                                <select name="clientRole" value={formData.clientRole} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full text-gray-700 dark:text-gray-300">
                                    <option value="">Select Client Role *</option>
                                    <option value="Plaintiff">Plaintiff</option>
                                    <option value="Defendant">Defendant</option>
                                    <option value="Petitioner">Petitioner</option>
                                    <option value="Respondent">Respondent</option>
                                    <option value="Other">Add New...</option>
                                </select>
                                {formData.clientRole === 'Other' && (
                                    <input type="text" name="customClientRole" placeholder="Specify Role" value={formData.customClientRole} onChange={handleInputChange} className="mt-2 p-3 border rounded-lg w-full dark:bg-gray-800 dark:border-gray-700" />
                                )}
                            </div>

                            <input type="text" name="subtype" placeholder="Subtype / Note" value={formData.subtype} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full md:col-span-2" />
                        </div>
                    )}
                </div>

                {/* ================= SECTION 2: Client Info ================= */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleSection('client')} className="w-full flex justify-between items-center p-4 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">2. Client Information</h2>
                        {sections.client ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {sections.client && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" name="clientName" placeholder="Full Name *" value={formData.clientName} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full md:col-span-2" required />

                            <div className="flex gap-2">
                                <select name="idType" value={formData.idType} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-1/3">
                                    <option value="NIC">NIC</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Driving License">License</option>
                                </select>
                                <input type="text" name="idNumber" placeholder="ID Number" value={formData.idNumber} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-2/3" />
                            </div>

                            <input type="text" name="contactNo" placeholder="Contact Number (ex: 0771234567) *" value={formData.contactNo} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full" required />
                            <input type="email" name="email" placeholder="Email Address (Optional)" value={formData.email} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full" />
                            <textarea name="address" placeholder="Residential Address" value={formData.address} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full md:col-span-2" rows={2}></textarea>
                        </div>
                    )}
                </div>

                {/* ================= SECTION 3: Documents (Bunny.net) ================= */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleSection('docs')} className="w-full flex justify-between items-center p-4 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2"><FileText size={18}/> 3. Documents</h2>
                        {sections.docs ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {sections.docs && (
                        <div className="p-6 space-y-4">
                            {docs.map((doc, index) => (
                                <div key={doc.id} className="flex flex-col md:flex-row gap-3 items-center bg-gray-50 dark:bg-gray-800/30 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                    <input type="text" placeholder="Document Name (e.g. Police Report)" value={doc.name} onChange={(e) => {
                                        const newDocs = [...docs];
                                        newDocs[index].name = e.target.value;
                                        setDocs(newDocs);
                                    }} className="p-2 border rounded-lg w-full md:w-1/3 dark:bg-gray-800 dark:border-gray-700" />

                                    <input type="file" onChange={(e) => {
                                        const newDocs = [...docs];
                                        newDocs[index].file = e.target.files ? e.target.files[0] : null;
                                        setDocs(newDocs);
                                    }} className="w-full md:w-1/2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400" />

                                    <button type="button" onClick={() => setDocs(docs.filter((_, i) => i !== index))} className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg">
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setDocs([...docs, { id: Date.now().toString(), name: '', file: null }])} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                <Plus size={16} /> Add Another Document
                            </button>
                        </div>
                    )}
                </div>

                {/* ================= SECTION 4: Notes & Custom Fields ================= */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <button type="button" onClick={() => toggleSection('notes')} className="w-full flex justify-between items-center p-4 bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <h2 className="font-bold text-lg text-gray-800 dark:text-gray-200">4. Additional Notes & Custom Fields</h2>
                        {sections.notes ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {sections.notes && (
                        <div className="p-6 space-y-6">
                            <textarea name="notes" placeholder="Any additional notes about the case..." value={formData.notes} onChange={handleInputChange} className="p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 w-full" rows={3}></textarea>

                            <div className="space-y-3">
                                <p className="font-medium text-sm text-gray-600 dark:text-gray-400">Custom Fields (Optional)</p>
                                {customFields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2">
                                        <input type="text" placeholder="Field Name (e.g. Judge Name)" value={field.key} onChange={(e) => {
                                            const newF = [...customFields]; newF[index].key = e.target.value; setCustomFields(newF);
                                        }} className="p-2 border rounded-lg w-1/3 dark:bg-gray-800 dark:border-gray-700" />
                                        <input type="text" placeholder="Value" value={field.value} onChange={(e) => {
                                            const newF = [...customFields]; newF[index].value = e.target.value; setCustomFields(newF);
                                        }} className="p-2 border rounded-lg w-full dark:bg-gray-800 dark:border-gray-700" />
                                        <button type="button" onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))} className="text-red-500 px-2">
                                            <X size={20} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => setCustomFields([...customFields, { id: Date.now().toString(), key: '', value: '' }])} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                    <Plus size={16} /> Add Custom Field
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
                <button
                    onClick={() => submitCase(false)}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Save size={18} /> Register Only
                </button>
                <button
                    onClick={() => {
                        const err = validateForm();
                        if(err) alert(err); else setShowSmsModal(true);
                    }}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? 'Processing...' : <><Send size={18} /> Register & Send SMS</>}
                </button>
            </div>

            {/* SMS Confirmation Modal */}
            {showSmsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
                        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Send Registration SMS</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">The following message will be sent to <strong>{formData.contactNo}</strong> via text.lk:</p>

                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm text-gray-800 dark:text-gray-300 mb-6 font-mono whitespace-pre-wrap">
                            Dear {formData.clientName},{'\n'}
                            Your case "{formData.title}" ({formData.type === 'Other' ? formData.customType : formData.type}) has been successfully registered.{'\n\n'}
                            {lawyerName}
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowSmsModal(false)} className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                                Cancel
                            </button>
                            <button onClick={() => submitCase(true)} disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md disabled:opacity-50">
                                {loading ? 'Sending...' : 'Confirm & Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}