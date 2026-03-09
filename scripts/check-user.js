const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verificando base de datos ---');
    const users = await prisma.user.findMany({
        include: { organization: true }
    });

    if (users.length === 0) {
        console.log('❌ No hay usuarios en la base de datos.');
    } else {
        console.log(`✅ Se encontraron ${users.length} usuarios:`);
        users.forEach(u => {
            console.log(` - Email: ${u.email}`);
            console.log(` - Org: ${u.organization.name} (ID: ${u.organizationId})`);
            console.log(` - Hash: ${u.passwordHash.substring(0, 10)}...`);
        });
    }
}

main()
    .catch(e => console.error('❌ Error:', e))
    .finally(() => prisma.$disconnect());
