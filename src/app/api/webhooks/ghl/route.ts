import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // GHL sends lead data in the body
        // Typical fields: contact_id, first_name, last_name, email, phone, tags
        const { contact_id, first_name, last_name, email, phone, tags, location_id } = body;

        if (!phone) {
            return NextResponse.json({ error: 'No phone number provided' }, { status: 400 });
        }

        // 1. Find the organization by location_id (once we have multiple clients)
        // For now, we'll assume a default organization or find by location_id
        const organization = await prisma.organization.findFirst({
            where: { ghlLocationId: location_id }
        });

        if (!organization) {
            console.warn(`Organization for location ${location_id} not found`);
            // You might want to create one or return error
        }

        const orgId = organization?.id || 'default_org_id';

        // 2. Create or Update Lead in our DB
        const lead = await prisma.lead.upsert({
            where: {
                organizationId_phone: {
                    organizationId: orgId,
                    phone: phone
                }
            },
            update: {
                firstName: first_name,
                lastName: last_name,
                email: email,
                ghlContactId: contact_id,
                tags: { set: tags || [] },
            },
            create: {
                organizationId: organization?.id || 'default_org_id', // Replace with real logic
                phone: phone,
                firstName: first_name,
                lastName: last_name,
                email: email,
                ghlContactId: contact_id,
                tags: tags || [],
                status: 'NEW',
            },
        });

        console.log(`Lead ${lead.phone} updated/created via GHL Webhook`);

        return NextResponse.json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error('Error in GHL Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
