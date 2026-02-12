import React from 'react';
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ImportButton } from "./ImportButton";
import CSVImporter from "@/components/CSVImporter";
import ClearLeadsButton from "@/components/ClearLeadsButton";
import LeadsTable from "./LeadsTable";

export default async function LeadsPage() {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;
    if (!organizationId) redirect("/login");

    // Fetch initial leads (first page, 25 items)
    const initialLeads = await prisma.lead.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
        take: 25,
        include: { _count: { select: { messages: true } } }
    });

    const totalLeads = await prisma.lead.count({ where: { organizationId } });

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Gestión de Leads</h1>
                    <p className="text-slate-400 mt-1">Importa desde CSV o sincroniza desde GHL.</p>
                </div>
                <div className="flex gap-3">
                    <ClearLeadsButton />
                    <ImportButton />
                </div>
            </div>

            {/* CSV Importer Section */}
            <CSVImporter />

            {/* Leads Table with Pagination */}
            <LeadsTable initialLeads={initialLeads} totalLeads={totalLeads} />
        </div>
    );
}
