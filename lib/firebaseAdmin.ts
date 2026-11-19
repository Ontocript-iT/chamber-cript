import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Environment variables නිවැරදිව ලබා ගැනීම
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Private key එකේ ඇති \n (new lines) නිවැරදිව format කිරීම අනිවාර්ය වේ
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Firebase Admin App එක දැනටමත් initialize වී නොමැති නම් පමණක් initialize කිරීම
if (!getApps().length) {
    if (!projectId || !clientEmail || !privateKey) {
        console.error("Firebase Admin initialization error: Missing environment variables.");
    } else {
        initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }
}

// Services export කිරීම
export const adminAuth = getAuth();
export const adminDb = getFirestore();