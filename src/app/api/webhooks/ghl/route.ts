import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const { contact_id, first_name, last_name, email, phone, tags, location_id, opportunity_id } = body;

        if (!phone) {
            return NextResponse.json({ error: 'No phone number provided' }, { status: 400 });
        }

        // Find the organization by location_id
        const organization = await prisma.organization.findFirst({
            where: { ghlLocationId: location_id }
        });

        if (!organization) {
            console.warn(`Organization for location ${location_id} not found`);
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Create or Update Lead in our DB
        const lead = await prisma.lead.upsert({
            where: {
                organizationId_phone: {
                    organizationId: organization.id,
                    phone: phone
                }
            },
            update: {
                firstName: first_name,
                lastName: last_name,
                email: email,
                ghlContactId: contact_id,
                ghlOpportunityId: opportunity_id || undefined,
                tags: { set: tags || [] },
            },
            create: {
                organizationId: organization.id,
                phone: phone,
                firstName: first_name,
                lastName: last_name,
                email: email,
                ghlContactId: contact_id,
                ghlOpportunityId: opportunity_id || null,
                tags: tags || [],
                status: 'NEW',
            },
        });

        // Auto-enroll in default sequence if lead is new (no sequence assigned)
        if (!lead.sequenceId && organization.defaultSequenceId) {
            const defaultSequence = await prisma.sequence.findUnique({
                where: { id: organization.defaultSequenceId },
                include: { steps: { orderBy: { stepNumber: 'asc' }, take: 1 } },
            });

            if (defaultSequence && defaultSequence.isActive) {
                const firstStep = defaultSequence.steps[0];
                const nextFollowupAt = new Date();
                if (firstStep) {
                    nextFollowupAt.setDate(nextFollowupAt.getDate() + firstStep.delayDays);
                }

                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        sequenceId: defaultSequence.id,
                        sequenceStep: 0,
                        sequenceActive: true,
                        nextFollowupAt,
                    },
                });
            }
        }

        console.log(`Lead ${lead.phone} updated/created via GHL Webhook (auto-enrolled: ${!lead.sequenceId && !!organization.defaultSequenceId})`);

        return NextResponse.json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error('Error in GHL Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
