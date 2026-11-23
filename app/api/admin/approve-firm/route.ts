import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization') || '';
        const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminAuth =  getAdminAuth();
        const adminDb = getAdminDb();

        // 1. Super Admin දැයි තහවුරු කිරීම
        const decoded = await adminAuth.verifyIdToken(idToken);
        const callerDoc = await adminDb.collection('users').doc(decoded.uid).get();
        if (callerDoc.data()?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { firmId } = await req.json();
        if (!firmId) {
            return NextResponse.json({ error: 'Firm ID is required' }, { status: 400 });
        }

        const firmRef = adminDb.collection('firms').doc(firmId);
        const firmSnap = await firmRef.get();
        if (!firmSnap.exists) {
            return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
        }

        const firm = firmSnap.data()!;
        const now = new Date();
        const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // දින 14ක් එකතු කිරීම
        const trialEndDateStr = trialEnd.toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });

        // 2. Firestore හි Firm දත්ත යාවත්කාලීන කිරීම
        await firmRef.set(
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

        // 3. Brevo හරහා Email එක යැවීම
        if (firm.email && process.env.BREVO_API_KEY) {
            await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: {
                        name: 'ChamberCript',
                        email: process.env.BREVO_SENDER_EMAIL || 'noreply@chambercript.lk',
                    },
                    to: [{ email: firm.email, name: firm.ownerName || firm.name }],
                    subject: 'Your ChamberCript Account & 14-Day Free Trial is Active!',
                    htmlContent: `
                        <div style="font-family: sans-serif; line-height: 1.6; color: #232e39;">
                            <h2>Welcome to ChamberCript, ${firm.ownerName || 'Counsel'}!</h2>
                            <p>Your registration for <strong>${firm.name}</strong> has been verified and approved by our administration team.</p>
                            <p>Your <strong>14-Day Free Trial</strong> is now active until <strong>${trialEndDateStr}</strong> (including 100 trial SMS credits).</p>
                            <p>You can now sign in and configure your 6-digit security PIN to start managing your cases.</p>
                        </div>
                    `,
                }),
            }).catch((e) => console.error('Email send error:', e));
        }

        // 4. SMS පණිවිඩය යැවීම (ඔබගේ පවතින /api/sms route එක හරහා)
        if (firm.phone) {
            const origin = new URL(req.url).origin;
            const smsText = `ChamberCript: Your law firm "${firm.name}" is approved! Your 14-day free trial is active until ${trialEndDateStr}. Sign in now to set up your 6-digit PIN.`;

            await fetch(`${origin}/api/sms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: firm.phone, message: smsText }),
            }).catch((e) => console.error('SMS send error:', e));
        }

        return NextResponse.json({
            success: true,
            trialEndsAt: trialEnd.toISOString(),
        });
    } catch (error: any) {
        console.error('Approve firm error:', error);
        return NextResponse.json({ error: error?.message || 'Approval failed' }, { status: 500 });
    }
}