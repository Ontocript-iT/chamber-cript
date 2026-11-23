import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized request.' }, { status: 401 });
        }

        const adminAuth = getAdminAuth();
        const adminDb = getAdminDb();

        // 1. Verify the caller is a SUPER_ADMIN
        const decoded = await adminAuth.verifyIdToken(idToken);
        const callerSnap = await adminDb.collection('users').doc(decoded.uid).get();
        if (callerSnap.data()?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Super Admin access required.' }, { status: 403 });
        }

        // 2. Validate payload
        const { targetUid, targetEmail, newPassword, resetPin } = await req.json();

        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
            return NextResponse.json(
                { error: 'Temporary password must be at least 8 characters long.' },
                { status: 400 }
            );
        }

        // 3. Resolve target Firebase Auth UID (by UID or email fallback)
        let uid = targetUid;
        if (!uid && targetEmail) {
            const userRecord = await adminAuth.getUserByEmail(targetEmail.trim());
            uid = userRecord.uid;
        }

        if (!uid) {
            return NextResponse.json({ error: 'Target user account not found.' }, { status: 404 });
        }

        // 4. Update password in Firebase Auth
        await adminAuth.updateUser(uid, {
            password: newPassword,
        });

        // 5. Force password change on next login (and optionally reset 6-digit PIN)
        const firestoreUpdates: Record<string, any> = {
            isFirstLogin: true,
            passwordResetAt: new Date().toISOString(),
        };
        if (resetPin) {
            firestoreUpdates.pin = null;
        }

        await adminDb.collection('users').doc(uid).set(firestoreUpdates, { merge: true });

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully.',
        });
    } catch (error: any) {
        console.error('Admin password reset error:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to reset password.' },
            { status: 500 }
        );
    }
}