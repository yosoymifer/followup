import axios from 'axios';

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/whatsapp'; // Update if running on different port

async function testWebhooks() {
    console.log('--- Testing Text Message ---');
    await sendMockWebhook({
        type: 'text',
        text: { body: 'Hola, quiero info' }
    });

    console.log('\n--- Testing Quick Reply Button ---');
    await sendMockWebhook({
        type: 'button',
        button: { text: 'Agendar Llamada', payload: 'SCHED_CALL' }
    });

    console.log('\n--- Testing Interactive Button Reply ---');
    await sendMockWebhook({
        type: 'interactive',
        interactive: {
            type: 'button_reply',
            button_reply: { id: 'btn_1', title: 'Sí, me interesa' }
        }
    });

    console.log('\n--- Testing Interactive List Reply ---');
    await sendMockWebhook({
        type: 'interactive',
        interactive: {
            type: 'list_reply',
            list_reply: { id: 'list_1', title: 'Opción A' }
        }
    });
}

async function sendMockWebhook(message: any) {
    const payload = {
        object: 'whatsapp_business_account',
        entry: [{
            id: '12345',
            changes: [{
                value: {
                    messaging_product: 'whatsapp',
                    metadata: { display_phone_number: '12345', phone_number_id: '67890' },
                    contacts: [{ profile: { name: 'Test User' }, wa_id: '123456789' }],
                    messages: [{
                        from: '123456789',
                        id: `wamid.${Math.random().toString(36).substring(7)}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        ...message
                    }]
                },
                field: 'messages'
            }]
        }]
    };

    try {
        const response = await axios.post(WEBHOOK_URL, payload);
        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
    } catch (error: any) {
        console.error('Error sending webhook:', error.response?.data || error.message);
    }
}

testWebhooks();
