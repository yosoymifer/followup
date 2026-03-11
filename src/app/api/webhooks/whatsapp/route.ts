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
        const bodyString = JSON.stringify(body, null, 2);

        // 1. Log EVERYTHING early to avoid missing any Meta event
        console.log('--- WhatsApp Webhook Start ---');
        console.log('[Webhook] Full Body Received:', bodyString);

        if (!body.entry || !Array.isArray(body.entry)) {
            console.log('[Webhook] No entries found or not an array');
            return NextResponse.json({ success: true });
        }

        for (const entry of body.entry) {
            for (const change of entry.changes || []) {
                const value = change.value;
                if (!value) continue;

                // A. Handle Statuses (Delivered, Read, etc.)
                if (value.statuses && Array.isArray(value.statuses)) {
                    for (const statusUpdate of value.statuses) {
                        const waMessageId = statusUpdate.id;
                        const newStatus = statusUpdate.status?.toUpperCase();
                        if (waMessageId && newStatus) {
                            console.log(`[Webhook] Status Update: ${waMessageId} -> ${newStatus}`);
                            await prisma.message.updateMany({
                                where: { waMessageId },
                                data: { status: newStatus },
                            });
                        }
                    }
                }

                // B. Handle Messages (Text, Buttons, Interactive, etc.)
                if (value.messages && Array.isArray(value.messages)) {
                    for (const message of value.messages) {
                        const from = (message.from || '').replace(/\D/g, ''); // Clean number (no +, no spaces)
                        const waMessageId = message.id;
                        const type = message.type || 'unknown';

                        let content = '';

                        // Advanced Content Extraction
                        if (message.text) {
                            content = message.text.body;
                        } else if (message.button) {
                            // Quick Reply from Template (type: "button" or has .button)
                            content = message.button.text || message.button.payload || '';
                        } else if (message.interactive) {
                            // Interactive button/list reply
                            const interactive = message.interactive;
                            if (interactive.type === 'button_reply') {
                                content = interactive.button_reply?.title || interactive.button_reply?.id || '';
                            } else if (interactive.type === 'list_reply') {
                                content = interactive.list_reply?.title || interactive.list_reply?.id || '';
                            }
                        }

                        // Fallback if content is still empty but it's a known interactive/button type
                        if (!content && (type === 'button' || type === 'interactive')) {
                            console.log(`[Webhook] Warning: Empty content for type ${type}. Full msg:`, JSON.stringify(message));
                        }

                        console.log(`[Webhook] Processed type:${type} from:${from} msg:"${content}"`);

                        // Find Lead
                        const lead = await prisma.lead.findFirst({
                            where: { 
                                OR: [
                                    { phone: from },
                                    { phone: `+${from}` }, // Just in case stored with plus
                                    { phone: { endsWith: from } } // Match suffixes for safety
                                ]
                            }
                        });

                        if (lead) {
                            console.log(`[Webhook] Lead Found: ${lead.firstName} (${lead.id}). AI:${lead.aiEnabled}`);
                            
                            // Store Inbound Message
                            await prisma.message.create({
                                data: {
                                    leadId: lead.id,
                                    content: content || `[${type}]`,
                                    direction: 'INBOUND',
                                    waMessageId: waMessageId,
                                    status: 'RECEIVED'
                                }
                            });

                            // Update 24h window
                            await prisma.lead.update({
                                where: { id: lead.id },
                                data: { lastInboundMessageAt: new Date() } as any
                            });

                            // Trigger AI
                            if (content && lead.aiEnabled) {
                                try {
                                    console.log(`[Webhook] Executing AI for lead ${lead.id}`);
                                    await processLeadResponse(lead.id, content);
                                } catch (aiError) {
                                    console.error('[Webhook] AI Process Error:', aiError);
                                }
                            }
                        } else {
                            console.warn(`[Webhook] Lead NOT found in DB for phone: ${from}`);
                        }
                    }
                }
            }
        }

        console.log('--- WhatsApp Webhook End ---');
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Webhook] CRITICAL ERROR:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
