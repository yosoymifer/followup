import { NextResponse } from 'next/server';
import { getLogs, clearLogs, logToFile } from '@/lib/logger';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Force a log entry to verify the system is working
    await logToFile('Admin Log Viewer accessed', { user: session.user?.email }, 'HEARTBEAT');

    const logs = await getLogs();
    
    // Return logs as plain text for easy reading
    return new NextResponse(logs, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}

export async function DELETE() {
    const session = await auth();
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    clearLogs();
    return NextResponse.json({ success: true, message: 'Logs cleared' });
}
