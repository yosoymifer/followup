import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processLeadResponse } from '@/lib/agents/bookingAgent';

// 1. GET Request: Verification for Meta Webhooks
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

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
// Simplified: store message in DB. n8n handles AI agent logic.
export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Log full body for debugging in production
        console.log('[Webhook] Full Body:', JSON.stringify(body, null, 2));

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (message) {
            const from = message.from;
            const waMessageId = message.id;

            // Extract content from different message types
            let content = '';
            let type = message.type || 'unknown';

            if (message.text) {
                content = message.text.body;
            } else if (message.button) {
                // Quick Reply Buttons (legacy or simple)
                content = message.button.text || message.button.payload || '';
                type = 'button_reply';
            } else if (message.interactive) {
                // Interactive Buttons (list_reply or button_reply)
                if (message.interactive.type === 'button_reply') {
                    content = message.interactive.button_reply?.title || message.interactive.button_reply?.id || '';
                } else if (message.interactive.type === 'list_reply') {
                    content = message.interactive.list_reply?.title || message.interactive.list_reply?.id || '';
                }
                type = 'interactive_' + message.interactive.type;
            } else if (type === 'button') {
                // Some quick replies come as type: "button"
                content = message.button?.text || message.button?.payload || '';
            } else {
                // Unknown type (e.g., location, document, sticker, fallback)
                content = `[Formato no soportado: ${type}]`;
            }

            // Fallback for button payload if content is still empty
            if (!content && message.button?.payload) {
                content = message.button.payload;
            }

            console.log(`[Webhook] Incoming ${type} from ${from}: "${content}"`);

            // Find Lead by phone number
            const lead = await prisma.lead.findFirst({
                where: { phone: from }
            });

            if (lead) {
                console.log(`[Webhook] Lead found: ${lead.firstName} (${lead.id}). AI Enabled: ${lead.aiEnabled}`);
                
                // Store Message
                await prisma.message.create({
                    data: {
                        leadId: lead.id,
                        content: content || `[${type}]`,
                        direction: 'INBOUND',
                        waMessageId: waMessageId,
                        status: 'RECEIVED'
                    }
                });

                // Update Lead's 24h Meta window tracker
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { lastInboundMessageAt: new Date() } as any
                });

                // Proceed with AI Agent response if content exists
                if (content && lead.aiEnabled) {
                    try {
                        console.log(`[Webhook] Triggering AI Agent for lead ${lead.id}...`);
                        await processLeadResponse(lead.id, content);
                    } catch (aiError) {
                        console.error('[Webhook] AI Agent Error:', aiError);
                    }
                } else if (!lead.aiEnabled) {
                    console.log(`[Webhook] AI is DISABLED for lead ${lead.id}. Skipping response.`);
                }
            } else {
                console.warn(`[Webhook] Message from unknown lead: ${from}`);
            }
        }

        // Handle status updates (delivered, read, etc.)
        const statuses = value?.statuses;
        if (statuses?.length) {
            for (const statusUpdate of statuses) {
                const waMessageId = statusUpdate.id;
                const newStatus = statusUpdate.status?.toUpperCase(); // DELIVERED, READ, FAILED

                if (waMessageId && newStatus) {
                    await prisma.message.updateMany({
                        where: { waMessageId },
                        data: { status: newStatus },
                    });
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in WhatsApp Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
