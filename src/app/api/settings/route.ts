import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// GET: Fetch current organization settings
export async function GET() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
            id: true,
            name: true,
            ghlAccessToken: true,
            ghlLocationId: true,
            ghlPipelineId: true,
            ghlStageMap: true,
            waPhoneNumberId: true,
            waAccessToken: true,
            defaultSequenceId: true,
            masterPrompt: true,
        },
    });

    if (!org) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Mask sensitive tokens
    return NextResponse.json({
        ...org,
        ghlAccessToken: org.ghlAccessToken ? '•••••' + org.ghlAccessToken.slice(-6) : null,
        waAccessToken: org.waAccessToken ? '•••••' + org.waAccessToken.slice(-6) : null,
    });
}

// PUT: Update organization settings
export async function PUT(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const allowedFields = [
            'name', 'ghlAccessToken', 'ghlLocationId', 'ghlPipelineId',
            'ghlStageMap', 'waPhoneNumberId', 'waAccessToken', 'defaultSequenceId',
            'masterPrompt'
        ];

        const updateData: any = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined && body[field] !== '') {
                updateData[field] = body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
        }

        const updated = await prisma.organization.update({
            where: { id: organizationId },
            data: updateData,
        });

        return NextResponse.json({ success: true, organization: { id: updated.id, name: updated.name } });
    } catch (error: any) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
