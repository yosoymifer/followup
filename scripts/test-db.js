const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
    .then(() => {
        console.log('Successfully connected to the database.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    });
