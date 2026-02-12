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
        // Delete all messages first (foreign key constraint)
        const deletedMessages = await prisma.message.deleteMany({
            where: {
                lead: { organizationId }
            }
        });

        // Delete all leads
        const deletedLeads = await prisma.lead.deleteMany({
            where: { organizationId }
        });

        return NextResponse.json({
            success: true,
            deletedLeads: deletedLeads.count,
            deletedMessages: deletedMessages.count,
        });

    } catch (error: any) {
        console.error("Clear leads error:", error);
        return NextResponse.json({ error: error.message || "Error al limpiar datos" }, { status: 500 });
    }
}
