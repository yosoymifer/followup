import prisma from '@/lib/prisma';

export async function logToFile(message: string, data?: any, type: string = 'INFO') {
    try {
        console.log(`[${type}] ${message}:`, data || '');
        
        await prisma.webhookLog.create({
            data: {
                type,
                message,
                payload: data || {}
            }
        });
    } catch (err) {
        console.error('Failed to log to database:', err);
    }
}

export async function getLogs() {
    try {
        const logs = await prisma.webhookLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        
        return logs.map((l: any) => `[${l.createdAt.toISOString()}] [${l.type}] ${l.message}\nPayload: ${JSON.stringify(l.payload, null, 2)}\n---`).join('\n\n');
    } catch (err) {
        return 'Error reading logs from database.';
    }
}

export async function clearLogs() {
    try {
        await prisma.webhookLog.deleteMany({});
        return true;
    } catch (err) {
        return false;
    }
}
