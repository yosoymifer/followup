import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processLeadResponse } from '@/lib/agents/bookingAgent';
import { logToFile } from '@/lib/logger';

// 1. GET Request: Verification for Meta Webhooks
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    await logToFile('Webhook Verification Attempt', { mode, token: token === process.env.WA_VERIFY_TOKEN ? 'MATCH' : 'MISMATCH' }, 'WEBHOOK_VERIFY');

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
        
        // 1. Log EVERYTHING to the persistent file
        await logToFile('[Webhook] Full Body Received', body);

        if (!body.entry || !Array.isArray(body.entry)) {
            await logToFile('[Webhook] No entries found or not an array');
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
                            await logToFile(`[Webhook] Status Update: ${waMessageId} -> ${newStatus}`);
                            await prisma.message.updateMany({
                                where: { waMessageId },
                                data: { status: newStatus },
                            });
                        }
                    }
                }

                // B. Handle Messages
                if (value.messages && Array.isArray(value.messages)) {
                    // Extract contact profile name from Meta payload
                    const contactName = value.contacts?.[0]?.profile?.name || '';

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
                            await logToFile(`[Webhook] Warning: Empty content for type ${type}`, message);
                        }

                        await logToFile(`[Webhook] Processed type:${type} from:${from} msg:"${content}"`);

                        const lead = await prisma.lead.findFirst({
                            where: { 
                                OR: [
                                    { phone: from },
                                    { phone: `+${from}` },
                                    { phone: { endsWith: from } }
                                ]
                            },
                            include: {
                                organization: true
                            }
                        });

                        if (lead) {
                            await logToFile(`[Webhook] Lead Found: ${lead.firstName} (${lead.id}). AI:${lead.aiEnabled}`);
                            
                            // Update lead name from WhatsApp profile if not set or is placeholder
                            const needsNameUpdate = contactName && (!lead.firstName || lead.firstName.toLowerCase() === 'test');
                            
                            await prisma.message.create({
                                data: {
                                    leadId: lead.id,
                                    content: content || `[${type}]`,
                                    direction: 'INBOUND',
                                    waMessageId: waMessageId,
                                    status: 'RECEIVED'
                                }
                            });

                            // Parse WhatsApp name into first/last and update lead
                            const nameParts = contactName ? contactName.split(' ') : [];
                            await prisma.lead.update({
                                where: { id: lead.id },
                                data: {
                                    lastInboundMessageAt: new Date(),
                                    lastContactedAt: new Date(),
                                    ...(needsNameUpdate ? {
                                        firstName: nameParts[0] || contactName,
                                        lastName: nameParts.slice(1).join(' ') || undefined
                                    } : {})
                                } as any
                            });

                            if (content && lead.aiEnabled) {
                                if (lead.organization.globalAiEnabled) {
                                    try {
                                        await logToFile(`[Webhook] Executing AI for lead ${lead.id}`);
                                        await processLeadResponse(lead.id, content);
                                    } catch (aiError: any) {
                                        await logToFile('[Webhook] AI Process Error', aiError.message);
                                    }
                                } else {
                                    await logToFile(`[Webhook] AI Ignored (Global Kill Switch ACTIVE) for lead ${lead.id}`);
                                }
                            }
                        } else {
                            await logToFile(`[Webhook] Lead NOT found in DB for phone: ${from}`);
                        }
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        await logToFile('[Webhook] CRITICAL ERROR', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
