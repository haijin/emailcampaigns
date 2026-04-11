import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page')  ?? '1')
  const limit  = parseInt(searchParams.get('limit') ?? '20')
  const status = searchParams.get('status') ?? ''

  const from = (page - 1) * limit
  const to   = from + limit - 1

  let query = supabaseAdmin
    .from('campaigns')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    name, subject, html_content, text_content,
    from_name, from_email, reply_to,
    filter_country, filter_int_access,
  } = body

  if (!name || !subject || !html_content || !from_name || !from_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Count matching recipients
  let agentQuery = supabaseAdmin
    .from('agents')
    .select('id, name, email', { count: 'exact' })
    .not('email', 'is', null)
    .eq('is_active', true)

  if (filter_country)    agentQuery = agentQuery.eq('country', filter_country)
  if (filter_int_access) agentQuery = agentQuery.eq('int_access', filter_int_access)

  const { data: agents, count: recipientCount, error: agentErr } = await agentQuery

  if (agentErr) return NextResponse.json({ error: agentErr.message }, { status: 500 })

  // Create campaign
  const { data: campaign, error: campaignErr } = await supabaseAdmin
    .from('campaigns')
    .insert({
      name, subject, html_content, text_content,
      from_name, from_email, reply_to,
      filter_country, filter_int_access,
      status: 'draft',
      total_recipients: recipientCount ?? 0,
    })
    .select()
    .single()

  if (campaignErr) return NextResponse.json({ error: campaignErr.message }, { status: 500 })

  // Insert recipient rows
  if (agents && agents.length > 0) {
    const recipients = agents
      .filter((a) => a.email)
      .map((a) => ({
        campaign_id: campaign.id,
        agent_id:    a.id,
        email:       a.email,
        name:        a.name,
        status:      'pending',
      }))

    const CHUNK = 500
    for (let i = 0; i < recipients.length; i += CHUNK) {
      await supabaseAdmin.from('campaign_recipients').insert(recipients.slice(i, i + CHUNK))
    }
  }

  return NextResponse.json({ data: campaign }, { status: 201 })
}
