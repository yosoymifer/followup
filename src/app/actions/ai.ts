"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateFollowupMessage } from "@/lib/openai";
import { revalidatePath } from "next/cache";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function generateAIAction(leadId: string) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return { error: "No autorizado" };
    }

    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId, organizationId },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        });

        if (!lead) return { error: "Lead no encontrado" };

        const content = await generateFollowupMessage(lead as any);

        if (!content) return { error: "No se pudo generar el mensaje" };

        // Create a DRAFT message
        await prisma.message.create({
            data: {
                leadId: lead.id,
                content,
                direction: 'OUTBOUND',
                aiGenerated: true,
                status: 'DRAFT',
            }
        });

        revalidatePath("/leads");
        revalidatePath(`/leads/${leadId}`);
        revalidatePath("/");

        return { success: true, content };
    } catch (error: any) {
        console.error("Error generating AI message:", error);
        return { error: error.message || "Error al generar mensaje" };
    }
}

export async function sendAIAction(messageId: string) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return { error: "No autorizado" };
    }

    try {
        const message = await prisma.message.findUnique({
            where: { id: messageId, lead: { organizationId } },
            include: { lead: true }
        });

        if (!message || message.status !== 'DRAFT') {
            return { error: "Mensaje no válido o ya enviado" };
        }

        if (!message.lead.phone) {
            return { error: "El lead no tiene teléfono asignado" };
        }

        // Enviar a través de WhatsApp Cloud API
        const waResponse = await sendWhatsAppMessage(
            organizationId,
            message.lead.phone,
            message.content
        );

        await prisma.message.update({
            where: { id: messageId },
            data: {
                status: 'SENT',
                waMessageId: waResponse.messages?.[0]?.id
            }
        });

        revalidatePath("/leads");
        revalidatePath("/");

        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Error al enviar mensaje" };
    }
}
