import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 1. GET Request: Verification for Meta Webhooks
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // We'll compare with a VERIFY_TOKEN defined in .env
    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
            console.log('WhatsApp Webhook Verified!');
            return new Response(challenge, { status: 200 });
        } else {
            return new Response('Forbidden', { status: 403 });
        }
    }
    return new Response('Bad Request', { status: 400 });
}

// 2. POST Request: Handle incoming messages/statuses
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Check if it's a message event
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from; // Phone number
            const content = message.text?.body;
            const waMessageId = message.id;

            // 1. Find Lead by phone number
            const lead = await prisma.lead.findFirst({
                where: { phone: from }
            });

            if (lead) {
                // 2. Store Message
                await prisma.message.create({
                    data: {
                        leadId: lead.id,
                        content: content || '[Media/Unsupported]',
                        direction: 'INBOUND',
                        waMessageId: waMessageId,
                        status: 'RECEIVED'
                    }
                });

                // TODO: Trigger AI Smart Tagging analysis here
                console.log(`Received message from ${lead.phone}: ${content}`);
            } else {
                console.warn(`Message from unknown lead: ${from}`);
                // Optional: Auto-create lead or store in a 'Unknown' list
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in WhatsApp Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
