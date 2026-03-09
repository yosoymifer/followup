import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const lead = await prisma.lead.findFirst({
            where: { id, organizationId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        return NextResponse.json({ lead });
    } catch (error: any) {
        console.error('Error fetching chat history:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
        }

        const lead = await prisma.lead.findFirst({
            where: { id, organizationId }
        });

        if (!lead || !lead.phone) {
            return NextResponse.json({ error: 'Lead or phone not found' }, { status: 404 });
        }

        // Send via WhatsApp
        const result = await sendWhatsAppMessage(organizationId, lead.phone, text);

        // Save to DB
        const message = await prisma.message.create({
            data: {
                leadId: lead.id,
                content: text,
                direction: 'OUTBOUND',
                type: 'TEXT',
                status: 'SENT',
                waMessageId: result?.messages?.[0]?.id || null,
                aiGenerated: false
            }
        });

        await prisma.lead.update({
            where: { id: lead.id },
            data: { lastContactedAt: new Date() }
        });

        return NextResponse.json({ success: true, message });
    } catch (error: any) {
        console.error('Error sending manual message:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { aiEnabled } = body;

        if (aiEnabled === undefined) {
            return NextResponse.json({ error: 'aiEnabled status required' }, { status: 400 });
        }

        const lead = await prisma.lead.findFirst({
            where: { id, organizationId }
        });

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        const updated = await prisma.lead.update({
            where: { id: lead.id },
            data: { aiEnabled } as any
        });

        return NextResponse.json({ success: true, aiEnabled: (updated as any).aiEnabled });
    } catch (error: any) {
        console.error('Error toggling AI:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
