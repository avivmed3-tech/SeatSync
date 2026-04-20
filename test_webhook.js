const payload = {
    message: {
        type: 'end-of-call-report',
        call: {
            assistantOverrides: {
                variableValues: {
                    guest_id: '1234',
                    eventId: '5678'
                }
            },
            endedReason: 'customer-ended'
        },
        analysis: {
            summary: "Test summary",
            extractedValues: {
                status: "confirmed",
                confirmed_guests: 2
            }
        }
    }
};

fetch('https://xryfxjtvqdeijijgiwmb.supabase.co/functions/v1/vapi-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
