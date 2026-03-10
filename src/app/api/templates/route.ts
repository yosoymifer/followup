import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const templates = await prisma.template.findMany({
            where: {
                organizationId,
                status: 'ACTIVE'
            },
            orderBy: {
                name: 'asc'
            }
        });

        // If no templates exist, inject some defaults for testing/setup
        if (templates.length === 0) {
            const defaultTemplates = await prisma.$transaction([
                prisma.template.create({
                    data: {
                        organizationId,
                        name: 'hello_world',
                        content: 'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.',
                        category: 'UTILITY',
                        language: 'en_US'
                    }
                }),
                prisma.template.create({
                    data: {
                        organizationId,
                        name: 'seguimiento_contacto',
                        content: 'Hola {{1}}, vimos que hace un tiempo conversaste con nosotros. ¿Aún estás buscando mejorar tus resultados? Responde SÍ para retomar la conversación.',
                        category: 'MARKETING',
                        language: 'es'
                    }
                })
            ]);
            return NextResponse.json({ templates: defaultTemplates });
        }

        return NextResponse.json({ templates });
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
