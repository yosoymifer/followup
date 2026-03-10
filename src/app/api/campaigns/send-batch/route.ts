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

        if (segment.targetType === 'TEST_NUMBERS') {
            if (segment.testLeadIds && segment.testLeadIds.length > 0) {
                whereClause.id = { in: segment.testLeadIds };
            } else {
                whereClause.id = { in: [] }; // match nothing
            }
        } else {
            if (segment.excludeActive) {
                whereClause.sequenceActive = false;
            }

            // Apply targetType strictly
            if (segment.targetType === 'TAGS' && segment.tags && segment.tags.length > 0) {
                whereClause.tags = { hasSome: segment.tags };
            } else if (segment.targetType === 'LIST' && segment.listId) {
                whereClause.lists = { some: { id: segment.listId } };
            }
            // If ALL, no positive filters added

            // Exclusions always apply
            if (segment.excludeTags && segment.excludeTags.length > 0) {
                whereClause.NOT = { tags: { hasSome: segment.excludeTags } };
            }

            if (segment.statuses && segment.statuses.length > 0) {
                whereClause.status = { in: segment.statuses };
            }
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

        // Find template language and parameters count if possible
        let templateLanguage = 'es';
        let paramCount = 0;
        let requiresImageHeader = false;

        const matchedTemplate = await prisma.template.findFirst({
            where: {
                organizationId,
                name: campaign.message
            }
        }) as any;

        if (matchedTemplate) {
            if (matchedTemplate.language) {
                templateLanguage = matchedTemplate.language;
            }
            if (matchedTemplate.content) {
                const matchParams = matchedTemplate.content.match(/\{\{\d+\}\}/g);
                if (matchParams) {
                    paramCount = new Set(matchParams).size;
                }
            }
            if (matchedTemplate.components) {
                const comps = matchedTemplate.components as any[];
                const headerComp = comps.find((c: any) => c.type === 'HEADER');
                if (headerComp && headerComp.format === 'IMAGE') {
                    requiresImageHeader = true;
                }
            }
        }

        for (const lead of leads) {
            try {
                let componentsList = [];

                if (requiresImageHeader) {
                    componentsList.push({
                        type: "header",
                        parameters: [
                            {
                                type: "image",
                                image: {
                                    link: (() => {
                                        let url = (campaign.segment as any)?.headerImageUrl || "https://placehold.co/600x400/png";
                                        if (url.startsWith("/")) {
                                            // Handle relative paths for local uploads
                                            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:80";
                                            url = `${baseUrl}${url}`;
                                        }
                                        return url;
                                    })()
                                }
                            }
                        ]
                    });
                }

                if (paramCount > 0) {
                    const parameters = [];
                    for (let i = 0; i < paramCount; i++) {
                        if (i === 0) {
                            parameters.push({ type: "text", text: lead.firstName || 'amigo' });
                        } else {
                            parameters.push({ type: "text", text: 'info' }); // fallback for additional variables
                        }
                    }
                    componentsList.push({
                        type: "body",
                        parameters
                    });
                }

                const finalComponents = componentsList.length > 0 ? componentsList : undefined;

                const providerMessageId = await sendWhatsAppTemplate(
                    organizationId,
                    lead.phone!,
                    campaign.message, // Assuming campaign.message holds the template name for Template campaigns
                    templateLanguage,
                    finalComponents
                );

                // Create message record linked to this campaign
                await prisma.message.create({
                    data: {
                        leadId: lead.id,
                        content: `Template: ${campaign.message}`,
                        direction: 'OUTBOUND',
                        type: 'TEMPLATE',
                        status: 'SENT',
                        waMessageId: (providerMessageId as any)?.messages?.[0]?.id || null,
                        campaignId: campaign.id
                    } as any
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
                    } as any
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
