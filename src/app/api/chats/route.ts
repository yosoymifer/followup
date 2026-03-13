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
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

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
            orderBy: [
                { lastInboundMessageAt: { sort: 'desc', nulls: 'last' } as any },
                { lastContactedAt: 'desc' }
            ],
            take: limit + 1, // Take one extra to check if there are more
            skip: offset
        });

        const hasMore = leads.length > limit;
        const results = hasMore ? leads.slice(0, limit) : leads;

        // Format for the UI menu
        const formattedLeads = results.map(lead => ({
            id: lead.id,
            name: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.phone,
            phone: lead.phone,
            lastMessage: lead.messages[0]?.content || '',
            lastMessageAt: lead.messages[0]?.createdAt || lead.lastInboundMessageAt,
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

        return NextResponse.json({ 
            leads: formattedLeads,
            hasMore
        });
    } catch (error: any) {
        console.error('Error fetching chats list:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
