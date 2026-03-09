import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

export async function GET(req: Request) {
    // Basic security to ensure this isn't called publicly without intended headers/cron IP
    // Depending on deployment, Vercel standardizes cron requests with x-vercel-cron header
    // But since we are on Windows Laragon, we'll allow local access or check a secret

    // Find campaigns that are SCHEDULED and whose time has arrived
    try {
        const now = new Date();
        const scheduledCampaigns = await prisma.campaign.findMany({
            where: {
                status: 'SCHEDULED',
                scheduledAt: { lte: now }
            }
        });

        if (scheduledCampaigns.length === 0) {
            return NextResponse.json({ message: "No pending scheduled campaigns" });
        }

        const results = [];

        for (const campaign of scheduledCampaigns) {
            console.log(`[Scheduler] Iniciando campaña programada: ${campaign.name}`);

            // Immediately mark as ACTIVE to prevent double-processing by next cron tick
            await prisma.campaign.update({
                where: { id: campaign.id },
                data: { status: 'ACTIVE' }
            });

            const segment: any = campaign.segment || {};

            const whereClause: any = {
                organizationId: campaign.organizationId,
                phone: { not: null },
                messages: { none: { campaignId: campaign.id } }
            };

            if (segment.excludeActive) whereClause.sequenceActive = false;
            if (segment.tags && segment.tags.length > 0) whereClause.tags = { hasSome: segment.tags };
            if (segment.statuses && segment.statuses.length > 0) whereClause.status = { in: segment.statuses };

            const leads = await prisma.lead.findMany({
                where: whereClause,
                take: campaign.batchSize,
            });

            if (leads.length === 0) {
                await prisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                });
                results.push({ campaign: campaign.name, processed: 0 });
                continue;
            }

            let successCount = 0;
            let failCount = 0;

            for (const lead of leads) {
                try {
                    const components = [
                        { type: "body", parameters: [{ type: "text", text: lead.firstName || 'amigo' }] }
                    ];

                    const providerMessageId = await sendWhatsAppTemplate(
                        campaign.organizationId,
                        lead.phone!,
                        campaign.message,
                        'es',
                        components
                    );

                    await prisma.message.create({
                        data: {
                            leadId: lead.id,
                            content: `Template: ${campaign.message}`,
                            direction: 'OUTBOUND',
                            type: 'TEMPLATE',
                            status: 'SENT',
                            waMessageId: providerMessageId?.messages?.[0]?.id || null,
                            campaignId: campaign.id
                        } as any
                    });

                    await prisma.lead.update({
                        where: { id: lead.id },
                        data: { status: 'CONTACTED', lastContactedAt: new Date() }
                    });

                    successCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    console.error(`Scheduler Error on Lead ${lead.id}:`, err);
                    await prisma.message.create({
                        data: {
                            leadId: lead.id,
                            content: `Failed Template: ${campaign.message}`,
                            direction: 'OUTBOUND',
                            type: 'TEMPLATE',
                            status: 'FAILED',
                            campaignId: campaign.id
                        } as any
                    });
                    failCount++;
                }
            }

            const updatedCampaign = await prisma.campaign.update({
                where: { id: campaign.id },
                data: {
                    sentCount: { increment: successCount + failCount },
                    status: 'ACTIVE'
                }
            });

            if (updatedCampaign.sentCount >= updatedCampaign.totalLeads) {
                await prisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                });
            }

            results.push({ campaign: campaign.name, success: successCount, fail: failCount });
        }

        // --- SEQUENCE PROCESSING V2.3 ---
        console.log(`[Scheduler] Evaluando secuencias activas...`);
        const activeSequenceLeads = await prisma.lead.findMany({
            where: {
                sequenceActive: true,
                sequenceId: { not: null },
                phone: { not: null },
                OR: [
                    { nextFollowupAt: null },
                    { nextFollowupAt: { lte: now } }
                ]
            },
            include: {
                sequence: {
                    include: { steps: true }
                }
            },
            take: 50 // process in batches of 50 per cron tick
        });

        const sequenceResults = [];

        for (const lead of activeSequenceLeads) {
            if (!lead.sequence) continue;

            const nextStepNum = lead.sequenceStep + 1;
            const currentStep = lead.sequence.steps.find(s => s.stepNumber === nextStepNum);

            if (!currentStep) {
                // Sequence completed
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { sequenceActive: false, nextFollowupAt: null }
                });
                continue;
            }

            // 24h Rule Validation
            const hoursSinceLastMessage = (lead as any).lastInboundMessageAt
                ? (now.getTime() - (lead as any).lastInboundMessageAt.getTime()) / (1000 * 60 * 60)
                : Infinity;

            const isWithin24h = hoursSinceLastMessage <= 24;
            const stepIsTemplate = (currentStep as any).isTemplate;
            let sendSuccess = false;
            let waMessageId = null;

            try {
                if (!isWithin24h && !stepIsTemplate) {
                    console.warn(`[Scheduler] Lead ${lead.phone} bloqueado por regla 24h en paso ${nextStepNum}. Requiere plantilla.`);
                    throw new Error("Meta 24h rule violation prevention: Normal text blocked.");
                }

                if (stepIsTemplate) {
                    const providerRes = await sendWhatsAppTemplate(
                        lead.organizationId,
                        lead.phone!,
                        currentStep.messageTemplate,
                        'es', // Hardcoded language for now, could be improved
                        [{ type: "body", parameters: [{ type: "text", text: lead.firstName || 'amigo' }] }]
                    );
                    waMessageId = providerRes?.messages?.[0]?.id;
                } else {
                    // Send normal text or AI generated prompt
                    const { sendWhatsAppMessage } = require('@/lib/whatsapp');
                    const providerRes = await sendWhatsAppMessage(
                        lead.organizationId,
                        lead.phone!,
                        currentStep.messageTemplate // Simplified: If useAI is true, you'd generate text here first using bookingAgent.
                    );
                    waMessageId = providerRes?.messages?.[0]?.id;
                }

                sendSuccess = true;

                await prisma.message.create({
                    data: {
                        leadId: lead.id,
                        content: `${stepIsTemplate ? 'Template' : 'Secuencia'}: ${currentStep.messageTemplate}`,
                        direction: 'OUTBOUND',
                        type: stepIsTemplate ? 'TEMPLATE' : 'TEXT',
                        status: 'SENT',
                        waMessageId: waMessageId || null,
                    }
                });

            } catch (err: any) {
                console.error(`Error procesando secuencia para Lead ${lead.id}:`, err.message);
                await prisma.message.create({
                    data: {
                        leadId: lead.id,
                        content: `Error/Bloqueo en Paso ${nextStepNum}: ${currentStep.messageTemplate}`,
                        direction: 'OUTBOUND',
                        type: 'TEXT',
                        status: 'FAILED',
                    }
                });
            }

            // Advance Step and Calculate Next Delay
            const nextNextStep = lead.sequence.steps.find(s => s.stepNumber === nextStepNum + 1);
            let newNextFollowupAt = null;
            let keepActive = false;

            if (nextNextStep) {
                keepActive = true;
                const delayDays = nextNextStep.delayDays || 0;
                const delayHours = (nextNextStep as any).delayHours || 0;
                const totalDelayMs = (delayDays * 24 * 60 * 60 * 1000) + (delayHours * 60 * 60 * 1000);
                newNextFollowupAt = new Date(now.getTime() + totalDelayMs);
            }

            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    sequenceStep: nextStepNum,
                    sequenceActive: keepActive,
                    nextFollowupAt: newNextFollowupAt,
                    lastContactedAt: sendSuccess ? now : lead.lastContactedAt
                } as any
            });

            sequenceResults.push({ lead: lead.id, step: nextStepNum, success: sendSuccess });
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }

        return NextResponse.json({ executed: true, results, sequenceResults });

    } catch (e: any) {
        console.error("Cron Scheduler Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
