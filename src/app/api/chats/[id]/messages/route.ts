import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: leadId } = await params;

        // Verify lead belongs to org
        const lead = await prisma.lead.findFirst({
            where: { id: leadId, organizationId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // Delete all messages for this lead to clear context
        await prisma.message.deleteMany({
            where: { leadId }
        });

        return NextResponse.json({ success: true, message: 'Contexto borrado exitosamente.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
