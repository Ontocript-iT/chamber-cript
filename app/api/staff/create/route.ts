import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendStaffInviteEmail } from '@/lib/brevo';

export async function POST(req: Request) {
    try {
        const { email, name, role, permissions, firmId } = await req.json();

        // 1. Generate a secure random temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + "A1!";

        // 2. Create User in Firebase Auth via Admin SDK
        const userRecord = await adminAuth.createUser({
            email,
            password: tempPassword,
            displayName: name,
        });

        // 3. Save User Data and Permissions in Firestore
        await adminDb.collection('users').doc(userRecord.uid).set({
            email,
            name,
            role,
            firmId,
            permissions,
            isFirstLogin: true, // Forces password change on first login
            pin: null, // Forces PIN creation
            createdAt: new Date().toISOString(),
        });

        // 4. Send Email via Brevo
        await sendStaffInviteEmail(email, tempPassword, role);

        return NextResponse.json({ success: true, message: 'Staff created and email sent.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}