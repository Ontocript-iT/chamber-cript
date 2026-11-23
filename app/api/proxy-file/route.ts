import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const rawUrl = request.nextUrl.searchParams.get('url');

    if (!rawUrl) {
        return NextResponse.json({ error: 'Missing file URL' }, { status: 400 });
    }

    try {
        // Supports both external URLs (https://...) and local relative paths (/uploads/...)
        const targetUrl = new URL(rawUrl, request.nextUrl.origin);

        if (targetUrl.pathname === '/api/proxy-file') {
            return NextResponse.json({ error: 'Invalid target URL' }, { status: 400 });
        }

        if (targetUrl.protocol !== 'https:' && targetUrl.protocol !== 'http:') {
            return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
        }

        const upstream = await fetch(targetUrl.toString());
        if (!upstream.ok) {
            return NextResponse.json(
                { error: `Failed to fetch document (${upstream.status})` },
                { status: upstream.status }
            );
        }

        const contentType = upstream.headers.get('content-type') || 'application/pdf';
        const fileBuffer = await upstream.arrayBuffer();

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': 'inline',
                'Cache-Control': 'private, max-age=300',
            },
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || 'Unable to load document' },
            { status: 500 }
        );
    }
}