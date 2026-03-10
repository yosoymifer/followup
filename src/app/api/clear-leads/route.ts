import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const { listId } = body;

        let deletedMessagesCount = 0;
        let deletedLeadsCount = 0;

        if (listId) {
            // Check if list belongs to organization
            const list = await prisma.list.findFirst({
                where: { id: listId, organizationId }
            });

            if (!list) {
                return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
            }

            // Delete messages for leads in this list
            const deletedMessages = await prisma.message.deleteMany({
                where: {
                    lead: {
                        lists: { some: { id: listId } }
                    }
                }
            });
            deletedMessagesCount = deletedMessages.count;

            // Delete leads in this list
            const deletedLeads = await prisma.lead.deleteMany({
                where: {
                    lists: { some: { id: listId } }
                }
            });
            deletedLeadsCount = deletedLeads.count;

            // Delete the list itself
            await prisma.list.delete({ where: { id: listId } });

        } else {
            // Delete all messages first (foreign key constraint)
            const deletedMessages = await prisma.message.deleteMany({
                where: {
                    lead: { organizationId }
                }
            });
            deletedMessagesCount = deletedMessages.count;

            // Delete all leads
            const deletedLeads = await prisma.lead.deleteMany({
                where: { organizationId }
            });
            deletedLeadsCount = deletedLeads.count;
        }

        return NextResponse.json({
            success: true,
            deletedLeads: deletedLeadsCount,
            deletedMessages: deletedMessagesCount,
        });

    } catch (error: any) {
        console.error("Clear leads error:", error);
        return NextResponse.json({ error: error.message || "Error al limpiar datos" }, { status: 500 });
    }
}
