// src/lib/logger.ts
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export type ActivityAction =
    | 'CASE_CREATED'
    | 'CASE_UPDATED'
    | 'TIMELINE_ADDED'
    | 'SMS_SENT'
    | 'TASK_ASSIGNED'
    | 'TASK_UPDATED';

export async function logActivity(
    firmId: string,
    userId: string,
    userName: string,
    action: ActivityAction,
    description: string,
    caseId?: string,
    caseTitle?: string
) {
    try {
        await addDoc(collection(db, 'audit_logs'), {
            firmId,
            userId,
            userName,
            action,
            description,
            caseId: caseId || '',
            caseTitle: caseTitle || '',
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error("Failed to log system activity:", err);
    }
}