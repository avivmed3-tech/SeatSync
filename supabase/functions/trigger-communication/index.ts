import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the User making the request
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) throw new Error('Unauthorized')

    const { type, payload } = await req.json()
    // type: 'call' | 'sms'
    // payload: { phone: string, guestId: string, eventId: string, message?: string }

    if (!payload || !payload.guests || !Array.isArray(payload.guests)) {
        throw new Error('Invalid payload. Expected array of guests.')
    }

    // 1. Check user credits and permissions
    // Get profiles to check credits
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('call_credits, sms_credits')
      .eq('id', user.id)
      .single()
      
    if (profileError || !profile) throw new Error('Could not fetch user credits')

    const requiredCredits = payload.guests.length
    
    if (type === 'call' && profile.call_credits < requiredCredits) {
        throw new Error('Not enough Call Credits.')
    }
    
    if (type === 'sms' && profile.sms_credits < requiredCredits) {
        throw new Error('Not enough SMS Credits.')
    }

    // 2. We use the service_role key to update credits securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Deduct credits
    const updateColumn = type === 'call' ? 'call_credits' : 'sms_credits'
    const newCreditBalance = profile[updateColumn] - requiredCredits

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ [updateColumn]: newCreditBalance })
      .eq('id', user.id)

    if (updateError) throw new Error('Failed to deduct credits')
    
    // Log transaction
    await supabaseAdmin.from('transactions').insert({
        user_id: user.id,
        type: `usage_${type}`,
        amount: requiredCredits,
        notes: `Triggered ${requiredCredits} ${type}s`
    })

    // 3. TRIGGER VAPI OR TWILIO
    let successfulDispatches = 0;
    
    for (const guest of payload.guests) {
        if (type === 'call') {
            // Trigger VAPI
            const vapiKey = Deno.env.get('VAPI_PRIVATE_KEY')
            if (!vapiKey) console.error('VAPI_PRIVATE_KEY not set')
            
            // Example vapi payload
            const vapiRes = await fetch('https://api.vapi.ai/call/phone', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${vapiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assistantId: '32b612b7-a2bb-47b1-bbdc-c30ad7bd6315',
                    customer: { number: guest.phone },
                    phoneNumberId: '1928d9bd-dec3-4ce6-8ffb-ba617f9d711c',
                    assistantOverrides: {
                        variableValues: {
                            guest_id: guest.id,
                            eventId: guest.event_id,
                            guestName: guest.guest_name || '',
                            eventName: guest.event_name || '',
                            eventType: guest.event_type || ''
                        }
                    }
                })
            });
            if (!vapiRes.ok) {
                const errText = await vapiRes.text();
                throw new Error(`VAPI השלילי: ${errText.substring(0, 100)}`);
            }
           successfulDispatches++;
        } else if (type === 'sms') {
            // Trigger Twilio
            const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
            const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
            const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
            
            if (!accountSid || !authToken) console.error('Twilio credentials not set')
            
            /*
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
            const data = new URLSearchParams()
            data.append('To', guest.phone)
            data.append('From', twilioNumber)
            data.append('Body', payload.message || `Hi ${guest.name}, Please RSVP!`)
            
            await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: data
            })
            */
            successfulDispatches++;
        }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Dispatched ${successfulDispatches} ${type}s securely.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
