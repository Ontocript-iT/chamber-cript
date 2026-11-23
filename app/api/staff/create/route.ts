import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { sendStaffInviteEmail } from '@/lib/brevo';

export async function POST(req: Request) {
    try {
        // මෙතැන දැන් await අවශ්‍ය නොවේ
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

        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

        const userRecord = await adminAuth.createUser({
            email: email.trim(),
            password: tempPassword,
            displayName: name.trim(),
        });

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