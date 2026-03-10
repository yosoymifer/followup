import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Migrating Media URLs ---');

    const medias = await prisma.media.findMany({
        where: {
            url: {
                startsWith: '/uploads/'
            }
        }
    });

    console.log(`Found ${medias.length} media records to update.`);

    for (const m of medias) {
        const filename = m.url.split('/').pop();
        const newUrl = `/api/media/files/${filename}`;

        await prisma.media.update({
            where: { id: m.id },
            data: { url: newUrl }
        });

        console.log(`Updated: ${m.name} -> ${newUrl}`);
    }

    console.log('--- Migration Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
