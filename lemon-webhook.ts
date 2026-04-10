// =====================================================
// SeatSync — Lemon Squeezy Webhook Handler
// Supabase Edge Function: lemon-webhook
// =====================================================
// 
// הוראות:
// 1. ב-Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor
// 2. שם הפונקציה: lemon-webhook
// 3. העתק את כל הקוד הזה לתוך העורך
// 4. לחץ Deploy
// 5. חשוב! בהגדרות הפונקציה → כבה "Enforce JWT Verification" (כי Lemon Squeezy לא שולח JWT)
//
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

// Verify Lemon Squeezy webhook signature (HMAC SHA-256)
async function verifySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-signature') || ''
    const webhookSecret = Deno.env.get('LEMON_WEBHOOK_SECRET')

    // 1. Verify signature
    if (webhookSecret) {
      const valid = await verifySignature(rawBody, signature, webhookSecret)
      if (!valid) {
        console.error('❌ Invalid webhook signature')
        return new Response('Invalid signature', { status: 401, headers: corsHeaders })
      }
    }

    const payload = JSON.parse(rawBody)
    const eventName = payload.meta?.event_name

    console.log(`📨 Webhook received: ${eventName}`)

    // 2. Only process successful orders
    if (eventName !== 'order_created') {
      return new Response(JSON.stringify({ received: true, event: eventName }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 3. Extract data
    const customData = payload.meta?.custom_data || {}
    const userId = customData.user_id
    const orderData = payload.data?.attributes || {}
    const status = orderData.status // 'paid', 'pending', 'refunded', etc.

    // Find product name from first order item
    const firstItem = orderData.first_order_item || {}
    const productName = firstItem.product_name || ''
    const variantName = firstItem.variant_name || ''

    console.log(`👤 User: ${userId}`)
    console.log(`📦 Product: ${productName} (${variantName})`)
    console.log(`💰 Status: ${status}`)

    // Only process paid orders
    if (status !== 'paid') {
      console.log(`⏭️ Skipping non-paid order (status: ${status})`)
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (!userId) {
      console.error('❌ No user_id in custom_data — cannot update plan')
      // Still return 200 so Lemon Squeezy doesn't retry
      return new Response(JSON.stringify({ received: true, error: 'missing user_id' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 4. Determine plan based on product name
    let plan = 'pro' // default
    const nameLower = (productName + ' ' + variantName).toLowerCase()
    if (nameLower.includes('enterprise')) {
      plan = 'enterprise'
    }

    // 5. Update user profile in Supabase (using service role key — bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase
      .from('profiles')
      .update({
        plan: plan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ DB update error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    console.log(`✅ User ${userId} upgraded to ${plan}`)

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      plan: plan,
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (err) {
    console.error('❌ Webhook processing error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
