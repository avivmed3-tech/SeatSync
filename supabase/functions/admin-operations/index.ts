import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAIL = 'avivmed3@gmail.com'

// ── Security: triple-gate admin verification ──────────────────────────────────
// 1. Valid JWT (Supabase validates before handler runs via verify_jwt=true)
// 2. Email matches hardcoded ADMIN_EMAIL
// 3. profiles.is_admin = true in the database (cannot be self-set by authenticated users)
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized')

  // Build user-scoped client so Supabase validates the JWT
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) throw new Error('Unauthorized')

  // Gate 2: email must match exactly
  if (user.email !== ADMIN_EMAIL) throw new Error('Forbidden')

  // Gate 3: DB flag must be true — this cannot be set by the user themselves
  // (REVOKE UPDATE (is_admin) prevents authenticated role from changing it)
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Forbidden: admin flag not set')

  return { user, adminClient }
}

async function logAudit(
  adminClient: ReturnType<typeof createClient>,
  adminId: string,
  action: string,
  targetUserId: string | null,
  payload: Record<string, unknown>
) {
  await adminClient.from('admin_audit').insert({
    admin_id: adminId,
    action,
    target_user_id: targetUserId,
    payload,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user, adminClient } = await verifyAdmin(req)
    const body = await req.json()
    const { action, userId, ...params } = body

    let result: unknown

    switch (action) {

      // ── GET ALL USERS WITH STATS ─────────────────────────────────────────
      case 'get_all_users': {
        const { data: profiles, error } = await adminClient
          .from('profiles')
          .select(`
            id, full_name, phone, plan, plan_expires_at,
            call_credits, sms_credits, is_blocked, is_admin, created_at
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Fetch auth emails (service_role can list users)
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({
          perPage: 1000,
        })
        const emailMap: Record<string, string> = {}
        for (const u of (authUsers ?? [])) {
          if (u.id && u.email) emailMap[u.id] = u.email
        }

        // Aggregate stats per user in parallel
        const userIds = (profiles ?? []).map((p: { id: string }) => p.id)

        const [eventsRes, roundsRes, callsRes, purchasesRes] = await Promise.all([
          adminClient.from('events').select('user_id').in('user_id', userIds),
          adminClient.from('message_rounds').select('event_id, events!inner(user_id)'),
          adminClient.from('messages').select('event_id, channel, events!inner(user_id)').eq('channel', 'voice'),
          adminClient.from('transactions')
            .select('user_id, cost_ils')
            .like('type', 'purchase_%')
            .in('user_id', userIds),
        ])

        // Count events per user
        const eventCount: Record<string, number> = {}
        for (const e of (eventsRes.data ?? [])) {
          eventCount[e.user_id] = (eventCount[e.user_id] ?? 0) + 1
        }

        // Count message rounds per user (via event→user join)
        const roundsCount: Record<string, number> = {}
        for (const r of (roundsRes.data ?? [])) {
          const uid = (r as { events: { user_id: string } }).events?.user_id
          if (uid) roundsCount[uid] = (roundsCount[uid] ?? 0) + 1
        }

        // Count voice calls per user
        const callsCount: Record<string, number> = {}
        for (const c of (callsRes.data ?? [])) {
          const uid = (c as { events: { user_id: string } }).events?.user_id
          if (uid) callsCount[uid] = (callsCount[uid] ?? 0) + 1
        }

        // Sum purchases per user
        const purchaseTotal: Record<string, number> = {}
        for (const t of (purchasesRes.data ?? [])) {
          purchaseTotal[t.user_id] = (purchaseTotal[t.user_id] ?? 0) + Number(t.cost_ils ?? 0)
        }

        result = (profiles ?? []).map((p: Record<string, unknown>) => ({
          ...p,
          email: emailMap[p.id as string] ?? '—',
          events_count: eventCount[p.id as string] ?? 0,
          rounds_count: roundsCount[p.id as string] ?? 0,
          calls_count: callsCount[p.id as string] ?? 0,
          purchase_total_ils: purchaseTotal[p.id as string] ?? 0,
        }))
        break
      }

      // ── GET GLOBAL STATS ─────────────────────────────────────────────────
      case 'get_global_stats': {
        const [usersRes, eventsRes, messagesRes, revenueRes] = await Promise.all([
          adminClient.from('profiles').select('id', { count: 'exact', head: true }),
          adminClient.from('events').select('id', { count: 'exact', head: true }),
          adminClient.from('messages').select('id', { count: 'exact', head: true }),
          adminClient.from('transactions').select('cost_ils').like('type', 'purchase_%'),
        ])

        const totalRevenue = (revenueRes.data ?? []).reduce(
          (sum: number, t: { cost_ils: number }) => sum + Number(t.cost_ils ?? 0), 0
        )

        result = {
          total_users: usersRes.count ?? 0,
          total_events: eventsRes.count ?? 0,
          total_messages: messagesRes.count ?? 0,
          total_revenue_ils: Math.round(totalRevenue * 100) / 100,
        }
        break
      }

      // ── GET SINGLE USER STATS ────────────────────────────────────────────
      case 'get_user_stats': {
        if (!userId) throw new Error('userId required')

        const [profileRes, txRes, eventsRes, roundsRes, callsRes] = await Promise.all([
          adminClient.from('profiles').select('*').eq('id', userId).single(),
          adminClient.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
          adminClient.from('events').select('id, name, event_date, event_type').eq('user_id', userId).order('created_at', { ascending: false }),
          adminClient.from('message_rounds').select('id, round_number, channel, sent_at, total_sent').in(
            'event_id',
            (await adminClient.from('events').select('id').eq('user_id', userId)).data?.map((e: { id: string }) => e.id) ?? []
          ),
          adminClient.from('messages').select('id, channel, sent_at, status').eq('channel', 'voice').in(
            'event_id',
            (await adminClient.from('events').select('id').eq('user_id', userId)).data?.map((e: { id: string }) => e.id) ?? []
          ),
        ])

        // Fetch email from auth
        const { data: { user: authUser } } = await adminClient.auth.admin.getUserById(userId)

        result = {
          profile: { ...profileRes.data, email: authUser?.email ?? '—' },
          transactions: txRes.data ?? [],
          events: eventsRes.data ?? [],
          rounds: roundsRes.data ?? [],
          calls: callsRes.data ?? [],
        }
        break
      }

      // ── UPDATE PLAN ──────────────────────────────────────────────────────
      case 'update_user_plan': {
        if (!userId) throw new Error('userId required')
        const { plan, plan_expires_at } = params
        if (!['free', 'pro', 'enterprise'].includes(plan)) throw new Error('Invalid plan')

        const { error } = await adminClient
          .from('profiles')
          .update({ plan, plan_expires_at: plan_expires_at ?? null })
          .eq('id', userId)

        if (error) throw error

        await logAudit(adminClient, user.id, 'update_user_plan', userId, { plan, plan_expires_at })
        result = { success: true }
        break
      }

      // ── UPDATE CREDITS ───────────────────────────────────────────────────
      case 'update_credits': {
        if (!userId) throw new Error('userId required')
        const { column, delta, reason } = params
        if (!['call_credits', 'sms_credits'].includes(column)) throw new Error('Invalid column')
        const deltaNum = parseInt(delta, 10)
        if (isNaN(deltaNum)) throw new Error('delta must be a number')

        // Read current value to clamp at 0
        const { data: current } = await adminClient.from('profiles').select(column).eq('id', userId).single()
        const currentVal = (current as Record<string, number>)?.[column] ?? 0
        const newVal = Math.max(0, currentVal + deltaNum)

        const { error } = await adminClient.from('profiles').update({ [column]: newVal }).eq('id', userId)
        if (error) throw error

        // Audit transaction
        const txType = column === 'call_credits'
          ? (deltaNum >= 0 ? 'purchase_call' : 'refund_call')
          : (deltaNum >= 0 ? 'purchase_sms' : 'refund_sms')

        await adminClient.from('transactions').insert({
          user_id: userId,
          type: txType,
          amount: Math.abs(deltaNum),
          cost_ils: 0,
          notes: `admin: ${reason ?? 'manual adjustment'}`,
        })

        await logAudit(adminClient, user.id, 'update_credits', userId, { column, delta: deltaNum, newVal, reason })
        result = { success: true, new_value: newVal }
        break
      }

      // ── TOGGLE BLOCK ─────────────────────────────────────────────────────
      case 'toggle_block': {
        if (!userId) throw new Error('userId required')
        if (userId === user.id) throw new Error('Cannot block yourself')
        const { blocked } = params

        const { error } = await adminClient
          .from('profiles')
          .update({ is_blocked: !!blocked })
          .eq('id', userId)

        if (error) throw error

        await logAudit(adminClient, user.id, blocked ? 'block_user' : 'unblock_user', userId, { blocked })
        result = { success: true }
        break
      }

      // ── DELETE USER ──────────────────────────────────────────────────────
      case 'delete_user': {
        if (!userId) throw new Error('userId required')
        if (userId === user.id) throw new Error('Cannot delete yourself')

        // Log before delete (cascade removes profile row)
        await logAudit(adminClient, user.id, 'delete_user', userId, {})

        const { error } = await adminClient.auth.admin.deleteUser(userId)
        if (error) throw error

        result = { success: true }
        break
      }

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = ['Unauthorized', 'Forbidden', 'Forbidden: admin flag not set'].includes(message) ? 403 : 400

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
