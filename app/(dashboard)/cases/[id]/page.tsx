// app/(dashboard)/cases/[id]/page.tsx (මෙය අලුත් Server Component එකයි)

import ClientPage from './ClientPage';

// 🟢 මෙහි 'use client' නොමැති නිසා instant = false කිසිදු දෝෂයකින් තොරව වැඩ කරයි
export const instant = false;

export default function Page(props: { params: Promise<{ id: string }> }) {
    return <ClientPage params={props.params} />;
}