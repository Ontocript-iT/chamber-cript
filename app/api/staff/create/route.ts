import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { sendStaffInviteEmail } from '@/lib/brevo';

// Netlify හිදී මෙය Node.js පරිසරයේ ක්‍රියාත්මක වන බවට සහතික කිරීම
export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        const body = await req.json();
        const { email, name, role, permissions, firmId } = body;

        if (!email || !name || !role || !firmId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields (email, name, role, firmId).' },
                { status: 400 }
            );
        }

        // 1. Generate a secure random temporary password
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

        // 2. Create User in Firebase Auth via Admin SDK
        const userRecord = await adminAuth.createUser({
            email: email.trim(),
            password: tempPassword,
            displayName: name.trim(),
        });

        // 3. Save User Data and Permissions in Firestore
        await adminDb.collection('users').doc(userRecord.uid).set({
            email: email.trim(),
            name: name.trim(),
            role,
            firmId,
            permissions: permissions || [],
            isFirstLogin: true,
            pin: null,
            createdAt: new Date().toISOString(),
        });

        // 4. Send Email - වෙනම try/catch එකක් තුළ (Email යැවීම ෆේල් වුවත් User සෑදීම සාර්ථක බව පෙන්වීමට)
        try {
            await sendStaffInviteEmail(email.trim(), tempPassword, role);
        } catch (emailError: any) {
            console.error('Email failed to send:', emailError);
            return NextResponse.json({
                success: true,
                message: 'Staff created successfully, but the invitation email failed to send.'
            });
        }

        return NextResponse.json({ success: true, message: 'Staff created and email sent.' });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}