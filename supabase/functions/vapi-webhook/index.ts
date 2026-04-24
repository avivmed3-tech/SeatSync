import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()

    const vapiWebhookSecret = Deno.env.get('VAPI_WEBHOOK_SECRET')
    const signature = req.headers.get('x-vapi-secret')
    if (!vapiWebhookSecret) {
      console.warn('VAPI_WEBHOOK_SECRET not configured — dev mode')
    } else if (signature !== vapiWebhookSecret) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const message = payload.message
    if (!message) return new Response('OK', { status: 200 })

    console.log('[vapi-webhook] type:', message.type)

    const HANDLED_TYPES = ['end-of-call-report', 'function-call', 'tool-calls']
    if (!HANDLED_TYPES.includes(message.type)) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const call = message.call || payload.call || {}
    const meta = call.metadata || {}
    const vars = call.assistantOverrides?.variableValues || {}

    const metaGuestId = meta.guestId || meta.guest_id || vars.guestId || vars.guest_id
    const eventId = meta.eventId || meta.event_id || vars.eventId || vars.event_id

    // Extract RSVP data from tool-calls (modern VAPI) or function-call (legacy) or end-of-call structuredData
    let extractedData: Record<string, unknown> | null = null
    let toolCallId: string | null = null

    if (message.type === 'tool-calls') {
      // Modern VAPI: toolCallList array
      const toolCall = (message.toolCallList?.[0] || message.toolCalls?.[0])
      if (toolCall) {
        toolCallId = toolCall.id
        try {
          const args = toolCall.function?.arguments
          extractedData = typeof args === 'string' ? JSON.parse(args) : args
        } catch {
          console.error('[vapi-webhook] Failed to parse tool-call arguments')
        }
      }
    } else if (message.type === 'function-call') {
      extractedData = message.functionCall?.parameters || null
    } else if (message.type === 'end-of-call-report') {
      extractedData = message.analysis?.structuredData || message.analysis?.extractedValues || null
    }

    const toolGuestId = extractedData?.guest_id || extractedData?.guestId
    const guestId = toolGuestId || metaGuestId

    console.log('[vapi-webhook] guestId:', guestId, '| eventId:', eventId, '| extractedData:', JSON.stringify(extractedData))

    if (!guestId) {
      console.error('[vapi-webhook] No guestId found anywhere in payload')
      // For tool-calls we must still return a valid response so VAPI doesn't hang
      if (message.type === 'tool-calls' && toolCallId) {
        return new Response(JSON.stringify({ results: [{ toolCallId, result: 'error: no guestId' }] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      return new Response('No guestId found', { status: 200 })
    }

    // Update guest for tool-calls / function-call / end-of-call-report with structuredData
    if (extractedData && (message.type === 'tool-calls' || message.type === 'function-call' || message.type === 'end-of-call-report')) {
      const statusStr =
        (extractedData.status as string) ||
        (extractedData.is_attending === true ? 'confirmed' :
         extractedData.is_attending === false ? 'declined' : null)

      const guestCount = (extractedData.confirmed_guests as number) ?? (extractedData.guest_count as number) ?? 0
      const dietaryNotes = (extractedData.dietary_notes as string) || null

      const validStatuses = ['confirmed', 'declined', 'maybe', 'pending']
      const safeStatus = validStatuses.includes(statusStr as string) ? (statusStr as string) : null

      if (safeStatus) {
        // For end-of-call-report, only update if guest is still pending (tool-call may have already run)
        const shouldUpdate = message.type !== 'end-of-call-report'
          ? true
          : safeStatus !== 'pending' // only overwrite if we have a real answer

        if (shouldUpdate) {
          const { error: updateError, count } = await supabaseAdmin
            .from('guests')
            .update({
              status: safeStatus,
              confirmed_guests: safeStatus === 'declined' ? 0 : guestCount,
              dietary_notes: dietaryNotes,
              notes: 'Updated via AI call.',
              updated_at: new Date().toISOString(),
            })
            .eq('id', guestId)
            .select('id', { count: 'exact', head: true })

          if (updateError) {
            console.error('[vapi-webhook] Guest update error:', updateError)
          } else {
            console.log('[vapi-webhook] Guest updated. rows affected:', count, '| status:', safeStatus, '| guests:', guestCount)
          }
        }
      } else {
        console.warn('[vapi-webhook] Invalid/missing status from extracted data:', statusStr)
      }
    }

    // For tool-calls: return required VAPI response format
    if (message.type === 'tool-calls' && toolCallId) {
      return new Response(JSON.stringify({ results: [{ toolCallId, result: 'RSVP recorded successfully' }] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Insert message log after end-of-call-report
    if (message.type === 'end-of-call-report' && eventId && guestId) {
      const { data: guestRow } = await supabaseAdmin
        .from('guests')
        .select('status, confirmed_guests')
        .eq('id', guestId)
        .single()

      console.log('[vapi-webhook] end-of-call guestRow:', JSON.stringify(guestRow))

      const realStatus = guestRow?.status ?? 'unknown'
      const realCount = guestRow?.confirmed_guests ?? 0

      const { error: insertError } = await supabaseAdmin.from('messages').insert({
        event_id: eventId,
        guest_id: guestId,
        channel: 'voice',
        message_text: `Status: ${realStatus}, Guests: ${realCount}`,
        reply_text: message.analysis?.summary || message.artifact?.transcript || 'No transcript',
        status: 'replied',
      })

      if (insertError) {
        console.error('[vapi-webhook] messages insert error:', insertError)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[vapi-webhook] Unhandled error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
