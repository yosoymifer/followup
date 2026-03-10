import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import axios from 'axios';

export async function POST() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId }
        });

        if (!organization?.waAccessToken || !organization?.waBusinessAccountId) {
            return NextResponse.json({ error: 'Faltan credenciales de WhatsApp Business Account ID o Access Token en Configuración.' }, { status: 400 });
        }

        // Fetch templates from Meta API
        const response = await axios.get(
            `https://graph.facebook.com/v19.0/${organization.waBusinessAccountId}/message_templates`,
            {
                headers: {
                    'Authorization': `Bearer ${organization.waAccessToken}`
                }
            }
        );

        const apiTemplates = response.data?.data || [];

        // Filter out only APPROVED templates
        const approvedTemplates = apiTemplates.filter((t: any) => t.status === 'APPROVED');

        if (approvedTemplates.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'No se encontraron plantillas aprobadas en Meta.' });
        }

        // Inside a transaction: 
        // 1. Delete all existing templates for this org
        // 2. Insert the fresh templates
        await prisma.$transaction(async (tx) => {
            await tx.template.deleteMany({
                where: { organizationId }
            });

            const templatesToInsert = approvedTemplates.map((t: any) => {
                // Determine content: usually is the text of the BODY component.
                const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
                return {
                    organizationId,
                    name: t.name,
                    content: bodyComponent?.text || '(Sin cuerpo de texto)',
                    language: t.language,
                    category: t.category || "MARKETING",
                    status: 'ACTIVE'
                };
            });

            await tx.template.createMany({
                data: templatesToInsert
            });
        });

        return NextResponse.json({
            success: true,
            count: approvedTemplates.length,
            message: `¡Se sincronizaron ${approvedTemplates.length} plantillas correctamente!`
        });

    } catch (error: any) {
        console.error('Error syncing templates:', error.response?.data || error.message);
        return NextResponse.json({ error: error.response?.data?.error?.message || error.message || 'Error al conectar con la API de Meta' }, { status: 500 });
    }
}
