import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// GET: List campaigns for the organization
export async function GET() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
}

// POST: Create a new campaign
export async function POST(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, message, useAI, batchSize, segment, scheduledAt } = body;

        if (!name || !message) {
            return NextResponse.json({ error: 'Name and message are required' }, { status: 400 });
        }

        // Pre-process TEST_NUMBERS
        if (segment?.targetType === 'TEST_NUMBERS' && segment.testNumbers?.length > 0) {
            const rawNumbers: string[] = segment.testNumbers.map((n: string) => n.replace(/\D/g, '')).filter(Boolean);
            const uniqueNumbers = [...new Set(rawNumbers)] as string[];

            const testLeadIds = [];
            for (const phone of uniqueNumbers) {
                let lead = await prisma.lead.findFirst({
                    where: { organizationId, phone }
                });
                if (!lead) {
                    lead = await prisma.lead.create({
                        data: {
                            organizationId,
                            phone,
                            firstName: 'Número',
                            lastName: 'de Prueba',
                            tags: ['TEST_LEAD'],
                        }
                    });
                }
                testLeadIds.push(lead.id);
            }
            segment.testLeadIds = testLeadIds;
        }

        // Count matching leads for totalLeads
        let totalLeads = 0;
        const segmentFilter: any = { organizationId, phone: { not: null } };

        if (segment?.targetType === 'TEST_NUMBERS') {
            totalLeads = segment.testLeadIds?.length || 0;
        } else {
            if (segment?.excludeActive) segmentFilter.sequenceActive = false;

            // Apply targetType logic strictly
            if (segment?.targetType === 'TAGS' && segment?.tags?.length) {
                segmentFilter.tags = { hasSome: segment.tags };
            } else if (segment?.targetType === 'LIST' && segment?.listId) {
                segmentFilter.lists = { some: { id: segment.listId } };
            }
            // If ALL, no extra positive filtering is added

            // Exclusions apply to all modes
            if (segment?.excludeTags?.length) segmentFilter.NOT = { tags: { hasSome: segment.excludeTags } };
            if (segment?.statuses?.length) segmentFilter.status = { in: segment.statuses };

            totalLeads = await prisma.lead.count({ where: segmentFilter });
        }

        const campaign = await prisma.campaign.create({
            data: {
                organizationId,
                name,
                message,
                useAI: useAI || false,
                batchSize: batchSize || 50,
                segment: segment || {},
                totalLeads,
                status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            },
        });

        return NextResponse.json({ success: true, campaign });
    } catch (error: any) {
        console.error('Error creating campaign:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update campaign status  
export async function PUT(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, status, action } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const existing = await prisma.campaign.findFirst({
            where: { id, organizationId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Handle resend action: reset counters and reactivate
        if (action === 'resend') {
            // Recalculate total leads
            const segment = existing.segment as any;
            let totalLeads = 0;

            if (segment?.targetType === 'TEST_NUMBERS') {
                totalLeads = segment.testLeadIds?.length || 0;
            } else {
                const segmentFilter: any = { organizationId, phone: { not: null } };
                if (segment?.excludeActive) segmentFilter.sequenceActive = false;
                if (segment?.targetType === 'TAGS' && segment?.tags?.length) {
                    segmentFilter.tags = { hasSome: segment.tags };
                } else if (segment?.targetType === 'LIST' && segment?.listId) {
                    segmentFilter.lists = { some: { id: segment.listId } };
                }
                if (segment?.excludeTags?.length) segmentFilter.NOT = { tags: { hasSome: segment.excludeTags } };
                totalLeads = await prisma.lead.count({ where: segmentFilter });
            }

            // Unlink old messages from this campaign so leads become eligible again
            await prisma.message.updateMany({
                where: { campaignId: id },
                data: { campaignId: null } as any,
            });

            const updated = await prisma.campaign.update({
                where: { id },
                data: { status: 'ACTIVE', sentCount: 0, totalLeads, completedAt: null },
            });
            return NextResponse.json({ success: true, campaign: updated });
        }

        // Normal status update
        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const updated = await prisma.campaign.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json({ success: true, campaign: updated });
    } catch (error: any) {
        console.error('Error updating campaign:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a campaign
export async function DELETE(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
        }

        const existing = await prisma.campaign.findFirst({
            where: { id, organizationId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        await prisma.campaign.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting campaign:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
