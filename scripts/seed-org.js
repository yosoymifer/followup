const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const organization = await prisma.organization.upsert({
        where: { id: 'pascual_prod' },
        update: {
            name: 'Pascual Producción',
            ghlAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImNxeEZQem5xNUhLUEdCek93UnZDIiwidmVyc2lvbiI6MSwiaWF0IjoxNzYxMDc5MzQxMzg1LCJzdWIiOiJVRnNUTmc0d0hyNVBHcHY1Z2NZZCJ9.zp_TZnk31H9cGxvY85TC4_lzfchmniLwOVkuzaGHd9w',
            ghlLocationId: 'cqxFPznq5HKPGBzOwRvC',
            waPhoneNumberId: '968503396348147',
            waAccessToken: 'EAAWKREIcVqwBQhIS3o6LXVUUIyRXuJTihV9kiGRx2gZBfZBZA3g5ZBr4Um6TpW4GPUP2XIpmafAZCraWaCD7C3PyESUKMPK6hGQBcXBP3BewKvtshIvy7dNfJ3qU4Ay3gmqkRsTyAMxoF19vqSp5suZBG7VZBZB9TzpQmDQZCjTbHdOjxtNWRWLttYVZCiwXEOJgZDZD',
        },
        create: {
            id: 'pascual_prod',
            name: 'Pascual Producción',
            ghlAccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImNxeEZQem5xNUhLUEdCek93UnZDIiwidmVyc2lvbiI6MSwiaWF0IjoxNzYxMDc5MzQxMzg1LCJzdWIiOiJVRnNUTmc0d0hyNVBHcHY1Z2NZZCJ9.zp_TZnk31H9cGxvY85TC4_lzfchmniLwOVkuzaGHd9w',
            ghlLocationId: 'cqxFPznq5HKPGBzOwRvC',
            waPhoneNumberId: '968503396348147',
            waAccessToken: 'EAAWKREIcVqwBQhIS3o6LXVUUIyRXuJTihV9kiGRx2gZBfZBZA3g5ZBr4Um6TpW4GPUP2XIpmafAZCraWaCD7C3PyESUKMPK6hGQBcXBP3BewKvtshIvy7dNfJ3qU4Ay3gmqkRsTyAMxoF19vqSp5suZBG7VZBZB9TzpQmDQZCjTbHdOjxtNWRWLttYVZCiwXEOJgZDZD',
        },
    });

    console.log('Organización creada/actualizada:', organization.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
