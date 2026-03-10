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

        // Count matching leads for totalLeads
        const segmentFilter: any = { organizationId, phone: { not: null } };
        if (segment?.excludeActive) segmentFilter.sequenceActive = false;
        if (segment?.tags?.length) segmentFilter.tags = { hasSome: segment.tags };
        if (segment?.excludeTags?.length) segmentFilter.NOT = { tags: { hasSome: segment.excludeTags } };
        if (segment?.statuses?.length) segmentFilter.status = { in: segment.statuses };
        if (segment?.listId) segmentFilter.lists = { some: { id: segment.listId } };

        const totalLeads = await prisma.lead.count({ where: segmentFilter });

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
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
        }

        const existing = await prisma.campaign.findFirst({
            where: { id, organizationId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
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
