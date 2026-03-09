import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: leadId } = await params;
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { tags } = body;

        if (!Array.isArray(tags)) {
            return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
        }

        // Verify the lead belongs to the org
        const existingLead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId }
        });

        if (!existingLead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: { tags },
        });

        return NextResponse.json({ success: true, lead: updatedLead });
    } catch (error: any) {
        console.error('Error updating tags:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
