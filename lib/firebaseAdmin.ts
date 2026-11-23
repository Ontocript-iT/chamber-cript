import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
// ESM ගැටලුව (jose crash) වළක්වා ගැනීමට 'firebase-admin/auth' හෝ 'firestore' කෙලින්ම import නොකරයි

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

// Netlify හිදී Runtime ESM crash එකක් නොපැමිණීමට 'firebase-admin' හරහාම dynamic ලෙස අමතයි
export function getAdminAuth() {
    const app = getAdminApp();
    // TypeScript පරීක්ෂාවෙන් බේරීමට require හරහා ගෙන as any යොදයි
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAuth } = require('firebase-admin/auth');
    return getAuth(app);
}

export function getAdminDb() {
    const app = getAdminApp();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirestore } = require('firebase-admin/firestore');
    return getFirestore(app);
}