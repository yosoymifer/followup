const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    // 1. Create Organization
    const organization = await prisma.organization.upsert({
        where: { id: 'pascual_prod' },
        update: {
            name: 'Pascual Producción',
            ghlAccessToken: process.env.GHL_API_KEY || null,
            ghlLocationId: process.env.GHL_LOCATION_ID || null,
            waPhoneNumberId: process.env.WA_PHONE_NUMBER_ID || null,
            waAccessToken: process.env.WA_ACCESS_TOKEN || null,
            waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || null,
        },
        create: {
            id: 'pascual_prod',
            name: 'Pascual Producción',
            ghlAccessToken: process.env.GHL_API_KEY || null,
            ghlLocationId: process.env.GHL_LOCATION_ID || null,
            waPhoneNumberId: process.env.WA_PHONE_NUMBER_ID || null,
            waAccessToken: process.env.WA_ACCESS_TOKEN || null,
            waBusinessAccountId: process.env.WA_BUSINESS_ACCOUNT_ID || null,
        },
    });

    console.log('✅ Organización:', organization.name);

    // 2. Create Admin User
    const passwordHash = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@pascual.com' },
        update: {
            name: 'Admin Pascual',
            passwordHash,
            role: 'ADMIN',
        },
        create: {
            organizationId: 'pascual_prod',
            name: 'Admin Pascual',
            email: 'admin@pascual.com',
            passwordHash,
            role: 'ADMIN',
        },
    });

    console.log('✅ Usuario admin:', adminUser.email);

    // 3. Create Default Sequence
    const sequence = await prisma.sequence.upsert({
        where: { id: 'seq_default' },
        update: { name: 'Secuencia Leads Fríos' },
        create: {
            id: 'seq_default',
            organizationId: 'pascual_prod',
            name: 'Secuencia Leads Fríos',
            description: 'Secuencia estándar para leads que no han respondido en 3+ días',
        },
    });

    // 4. Create Sequence Steps
    const steps = [
        { stepNumber: 1, delayDays: 0, messageTemplate: 'Saludo inicial personalizado', useAI: true },
        { stepNumber: 2, delayDays: 3, messageTemplate: 'Recordatorio amigable con valor', useAI: true },
        { stepNumber: 3, delayDays: 7, messageTemplate: 'Oferta especial o cierre suave', useAI: true },
    ];

    for (const step of steps) {
        await prisma.sequenceStep.upsert({
            where: { sequenceId_stepNumber: { sequenceId: 'seq_default', stepNumber: step.stepNumber } },
            update: step,
            create: { ...step, sequenceId: 'seq_default' },
        });
    }

    console.log('✅ Secuencia con', steps.length, 'pasos creada');
    console.log('\n🔐 Login: admin@pascual.com / admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
