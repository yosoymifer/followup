import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(request: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        // Important: in standalone next.js build, we should ensure the target exists.
        // process.cwd() is /app usually.
        const path = join(process.cwd(), "public", "uploads", filename);

        await writeFile(path, buffer);

        // We use relative path for local serving
        const url = `/uploads/${filename}`;

        const media = await prisma.media.create({
            data: {
                organizationId,
                name: file.name,
                url,
                type: file.type.startsWith("video") ? "VIDEO" : "IMAGE",
            },
        });

        return NextResponse.json({ success: true, media });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message || "Error uploading file" }, { status: 500 });
    }
}
