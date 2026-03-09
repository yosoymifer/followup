import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import axios from 'axios';

// GET: Fetch pipelines and stages from GHL
export async function GET() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
    });

    if (!org?.ghlAccessToken || !org?.ghlLocationId) {
        return NextResponse.json({
            error: 'Configura tu Access Token y Location ID de GHL primero en la sección superior.',
        }, { status: 400 });
    }

    try {
        const token = org.ghlAccessToken.trim();
        const headers: any = {
            'Version': '2021-07-28',
        };

        // Helper to make the request
        const makeRequest = async (authHeader: string) => {
            return axios.get(
                'https://services.leadconnectorhq.com/opportunities/pipelines',
                {
                    params: { locationId: org.ghlLocationId },
                    headers: { ...headers, 'Authorization': authHeader },
                }
            );
        };

        let response;
        try {
            // First attempt with Bearer (standard)
            response = await makeRequest(`Bearer ${token}`);
        } catch (err: any) {
            // If it's a PIT token and failed with JWT error, try without Bearer
            if (token.startsWith('pit-') && err.response?.data?.message?.includes('JWT')) {
                console.log('Retrying PIT token without Bearer prefix...');
                response = await makeRequest(token);
            } else {
                throw err;
            }
        }


        const pipelines = response.data?.pipelines || [];

        // Format for easy UI consumption
        const formatted = pipelines.map((p: any) => ({
            id: p.id,
            name: p.name,
            stages: (p.stages || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                position: s.position,
            })),
        }));

        return NextResponse.json({ pipelines: formatted });
    } catch (error: any) {
        console.error('Error fetching GHL pipelines:', error.response?.data || error.message);
        const status = error.response?.status || 500;
        const msg = error.response?.data?.message || error.message;
        return NextResponse.json({ error: `Error de GHL: ${msg}` }, { status });
    }
}
