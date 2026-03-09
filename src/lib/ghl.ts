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
        const token = organization.ghlAccessToken.trim();
        const version = '2021-07-28';

        const makeRequest = async (authHeader: string) => {
            return axios.get('https://services.leadconnectorhq.com/contacts/', {
                params: {
                    locationId: organization.ghlLocationId,
                    limit: 100,
                    tags: tag ? [tag] : undefined
                },
                headers: {
                    'Authorization': authHeader,
                    'Version': version
                }
            });
        };

        let response;
        try {
            response = await makeRequest(`Bearer ${token}`);
        } catch (err: any) {
            if (token.startsWith('pit-') && err.response?.data?.message?.includes('JWT')) {
                response = await makeRequest(token);
            } else {
                throw err;
            }
        }


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

/**
 * Update a lead's pipeline stage in GHL.
 * Uses the Organization's ghlStageMap to map internal statuses to GHL stage IDs.
 */
export async function updateGHLPipelineStage(
    organizationId: string,
    lead: { id: string; ghlContactId?: string | null; ghlOpportunityId?: string | null },
    newStatus: string
) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
    });

    if (!organization?.ghlAccessToken || !organization?.ghlPipelineId || !organization?.ghlStageMap) {
        console.log('GHL pipeline sync skipped: missing config');
        return null;
    }

    const stageMap = organization.ghlStageMap as Record<string, string>;
    const targetStageId = stageMap[newStatus];

    if (!targetStageId) {
        console.log(`GHL pipeline sync skipped: no stage mapping for status "${newStatus}"`);
        return null;
    }

    if (!lead.ghlContactId) {
        console.log('GHL pipeline sync skipped: lead has no ghlContactId');
        return null;
    }

    const token = organization.ghlAccessToken.trim();
    const headers: any = {
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
    };

    const request = async (method: 'get' | 'put', url: string, data?: any, params?: any) => {
        const attempt = async (auth: string) => {
            return axios({
                method,
                url,
                data,
                params,
                headers: { ...headers, 'Authorization': auth }
            });
        };

        try {
            return await attempt(`Bearer ${token}`);
        } catch (err: any) {
            if (token.startsWith('pit-') && err.response?.data?.message?.includes('JWT')) {
                return await attempt(token);
            }
            throw err;
        }
    };

    try {
        // If lead already has an opportunity, update it
        if (lead.ghlOpportunityId) {
            const response = await request(
                'put',
                `https://services.leadconnectorhq.com/opportunities/${lead.ghlOpportunityId}`,
                { pipelineStageId: targetStageId }
            );
            return response.data;
        }

        // Otherwise search for existing opportunity by contact
        const searchResponse = await request(
            'get',
            'https://services.leadconnectorhq.com/opportunities/search',
            undefined,
            {
                location_id: organization.ghlLocationId,
                contact_id: lead.ghlContactId,
                pipeline_id: organization.ghlPipelineId,
            }
        );


        const opportunities = searchResponse.data?.opportunities || [];
        if (opportunities.length > 0) {
            const opportunityId = opportunities[0].id;

            // Save the opportunityId for future updates
            await prisma.lead.update({
                where: { id: lead.id },
                data: { ghlOpportunityId: opportunityId },
            });

            const response = await axios.put(
                `https://services.leadconnectorhq.com/opportunities/${opportunityId}`,
                {
                    pipelineStageId: targetStageId,
                },
                { headers }
            );
            return response.data;
        }

        console.log(`GHL pipeline sync: no opportunity found for contact ${lead.ghlContactId}`);
        return null;
    } catch (error: any) {
        console.error('Error updating GHL pipeline stage:', error.response?.data || error.message);
        throw error;
    }
}


/**
 * Fetch all available calendars for a location.
 */
export async function getGHLCalendars(organizationId: string) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization?.ghlAccessToken || !organization?.ghlLocationId) {
        throw new Error('Missing GHL credentials');
    }

    const token = organization.ghlAccessToken.trim();
    const headers = {
        'Version': '2021-04-15',
        'Authorization': token.startsWith('pit-') ? token : `Bearer ${token}`
    };

    try {
        const response = await axios.get('https://services.leadconnectorhq.com/calendars/', {
            params: { locationId: organization.ghlLocationId },
            headers
        });
        return response.data.calendars;
    } catch (error: any) {
        console.error('Error fetching GHL calendars:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Get available slots for a specific calendar.
 */
export async function getGHLAvailableSlots(
    organizationId: string,
    calendarId: string,
    startDate: number, // timestamp ms
    endDate: number    // timestamp ms
) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization?.ghlAccessToken) throw new Error('Missing GHL access token');

    const token = organization.ghlAccessToken.trim();
    const headers = {
        'Version': '2021-04-15',
        'Authorization': token.startsWith('pit-') ? token : `Bearer ${token}`
    };

    try {
        const response = await axios.get(`https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots`, {
            params: { startDate, endDate },
            headers
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching GHL slots:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Create an appointment in GHL.
 */
export async function createGHLAppointment(
    organizationId: string,
    options: {
        calendarId: string;
        contactId: string;
        startTime: string;
        title?: string;
    }
) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization?.ghlAccessToken) throw new Error('Missing GHL access token');

    const token = organization.ghlAccessToken.trim();
    const headers = {
        'Version': '2021-04-15',
        'Content-Type': 'application/json',
        'Authorization': token.startsWith('pit-') ? token : `Bearer ${token}`
    };

    try {
        const response = await axios.post(
            'https://services.leadconnectorhq.com/calendars/events/appointments',
            {
                calendarId: options.calendarId,
                contactId: options.contactId,
                startTime: options.startTime,
                title: options.title || 'Llamada de Seguimiento AI'
            },
            { headers }
        );
        return response.data;
    } catch (error: any) {
        console.error('Error creating GHL appointment:', error.response?.data || error.message);
        throw error;
    }
}
