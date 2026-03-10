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
        const lists = await prisma.list.findMany({
            where: { organizationId },
            include: {
                _count: {
                    select: { leads: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ lists });
    } catch (error: any) {
        console.error("Error fetching lists:", error);
        return NextResponse.json({ error: "Fallo al obtener listas" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, description } = body;

        if (!name?.trim()) {
            return NextResponse.json({ error: "El nombre de la lista es obligatorio" }, { status: 400 });
        }

        const list = await prisma.list.create({
            data: {
                organizationId,
                name: name.trim(),
                description: description?.trim() || null
            }
        });

        return NextResponse.json({ success: true, list });
    } catch (error: any) {
        console.error("Error creating list:", error);
        return NextResponse.json({ error: "Fallo al crear lista" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID de lista requerido" }, { status: 400 });
        }

        const existing = await prisma.list.findFirst({
            where: { id, organizationId }
        });

        if (!existing) {
            return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 });
        }

        await prisma.list.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error deleting list:", error);
        return NextResponse.json({ error: "Fallo al eliminar lista" }, { status: 500 });
    }
}
