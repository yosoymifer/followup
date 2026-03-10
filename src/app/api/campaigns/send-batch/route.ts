import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

export async function POST(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { campaignId, batchSizeOverride } = body;

        if (!campaignId) {
            return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
        }

        // Fetch campaign details
        const campaign = await prisma.campaign.findFirst({
            where: { id: campaignId, organizationId }
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const segment: any = campaign.segment || {};

        // Build query to find leads
        const whereClause: any = {
            organizationId,
            phone: { not: null },
            // Ensure this lead hasn't received a message from this campaign yet
            messages: {
                none: {
                    campaignId
                }
            }
        };

        if (segment.excludeActive) {
            whereClause.sequenceActive = false;
        }

        if (segment.tags && segment.tags.length > 0) {
            whereClause.tags = { hasSome: segment.tags };
        }

        if (segment.excludeTags && segment.excludeTags.length > 0) {
            whereClause.NOT = { tags: { hasSome: segment.excludeTags } };
        }

        if (segment.statuses && segment.statuses.length > 0) {
            whereClause.status = { in: segment.statuses };
        }

        if (segment.listId) {
            whereClause.lists = { some: { id: segment.listId } };
        }

        const takeSize = batchSizeOverride ? parseInt(batchSizeOverride) : campaign.batchSize;
        console.log(`[Campaign ${campaign.name}] Buscando leads para batch de tamaño ${takeSize}...`);

        const leads = await prisma.lead.findMany({
            where: whereClause,
            take: takeSize,
        });

        if (leads.length === 0) {
            // No more leads to process
            if (campaign.status !== 'COMPLETED') {
                await prisma.campaign.update({
                    where: { id: campaign.id },
                    data: { status: 'COMPLETED', completedAt: new Date() }
                });
            }
            return NextResponse.json({ success: true, processed: 0, message: 'No more leads to process.' });
        }

        let successCount = 0;
        let failCount = 0;

        for (const lead of leads) {
            try {
                const components = [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: lead.firstName || 'amigo' }
                        ]
                    }
                ];

                const providerMessageId = await sendWhatsAppTemplate(
                    organizationId,
                    lead.phone!,
                    campaign.message, // Assuming campaign.message holds the template name for Template campaigns
                    'es',
                    components
                );

                // Create message record linked to this campaign
                await prisma.message.create({
                    data: {
                        leadId: lead.id,
                        content: `Template: ${campaign.message}`,
                        direction: 'OUTBOUND',
                        type: 'TEMPLATE',
                        status: 'SENT',
                        waMessageId: providerMessageId?.messages?.[0]?.id || null,
                        campaignId: campaign.id
                    }
                });

                // Update lead status
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        status: 'CONTACTED',
                        lastContactedAt: new Date(),
                    }
                });

                successCount++;

            } catch (error) {
                console.error(`Error sending template to lead ${lead.id}:`, error);

                await prisma.message.create({
                    data: {
                        leadId: lead.id,
                        content: `Failed Template: ${campaign.message}`,
                        direction: 'OUTBOUND',
                        type: 'TEMPLATE',
                        status: 'FAILED',
                        campaignId: campaign.id
                    }
                });

                failCount++;
            }

            // Rate limiting delay of 1 second between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Update campaign progress
        const updatedCampaign = await prisma.campaign.update({
            where: { id: campaign.id },
            data: {
                sentCount: { increment: successCount + failCount },
                status: 'ACTIVE'
            }
        });

        // Check if now complete
        if (updatedCampaign.sentCount >= updatedCampaign.totalLeads) {
            await prisma.campaign.update({
                where: { id: campaign.id },
                data: { status: 'COMPLETED', completedAt: new Date() }
            });
        }

        return NextResponse.json({
            success: true,
            processed: leads.length,
            successCount,
            failCount,
            campaign: updatedCampaign
        });

    } catch (error: any) {
        console.error('Error processing batch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
