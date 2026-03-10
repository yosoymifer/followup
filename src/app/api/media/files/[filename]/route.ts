import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params;
    const path = join(process.cwd(), "public", "uploads", filename);
    console.log(`[Media] Serving request for: ${filename} at ${path}`);

    if (!existsSync(path)) {
        console.error(`[Media] File NOT FOUND on disk: ${path}`);
        return new NextResponse("File not found", { status: 404 });
    }

    try {
        const file = await readFile(path);

        // Determine content type without external dependencies
        const ext = filename.split(".").pop()?.toLowerCase();
        let contentType = "application/octet-stream";
        if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
        else if (ext === "png") contentType = "image/png";
        else if (ext === "gif") contentType = "image/gif";
        else if (ext === "webp") contentType = "image/webp";
        else if (ext === "svg") contentType = "image/svg+xml";

        return new NextResponse(file, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        return new NextResponse("Error reading file", { status: 500 });
    }
}
