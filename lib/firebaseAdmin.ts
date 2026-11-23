import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';

function getAdminApp(): App {
    const existingApps = getApps();
    if (existingApps.length > 0) {
        return existingApps[0]!;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/^"|"$/g, '')
        .replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            `Missing Firebase Admin env vars -> projectId: ${!!projectId}, clientEmail: ${!!clientEmail}, privateKey: ${!!privateKey}`
        );
    }

    return initializeApp({
        credential: cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

// ESM දෝෂය සම්පූර්ණයෙන්ම මඟ හැරීමට Dynamic Import (await import) භාවිතා කිරීම
export async function getAdminAuth() {
    const app = getAdminApp();
    const { getAuth } = await import('firebase-admin/auth');
    return getAuth(app);
}

export async function getAdminDb() {
    const app = getAdminApp();
    const { getFirestore } = await import('firebase-admin/firestore');
    return getFirestore(app);
}