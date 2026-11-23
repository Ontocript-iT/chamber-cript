// lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

export function getAdminApp() {
    if (!admin.apps.length) {
        const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        // Netlify හි ඇති \n නිවැරදිව කියවීම
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ?.replace(/^"|"$/g, '')
            .replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
            throw new Error(
                `Missing Firebase Admin env vars -> projectId: ${!!projectId}, clientEmail: ${!!clientEmail}, privateKey: ${!!privateKey}`
            );
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }
    return admin;
}

export function getAdminAuth() {
    // getAdminApp() හරහා Initialize වී ඇති බව තහවුරු කර Auth ලබාදීම
    return getAdminApp().auth();
}

export function getAdminDb() {
    // getAdminApp() හරහා Initialize වී ඇති බව තහවුරු කර Firestore ලබාදීම
    return getAdminApp().firestore();
}