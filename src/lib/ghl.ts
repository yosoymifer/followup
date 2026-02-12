import axios from 'axios';
import prisma from './prisma';

export async function importLeadsFromGHL(organizationId: string, tag?: string) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization || !organization.ghlAccessToken || !organization.ghlLocationId) {
        throw new Error('Faltan credenciales de GHL para esta organización');
    }

    try {
        const response = await axios.get('https://services.leadconnectorhq.com/contacts/', {
            params: {
                locationId: organization.ghlLocationId,
                limit: 100, // Still 100 per page, pagination for 1,500 needs a loop
                tags: tag ? [tag] : undefined // Optional tag filter
            },
            headers: {
                'Authorization': `Bearer ${organization.ghlAccessToken}`,
                'Version': '2021-07-28'
            }
        });

        const contacts = response.data.contacts;
        let importedCount = 0;

        for (const contact of contacts) {
            if (!contact.phone) continue;

            await prisma.lead.upsert({
                where: {
                    organizationId_phone: {
                        organizationId,
                        phone: contact.phone
                    }
                },
                update: {
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    email: contact.email,
                    ghlContactId: contact.id,
                    tags: { set: contact.tags || [] },
                },
                create: {
                    organizationId,
                    phone: contact.phone,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    email: contact.email,
                    ghlContactId: contact.id,
                    tags: contact.tags || [],
                    status: 'NEW',
                },
            });
            importedCount++;
        }

        return importedCount;
    } catch (error) {
        console.error('Error importing leads from GHL:', error);
        throw error;
    }
}
