import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { phone, message } = await req.json();

        // Text.lk API Request (v3)
        const response = await fetch('https://app.text.lk/api/v3/sms/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.TEXTLK_API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                recipient: phone,
                sender_id: process.env.TEXTLK_SENDER_ID,
                message: message
            })
        });

        const data = await response.json();
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}