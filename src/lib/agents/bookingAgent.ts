import prisma from '@/lib/prisma';
import { getGHLAvailableSlots, createGHLAppointment, getGHLCalendars } from '@/lib/ghl';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import OpenAI from 'openai';
import { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function processLeadResponse(leadId: string, incomingMessage: string) {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { messages: { take: 10, orderBy: { createdAt: 'desc' } }, organization: true }
    });

    if (!lead) throw new Error('Lead not found');

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

    // System prompt tailored for booking
    const systemPrompt = `
Eres un asistente de ventas de élite y setter para un programa de formación de alto nivel.
Tu objetivo principal es conversar con los leads del reciente lanzamiento, cualificarlos brevemente y guiarlos persuasivamente hacia agendar una "llamada de asesoría gratuita sobre nuestro programa de formación" en el calendario experto (Go High Level).
${masterContext}
CONTEXTO DEL LEAD:
- Lead: ${lead.firstName} ${lead.lastName || ''}
- Etiquetas: ${lead.tags.join(', ')}
- Historial de conversación:
${history}

REGLAS DE ORO:
1. Sé persuasivo pero extremadamente profesional, empático y natural.
2. Construye valor sobre la "asesoría gratuita" para el programa de formación.
3. Si el lead muestra interés, ofrécele revisar espacios en la agenda para la asesoría.
4. Tienes herramientas para ver disponibilidad y agendar la cita. No inventes horarios.
5. Mantén tus respuestas breves, amigables y conversacionales (máximo 3 frases).
6. Si el lead pregunta algo técnico o de precios, responde basándote en el CONTEXTO GENERAL. Si no tienes la información, indica que esos detalles profundos se ven exactamente en la llamada de asesoría gratuita diseñada para su caso particular.

HERRAMIENTAS DISPONIBLES:
- Consultar disponibilidad: Proporciona fechas y horas libres.
- Agendar cita: Una vez el lead confirma una hora exacta para la asesoría.
`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: incomingMessage }
        ],
        tools: [
            {
                type: "function",
                function: {
                    name: "check_availability",
                    description: "Consulta los huecos libres en el calendario para una fecha.",
                    parameters: {
                        type: "object",
                        properties: {
                            date: { type: "string", description: "Fecha en formato YYYY-MM-DD" }
                        },
                        required: ["date"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "book_appointment",
                    description: "Agenda la cita en el calendario una vez el lead confirma hora.",
                    parameters: {
                        type: "object",
                        properties: {
                            startTime: { type: "string", description: "ISO 8601 timestamp de inicio" }
                        },
                        required: ["startTime"]
                    }
                }
            }
        ],
        tool_choice: "auto",
    });

    const aiMessage = response.choices[0].message;

    if (aiMessage.tool_calls) {
        for (const toolCall of aiMessage.tool_calls as ChatCompletionMessageToolCall[]) {
            const args = JSON.parse(toolCall.function.arguments);

            if (toolCall.function.name === 'check_availability') {
                const calendars = await getGHLCalendars(lead.organizationId);
                const calendarId = lead.organization.defaultSequenceId || calendars[0]?.id;

                const start = new Date(args.date).getTime();
                const end = start + (24 * 60 * 60 * 1000);
                const slots = await getGHLAvailableSlots(lead.organizationId, calendarId, start, end);

                return `Tengo estos horarios disponibles para el ${args.date}: ${Object.keys(slots).slice(0, 3).join(', ')}. ¿Te cuadra alguno?`;
            }

            if (toolCall.function.name === 'book_appointment') {
                const calendars = await getGHLCalendars(lead.organizationId);
                const calendarId = calendars[0]?.id;

                await createGHLAppointment(lead.organizationId, {
                    calendarId,
                    contactId: lead.ghlContactId!,
                    startTime: args.startTime
                });

                // Auto-disable AI since the goal was achieved
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: { aiEnabled: false }
                });

                return `¡Listo! He agendado nuestra llamada para el ${new Date(args.startTime).toLocaleString()}. Te llegará una confirmación por email.`;
            }
        }
    }

    const content = aiMessage.content || "Entendido. ¿Deseas agendar una llamada?";

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
    await sendWhatsAppMessage(lead.organizationId, lead.phone!, content);

    return content;
}
