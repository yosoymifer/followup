import axios from 'axios';
import prisma from './prisma';

export async function sendWhatsAppMessage(organizationId: string, to: string, message: string) {
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    });

    if (!organization || !organization.waAccessToken || !organization.waPhoneNumberId) {
        throw new Error('Faltan credenciales de WhatsApp para esta organización');
    }

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v18.0/${organization.waPhoneNumberId}/messages`,
            {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: to.replace(/\D/g, ''), // Ensure clean phone number
                type: "text",
                text: { body: message }
            },
            {
                headers: {
                    'Authorization': `Bearer ${organization.waAccessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    } catch (error: any) {
        console.error('WhatsApp API Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || 'Error al enviar mensaje de WhatsApp');
    }
}
