import { NextResponse } from 'next/server';
import { getLogs, clearLogs } from '@/lib/logger';
import { auth } from '@/auth';

export async function GET() {
    const session = await auth();
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const logs = getLogs();
    
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
