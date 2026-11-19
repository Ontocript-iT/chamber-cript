import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Next.js Server-Side Rendering (SSR) වලදී app එක කිහිප වරක් initialize වීම වැළැක්වීම සඳහා මෙය භාවිත කෙරේ
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// ඔබට අවශ්‍ය සේවාවන් මෙතනින් export කරන්න (Auth, Firestore, Storage, etc.)
export const auth = getAuth(app);
export const db = getFirestore(app);