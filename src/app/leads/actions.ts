"use server";

import { auth } from "@/auth";
import { importLeadsFromGHL } from "@/lib/ghl";
import { revalidatePath } from "next/cache";

export async function handleGHLImport() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return { error: "No autorizado" };
    }

    try {
        const count = await importLeadsFromGHL(organizationId);
        revalidatePath("/leads");
        revalidatePath("/");
        return { success: true, count };
    } catch (error: any) {
        return { error: error.message || "Error al importar leads" };
    }
}
