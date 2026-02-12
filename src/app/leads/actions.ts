"use server";

import { auth } from "@/auth";
import { importLeadsFromGHL } from "@/lib/ghl";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function handleGHLImport(tag?: string) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return { error: "No autorizado" };
    }

    try {
        const count = await importLeadsFromGHL(organizationId, tag);
        revalidatePath("/leads");
        revalidatePath("/");
        return { success: true, count };
    } catch (error: any) {
        return { error: error.message || "Error al importar leads" };
    }
}

export async function sendManualMessage(leadId: string, content: string) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return { error: "No autorizado" };
    }

    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId, organizationId },
        });

        if (!lead) return { error: "Lead no encontrado" };
        if (!lead.phone) return { error: "El lead no tiene teléfono" };

        // Send via WhatsApp
        const waResponse = await sendWhatsAppMessage(organizationId, lead.phone, content);

        // Save message
        await prisma.message.create({
            data: {
                leadId: lead.id,
                content,
                direction: 'OUTBOUND',
                aiGenerated: false,
                status: 'SENT',
                waMessageId: waResponse.messages?.[0]?.id,
            }
        });

        // Update lead tracking
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                lastContactedAt: new Date(),
                status: lead.status === 'NEW' ? 'CONTACTED' : lead.status,
            }
        });

        revalidatePath("/leads");
        revalidatePath("/");

        return { success: true };
    } catch (error: any) {
        console.error("Error sending manual message:", error);
        return { error: error.message || "Error al enviar mensaje" };
    }
}
