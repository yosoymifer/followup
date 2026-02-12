import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generateFollowupMessage(lead: any, context?: string) {
    const history = (lead.messages || [])
        .map((m: any) => `${m.direction === 'INBOUND' ? 'Lead' : 'Tú'}: ${m.content}`)
        .join('\n');

    const prompt = `
Eres un asistente de ventas experto y amigable para una agencia de servicios digitales. 
Tu objetivo es reactivar a un lead que lleva 3 días sin responder en Go High Level.

DATOS DEL LEAD:
- Nombre: ${lead.firstName} ${lead.lastName || ''}
- Etiquetas: ${lead.tags.join(', ')}
- Email: ${lead.email || 'No proporcionado'}

HISTORIAL DE CONVERSACIÓN:
${history || 'No hay mensajes previos.'}

${context ? `CONTEXTO ADICIONAL:\n${context}` : ''}

REGLAS:
1. Sé breve y natural (máximo 2-3 frases).
2. Usa un tono cálido, no presiones, demuestra interés genuino en ayudar.
3. NO uses saludos genéricos como "Estimado/a". Usa "Hola ${lead.firstName}".
4. Menciona algo relevante basado en sus etiquetas (ej: si tiene 'SEO', habla de mejorar su presencia en Google).
5. Termina con una pregunta abierta suave para fomentar la respuesta.
6. Responde SOLO con el contenido del mensaje, sin comillas ni explicaciones.

GENERA EL MENSAJE DE WHATSAPP:`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Eres un redactor de mensajes de ventas altamente personalizado y empático." },
            { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 250,
    });

    return response.choices[0].message.content?.trim();
}

export default openai;
