// app/(dashboard)/dashboard/page.tsx (මෙය අලුත් Server Component එකයි)

import ClientPage from './ClientPage';

export const instant = false;

export default function Page() {
    return <ClientPage />;
}