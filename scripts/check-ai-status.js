import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const messages = await prisma.message.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { lead: true }
    });

    console.log('--- Ultimos 10 Mensajes ---');
    messages.forEach(m => {
        console.log(`[${m.createdAt.toISOString()}] ${m.direction} | ${m.lead.phone} | ${m.content.substring(0, 50)} | Status: ${m.status}`);
    });

    const disabledLeads = await prisma.lead.findMany({
        where: { aiEnabled: false },
        take: 5
    });

    console.log('\n--- Leads con IA Desactivada ---');
    disabledLeads.forEach(l => {
        console.log(`Lead: ${l.phone} | Status: ${l.status}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
