import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const fileName = formData.get('fileName') as string;

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const safeFileName = `${Date.now()}-${fileName.replace(/\s+/g, '-')}`;
        const storageZone = process.env.BUNNY_STORAGE_ZONE;
        const apiKey = process.env.BUNNY_API_KEY;

        // Bunny Storage API Request
        const response = await fetch(`https://storage.bunnycdn.com/${storageZone}/cases/${safeFileName}`, {
            method: 'PUT',
            headers: {
                'AccessKey': apiKey!,
                'Content-Type': file.type || 'application/octet-stream',
            },
            body: buffer,
        });

        if (!response.ok) throw new Error('Failed to upload to Bunny.net');

        const fileUrl = `${process.env.BUNNY_PULL_ZONE}/cases/${safeFileName}`;
        return NextResponse.json({ success: true, url: fileUrl });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}