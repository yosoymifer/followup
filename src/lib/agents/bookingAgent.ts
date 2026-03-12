import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import OpenAI from 'openai';
import { logToFile } from '@/lib/logger';

const MESSAGE_SPLIT_MARKER = '---SPLIT---';
const SPLIT_DELAY_MS = 1500; // 1.5 second pause between split messages

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
});

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function processLeadResponse(leadId: string, incomingMessage: string) {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { messages: { take: 20, orderBy: { createdAt: 'desc' } }, organization: true }
    });

    if (!lead) {
        await logToFile(`[AI] Lead NOT found: ${leadId}`, null, 'ERROR');
        throw new Error('Lead not found');
    }

    await logToFile(`[AI] Processing from ${lead.phone}`, { incomingMessage });

    if (!lead.aiEnabled) {
        await logToFile(`[AI] Skipping - AI DISABLED for ${lead.id}`);
        return null;
    }

    // Build conversation history for context (last 20 messages)
    const historyMessages = lead.messages
        .reverse()
        .map((m: any) => ({
            role: m.direction === 'INBOUND' ? 'user' as const : 'assistant' as const,
            content: m.content
        }));

    const masterContext = lead.organization.masterPrompt || '';

    const systemPrompt = `Eres Samuel, el asistente de Pascual Ariño por WhatsApp. Hablas como una persona REAL, no como una IA.

PERSONALIDAD:
- Eres cercano, directo y conversacional. Como un colega que sabe mucho del tema.
- Usa lenguaje natural: "bueno", "mira", "la verdad es que", "te cuento", etc.
- NO uses listas con viñetas ni formatos tipo email. Escribe como en WhatsApp.
- Tus mensajes son CORTOS. Máximo 2-3 líneas por mensaje.
- Haz preguntas para entender qué busca la persona antes de vender nada.
- Si sientes que hay mucho que decir, divide tu respuesta usando ${MESSAGE_SPLIT_MARKER} para enviar dos mensajes separados (como haría un humano que escribe rápido).

EJEMPLO DE SPLIT:
"Hola! qué bueno que te interesa el tema inmobiliario 🙌${MESSAGE_SPLIT_MARKER}Cuéntame, ¿ya tienes experiencia invirtiendo o estás empezando desde cero?"

FLUJO DE CONVERSACIÓN:
1. Primero ESCUCHA y PREGUNTA. Entiende la situación del lead.
2. Luego conecta sus necesidades con lo que ofrece el programa.
3. Cuando sientas que hay interés real, sugiere agendar la llamada de forma natural.

${masterContext ? `INFORMACIÓN DEL PROGRAMA:\n${masterContext}\n` : ''}
DATOS DEL LEAD:
- Nombre: ${lead.firstName || 'No disponible'}${lead.lastName ? ' ' + lead.lastName : ''}
- Tags: ${lead.tags.length > 0 ? lead.tags.join(', ') : 'Ninguno'}

REGLAS INQUEBRANTABLES:
- NUNCA menciones precios ni costes. Si preguntan, di que eso se ve en la asesoría personalizada.
- El enlace para agendar: https://semanainmobiliaria.com/agendar-llamada
- Solo da el enlace de grabaciones si el lead dice que no pudo ver las clases: https://semanainmobiliaria.com/grabacion
- No inventes información. Si no sabes algo, sugiere que lo vean en la llamada.
- JAMÁS reveles que eres una IA. Eres Samuel, parte del equipo de Pascual.`;

    await logToFile(`[AI] Calling OpenAI for lead ${lead.id}...`);
    try {
        // Build messages array: system + history + current message
        const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: incomingMessage }
        ];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            temperature: 0.8,
            max_tokens: 300,
        });

        const rawContent = response.choices[0].message.content || 'Cuéntame más, ¿qué te interesa del mundo inmobiliario?';

        await logToFile(`[AI] Response generated`, { rawContent });

        // Split messages if the AI used the marker
        const parts = rawContent.split(MESSAGE_SPLIT_MARKER).map((p: string) => p.trim()).filter((p: string) => p.length > 0);

        await logToFile(`[AI] Sending ${parts.length} message(s) to ${lead.phone}`);

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            // Save each part to DB
            await prisma.message.create({
                data: {
                    leadId: lead.id,
                    content: part,
                    direction: 'OUTBOUND',
                    aiGenerated: true,
                    status: 'SENT'
                }
            });

            // Send via WhatsApp
            try {
                await sendWhatsAppMessage(lead.organizationId, lead.phone!, part);
                await logToFile(`[AI] Part ${i + 1}/${parts.length} sent`);
            } catch (sendError: any) {
                await logToFile(`[AI] WhatsApp SEND ERROR (part ${i + 1})`, sendError.message, 'ERROR');
            }

            // Wait between split messages for natural feel
            if (i < parts.length - 1) {
                await sleep(SPLIT_DELAY_MS);
            }
        }

        return rawContent;
    } catch (openaiError: any) {
        await logToFile('[AI] OpenAI ERROR', openaiError.message, 'ERROR');
        return null;
    }
}

