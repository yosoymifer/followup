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
import { logToFile } from '@/lib/logger';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // 1. Log EVERYTHING to the persistent file
        logToFile('[Webhook] Full Body Received', body);

        if (!body.entry || !Array.isArray(body.entry)) {
            logToFile('[Webhook] No entries found or not an array');
            return NextResponse.json({ success: true });
        }

        for (const entry of body.entry) {
            for (const change of entry.changes || []) {
                const value = change.value;
                if (!value) continue;

                // A. Handle Statuses
                if (value.statuses && Array.isArray(value.statuses)) {
                    for (const statusUpdate of value.statuses) {
                        const waMessageId = statusUpdate.id;
                        const newStatus = statusUpdate.status?.toUpperCase();
                        if (waMessageId && newStatus) {
                            logToFile(`[Webhook] Status Update: ${waMessageId} -> ${newStatus}`);
                            await prisma.message.updateMany({
                                where: { waMessageId },
                                data: { status: newStatus },
                            });
                        }
                    }
                }

                // B. Handle Messages
                if (value.messages && Array.isArray(value.messages)) {
                    for (const message of value.messages) {
                        const from = (message.from || '').replace(/\D/g, '');
                        const waMessageId = message.id;
                        const type = message.type || 'unknown';

                        let content = '';

                        if (message.text) {
                            content = message.text.body;
                        } else if (message.button) {
                            content = message.button.text || message.button.payload || '';
                        } else if (message.interactive) {
                            const interactive = message.interactive;
                            if (interactive.type === 'button_reply') {
                                content = interactive.button_reply?.title || interactive.button_reply?.id || '';
                            } else if (interactive.type === 'list_reply') {
                                content = interactive.list_reply?.title || interactive.list_reply?.id || '';
                            }
                        }

                        if (!content && (type === 'button' || type === 'interactive')) {
                            logToFile(`[Webhook] Warning: Empty content for type ${type}`, message);
                        }

                        logToFile(`[Webhook] Processed type:${type} from:${from} msg:"${content}"`);

                        const lead = await prisma.lead.findFirst({
                            where: { 
                                OR: [
                                    { phone: from },
                                    { phone: `+${from}` },
                                    { phone: { endsWith: from } }
                                ]
                            }
                        });

                        if (lead) {
                            logToFile(`[Webhook] Lead Found: ${lead.firstName} (${lead.id}). AI:${lead.aiEnabled}`);
                            
                            await prisma.message.create({
                                data: {
                                    leadId: lead.id,
                                    content: content || `[${type}]`,
                                    direction: 'INBOUND',
                                    waMessageId: waMessageId,
                                    status: 'RECEIVED'
                                }
                            });

                            await prisma.lead.update({
                                where: { id: lead.id },
                                data: { lastInboundMessageAt: new Date() } as any
                            });

                            if (content && lead.aiEnabled) {
                                try {
                                    logToFile(`[Webhook] Executing AI for lead ${lead.id}`);
                                    await processLeadResponse(lead.id, content);
                                } catch (aiError: any) {
                                    logToFile('[Webhook] AI Process Error', aiError.message);
                                }
                            }
                        } else {
                            logToFile(`[Webhook] Lead NOT found in DB for phone: ${from}`);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        logToFile('[Webhook] CRITICAL ERROR', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
