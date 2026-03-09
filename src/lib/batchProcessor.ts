import prisma from '@/lib/prisma';
import { sendWhatsAppTemplate } from '@/lib/whatsapp';

/**
 * Executes a batch of follow-up messages using a WhatsApp template.
 * Designed to handle a high volume of leads (e.g., 4000) in chunks.
 */
export async function launchBatchFollowup(options: {
    organizationId: string;
    templateName: string;
    languageCode?: string;
    batchSize: number;
    delayMs?: number;
}) {
    console.log(`🚀 Inciando lote de seguimiento para organizacion: ${options.organizationId}`);

    // Get leads that are NEW and have sequence active
    const leads = await prisma.lead.findMany({
        where: {
            organizationId: options.organizationId,
            status: 'NEW',
            sequenceActive: true,
            phone: { not: null }
        },
        take: options.batchSize,
    });

    console.log(`Found ${leads.length} leads to process.`);

    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
        try {
            // Meta Template usually accepts parameters. 
            // Here we send the First Name as {{1}}
            const components = [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: lead.firstName || 'amigo' }
                    ]
                }
            ];

            await sendWhatsAppTemplate(
                options.organizationId,
                lead.phone!,
                options.templateName,
                options.languageCode || 'es',
                components
            );

            // Update lead status so they don't get messaged again in the next batch
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                    status: 'CONTACTED',
                    lastContactedAt: new Date(),
                    sequenceStep: 1
                }
            });

            successCount++;

            // Rate limiting delay
            if (options.delayMs) {
                await new Promise(resolve => setTimeout(resolve, options.delayMs));
            }

        } catch (error) {
            console.error(`Failed to send message to lead ${lead.id}:`, error);
            failCount++;
        }
    }

    console.log(`Batch complete. Success: ${successCount}, Fail: ${failCount}`);

    return { successCount, failCount };
}
