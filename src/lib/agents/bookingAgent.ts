import prisma from '@/lib/prisma';
import { getGHLAvailableSlots, createGHLAppointment, getGHLCalendars } from '@/lib/ghl';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import OpenAI from 'openai';
import { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
});

export async function processLeadResponse(leadId: string, incomingMessage: string) {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { messages: { take: 10, orderBy: { createdAt: 'desc' } }, organization: true }
    });

    if (!lead) throw new Error('Lead not found');

    console.log(`[FollowUp AI] Processing incoming message from ${lead.phone}: "${incomingMessage}"`);

    if (!lead.aiEnabled) {
        console.log(`[FollowUp AI] Skipping message for lead ${lead.id} because AI is disabled.`);
        return null;
    }

    const history = lead.messages
        .reverse()
        .map(m => `${m.direction === 'INBOUND' ? 'Lead' : 'Tú'}: ${m.content}`)
        .join('\n');

    const masterContext = lead.organization.masterPrompt
        ? `\nCONTEXTO GENERAL DEL NEGOCIO:\n${lead.organization.masterPrompt}\n`
        : '';

    // System prompt tailored for booking via link
    const systemPrompt = `
Eres un asistente de ventas de élite y setter para un programa de formación de alto nivel en inversión inmobiliaria.
Tu objetivo principal es conversar con los leads, cualificarlos brevemente y guiarlos persuasivamente hacia agendar una "llamada de asesoría gratuita" en este enlace: https://semanainmobiliaria.com/agendar-llamada
${masterContext}
CONTEXTO DEL LEAD:
- Lead: ${lead.firstName} ${lead.lastName || ''}
- Etiquetas: ${lead.tags.join(', ')}
- Historial de conversación:
${history}

REGLAS DE ORO:
1. Sé persuasivo pero extremadamente profesional, empático y natural.
2. Construye valor sobre la "asesoría gratuita" para el programa de formación.
3. El enlace oficial para agendar la llamada es: https://semanainmobiliaria.com/agendar-llamada
4. NUNCA inventes precios. Si el lead pregunta por precios, dile que los detalles profundos y opciones de financiación se ven exactamente en la llamada de asesoría gratuita diseñada para su caso particular.
5. NO des el enlace de grabación a menos que el lead diga expresamente que no pudo terminar de ver las clases gratuitas: https://semanainmobiliaria.com/grabacion
6. Mantén tus respuestas breves, amigables y conversacionales (máximo 3 frases).
`;

    console.log(`[FollowUp AI] Calling OpenAI for lead ${lead.id}...`);
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: incomingMessage }
        ]
    });

    const aiMessage = response.choices[0].message;
    const content = aiMessage.content || "Entendido. ¿Deseas agendar una llamada en https://semanainmobiliaria.com/agendar-llamada ?";

    console.log(`[FollowUp AI] AI Response generated for ${lead.phone}: "${content.substring(0, 50)}..."`);

    // Save outbound message to DB
    await prisma.message.create({
        data: {
            leadId: lead.id,
            content: content,
            direction: 'OUTBOUND',
            aiGenerated: true,
            status: 'SENT'
        }
    });

    // Send via WhatsApp
    console.log(`[FollowUp AI] Sending response to WhatsApp for ${lead.phone}`);
    try {
        await sendWhatsAppMessage(lead.organizationId, lead.phone!, content);
        console.log(`[FollowUp AI] Successfully sent to WhatsApp for ${lead.phone}`);
    } catch (sendError) {
        console.error(`[FollowUp AI] Failed to send WhatsApp message for ${lead.phone}:`, sendError);
    }

    return content;
}
