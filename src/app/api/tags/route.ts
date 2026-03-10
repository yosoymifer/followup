import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const leads = await prisma.lead.findMany({
            where: { organizationId },
            select: { tags: true }
        });

        const uniqueTags = Array.from(new Set(leads.flatMap(l => l.tags))).filter(Boolean).sort();

        return NextResponse.json({ tags: uniqueTags });
    } catch (error: any) {
        console.error("Error fetching tags:", error);
        return NextResponse.json({ error: "Fallo al obtener tags" }, { status: 500 });
    }
}
