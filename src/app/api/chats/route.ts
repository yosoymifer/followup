import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(req: Request) {
    const session = await auth();
    const organizationId = (session?.user as any)?.organizationId;

    if (!organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';

        // Find leads that have messages
        const leads = await prisma.lead.findMany({
            where: {
                organizationId,
                messages: { some: {} },
                ...(search ? {
                    OR: [
                        { firstName: { contains: search, mode: 'insensitive' } },
                        { lastName: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search } }
                    ]
                } : {})
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { lastContactedAt: 'desc' }, // Order by most recent interaction
            take: 50
        });

        // Format for the UI menu
        const formattedLeads = leads.map(lead => ({
            id: lead.id,
            name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.phone,
            phone: lead.phone,
            lastMessage: lead.messages[0]?.content || '',
            lastMessageAt: lead.messages[0]?.createdAt || lead.lastContactedAt,
            hasUnread: lead.messages[0]?.direction === 'INBOUND', // Simple logic for unread indicator
            tags: lead.tags,
            aiEnabled: (lead as any).aiEnabled
        }));

        // Sort by last message date
        formattedLeads.sort((a, b) => {
            const timeA = new Date(a.lastMessageAt || 0).getTime();
            const timeB = new Date(b.lastMessageAt || 0).getTime();
            return timeB - timeA;
        });

        return NextResponse.json({ leads: formattedLeads });
    } catch (error: any) {
        console.error('Error fetching chats list:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
