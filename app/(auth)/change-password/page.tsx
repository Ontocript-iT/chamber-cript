'use client';
import { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            // 1. Update Firebase Auth Password
            await updatePassword(user, newPassword);

            // 2. Remove 'isFirstLogin' flag from Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                isFirstLogin: false
            });

            alert("Password updated successfully!");

            // Send to PIN creation or verification
            router.push('/setup-pin');
        } catch (error: any) {
            alert("Error updating password. Try re-logging in.");
        }
    };

    return (
        <div className="flex h-screen items-center justify-center">
            <form onSubmit={handleSubmit} className="p-8 bg-white shadow-xl rounded-lg w-96 space-y-4">
                <h2 className="text-xl font-bold text-red-600">Action Required</h2>
                <p className="text-sm text-gray-600">Please change your temporary password to a secure one.</p>
                <input
                    type="password"
                    placeholder="New Strong Password"
                    className="w-full p-3 border rounded"
                    onChange={(e) => setNewPassword(e.target.value)}
                    required minLength={8}
                />
                <button className="w-full p-3 bg-green-600 text-white rounded">
                    Update Password
                </button>
            </form>
        </div>
    );
}