import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// GET: List sequences for the organization
export async function GET() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sequences = await prisma.sequence.findMany({
        where: { organizationId },
        include: {
            steps: { orderBy: { stepNumber: 'asc' } },
            _count: { select: { leads: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { defaultSequenceId: true },
    });

    return NextResponse.json({ sequences, defaultSequenceId: organization?.defaultSequenceId });
}

// POST: Create a new sequence
export async function POST(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, description, steps, isDefault } = body;

        if (!name || !steps || !steps.length) {
            return NextResponse.json({ error: 'Name and at least one step are required' }, { status: 400 });
        }

        const sequence = await prisma.sequence.create({
            data: {
                organizationId,
                name,
                description,
                steps: {
                    create: steps.map((step: any, index: number) => ({
                        stepNumber: index,
                        delayDays: step.delayDays || 0,
                        delayHours: step.delayHours || 0,
                        messageTemplate: step.messageTemplate || '',
                        useAI: step.useAI !== false,
                        isTemplate: !!step.isTemplate,
                    })),
                },
            },
            include: { steps: { orderBy: { stepNumber: 'asc' } } },
        });

        // Set as default if requested
        if (isDefault) {
            await prisma.organization.update({
                where: { id: organizationId },
                data: { defaultSequenceId: sequence.id },
            });
        }

        return NextResponse.json({ success: true, sequence });
    } catch (error: any) {
        console.error('Error creating sequence:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update an existing sequence
export async function PUT(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { id, name, description, steps, isDefault, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'Sequence ID is required' }, { status: 400 });
        }

        // Verify ownership
        const existing = await prisma.sequence.findFirst({
            where: { id, organizationId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
        }

        // Update sequence
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (isActive !== undefined) updateData.isActive = isActive;

        const sequence = await prisma.sequence.update({
            where: { id },
            data: updateData,
        });

        // Replace steps if provided
        if (steps && steps.length > 0) {
            await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } });
            await prisma.sequenceStep.createMany({
                data: steps.map((step: any, index: number) => ({
                    sequenceId: id,
                    stepNumber: index,
                    delayDays: step.delayDays || 0,
                    delayHours: step.delayHours || 0,
                    messageTemplate: step.messageTemplate || '',
                    useAI: step.useAI !== false,
                    isTemplate: !!step.isTemplate,
                })),
            });
        }

        // Set as default if requested
        if (isDefault) {
            await prisma.organization.update({
                where: { id: organizationId },
                data: { defaultSequenceId: id },
            });
        }

        const updated = await prisma.sequence.findUnique({
            where: { id },
            include: { steps: { orderBy: { stepNumber: 'asc' } } },
        });

        return NextResponse.json({ success: true, sequence: updated });
    } catch (error: any) {
        console.error('Error updating sequence:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a sequence
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
            return NextResponse.json({ error: 'Sequence ID is required' }, { status: 400 });
        }

        // Verify ownership
        const existing = await prisma.sequence.findFirst({
            where: { id, organizationId },
        });
        if (!existing) {
            return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
        }

        // Unassign leads from this sequence
        await prisma.lead.updateMany({
            where: { sequenceId: id },
            data: { sequenceId: null, sequenceActive: false, nextFollowupAt: null },
        });

        // Remove as default if it was
        await prisma.organization.updateMany({
            where: { id: organizationId, defaultSequenceId: id },
            data: { defaultSequenceId: null },
        });

        await prisma.sequence.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting sequence:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
