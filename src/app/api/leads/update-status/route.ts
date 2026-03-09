import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateGHLPipelineStage } from '@/lib/ghl';

export async function POST(req: Request) {
    // Authenticate via API secret
    const apiSecret = req.headers.get('x-api-secret');
    if (apiSecret !== process.env.API_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { phone, status, leadId } = body;

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const validStatuses = ['IN_CONVERSATION', 'ESCALATED', 'RESPONDED', 'WON', 'LOST', 'STOPPED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}` }, { status: 400 });
        }

        // Find lead by ID or by phone
        let lead;
        if (leadId) {
            lead = await prisma.lead.findUnique({ where: { id: leadId } });
        } else if (phone) {
            lead = await prisma.lead.findFirst({ where: { phone } });
        }

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Update lead status and pause sequence if needed
        const shouldPause = ['IN_CONVERSATION', 'ESCALATED', 'WON', 'LOST', 'STOPPED'].includes(status);

        const updated = await prisma.lead.update({
            where: { id: lead.id },
            data: {
                status,
                sequenceActive: shouldPause ? false : lead.sequenceActive,
                nextFollowupAt: shouldPause ? null : lead.nextFollowupAt,
            },
        });

        // Sync to GHL pipeline
        if (lead.ghlContactId) {
            try {
                await updateGHLPipelineStage(lead.organizationId, lead, status);
            } catch (ghlErr) {
                console.warn(`GHL pipeline sync failed for lead ${lead.id}:`, ghlErr);
            }
        }

        return NextResponse.json({
            success: true,
            lead: {
                id: updated.id,
                status: updated.status,
                sequenceActive: updated.sequenceActive,
            },
        });
    } catch (error: any) {
        console.error('Error in update-status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
