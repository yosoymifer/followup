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
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó archivo" }, { status: 400 });
        }

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
            return NextResponse.json({ error: "El archivo está vacío o solo tiene encabezados" }, { status: 400 });
        }

        // Parse header
        const separator = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

        // Map common header variations
        const headerMap: Record<string, string> = {};
        for (const h of headers) {
            if (['nombre', 'first_name', 'firstname', 'first name', 'name'].includes(h)) headerMap['firstName'] = h;
            else if (['apellido', 'last_name', 'lastname', 'last name', 'surname'].includes(h)) headerMap['lastName'] = h;
            else if (['email', 'correo', 'e-mail', 'mail'].includes(h)) headerMap['email'] = h;
            else if (['telefono', 'teléfono', 'phone', 'celular', 'mobile', 'whatsapp', 'tel'].includes(h)) headerMap['phone'] = h;
            else if (['etiquetas', 'tags', 'etiqueta', 'tag'].includes(h)) headerMap['tags'] = h;
        }

        if (!headerMap['phone'] && !headerMap['email']) {
            return NextResponse.json({
                error: "El CSV debe tener al menos una columna de 'telefono' o 'email'. Columnas detectadas: " + headers.join(', ')
            }, { status: 400 });
        }

        // Parse rows
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(separator).map(v => v.trim().replace(/^['"]|['"]$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });

            const firstName = row[headerMap['firstName'] || ''] || null;
            const lastName = row[headerMap['lastName'] || ''] || null;
            const email = row[headerMap['email'] || ''] || null;
            let phone = row[headerMap['phone'] || ''] || null;
            const tags = row[headerMap['tags'] || ''] ? row[headerMap['tags'] || ''].split(',').map(t => t.trim()) : [];

            // Clean phone number
            if (phone) {
                phone = phone.replace(/[\s\-\(\)\.]/g, '');
                if (!phone.startsWith('+')) {
                    phone = '+' + phone;
                }
            }

            // Need at least a phone or email
            if (!phone && !email) {
                skipped++;
                continue;
            }

            try {
                if (phone) {
                    await prisma.lead.upsert({
                        where: {
                            organizationId_phone: { organizationId, phone }
                        },
                        update: {
                            firstName: firstName || undefined,
                            lastName: lastName || undefined,
                            email: email || undefined,
                            tags: { set: tags.length > 0 ? tags : undefined },
                        },
                        create: {
                            organizationId,
                            firstName,
                            lastName,
                            email,
                            phone,
                            tags,
                            status: 'NEW',
                        },
                    });
                } else {
                    await prisma.lead.create({
                        data: {
                            organizationId,
                            firstName,
                            lastName,
                            email,
                            phone,
                            tags,
                            status: 'NEW',
                        },
                    });
                }
                imported++;
            } catch (err: any) {
                if (err.code === 'P2002') {
                    skipped++;
                } else {
                    errors.push(`Fila ${i + 1}: ${err.message}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            imported,
            skipped,
            total: lines.length - 1,
            errors: errors.slice(0, 5),
        });

    } catch (error: any) {
        console.error("CSV Import Error:", error);
        return NextResponse.json({ error: error.message || "Error al procesar el archivo" }, { status: 500 });
    }
}
