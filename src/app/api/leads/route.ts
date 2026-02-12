import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '25');
    const skip = (page - 1) * pageSize;

    try {
        const leads = await prisma.lead.findMany({
            where: { organizationId },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: pageSize,
            include: { _count: { select: { messages: true } } }
        });

        return NextResponse.json({ leads });
    } catch (error: any) {
        console.error("Error fetching leads:", error);
        return NextResponse.json({ error: error.message || "Error al obtener leads" }, { status: 500 });
    }
}
