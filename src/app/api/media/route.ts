import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const media = await prisma.media.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ success: true, media });
    } catch (error) {
        console.error("Fetch media error:", error);
        return NextResponse.json({ error: "Error fetching media" }, { status: 500 });
    }
}
