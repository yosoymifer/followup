const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

console.log('Script iniciado...');

async function sendWhatsAppTemplate(organizationId, to, templateName, languageCode = 'en_US') {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization || !organization.waAccessToken || !organization.waPhoneNumberId) {
        throw new Error('Faltan credenciales de WhatsApp para esta organización');
    }

    console.log(`Enviando plantilla "${templateName}" a ${to}...`);

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${organization.waPhoneNumberId}/messages`,
            {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: to.replace(/\D/g, ''),
                type: "template",
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    }
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${organization.waAccessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Éxito:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Error de WhatsApp:', error.response?.data || error.message);
        throw error;
    }
}

// Ejecución
const phone = process.argv[2]; // Capturar el teléfono del comando: node test-hello.js 5411...

if (!phone) {
    console.error('Por favor, indica un número de teléfono: node scripts/test-hello.js 123456789');
    process.exit(1);
}

sendWhatsAppTemplate('pascual_prod', phone, 'hello_world')
    .then(() => {
        console.log('Finalizado correctamente.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error fatal:', err.message);
        process.exit(1);
    });
