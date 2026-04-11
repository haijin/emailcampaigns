import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page')   ?? '1')
  const limit  = parseInt(searchParams.get('limit')  ?? '50')
  const status = searchParams.get('status') ?? ''

  const from = (page - 1) * limit
  const to   = from + limit - 1

  let query = supabaseAdmin
    .from('campaign_recipients')
    .select('*', { count: 'exact' })
    .eq('campaign_id', id)
    .order('created_at', { ascending: true })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, page, limit })
}

// Called by Python service to update individual recipient status
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const updates: Array<{ id: string; status: string; sent_at?: string; error_message?: string; message_id?: string }> =
    await req.json()

  for (const u of updates) {
    await supabaseAdmin
      .from('campaign_recipients')
      .update({
        status:        u.status,
        sent_at:       u.sent_at,
        error_message: u.error_message,
        message_id:    u.message_id,
      })
      .eq('id', u.id)
  }

  // Refresh campaign counts
  const { data: counts } = await supabaseAdmin
    .from('campaign_recipients')
    .select('status')
    .eq('campaign_id', id)

  if (counts) {
    const sent   = counts.filter((r) => r.status === 'sent').length
    const failed = counts.filter((r) => r.status === 'failed' || r.status === 'bounced').length
    const total  = counts.length
    const allDone = counts.every((r) => r.status !== 'pending' && r.status !== 'sending')

    await supabaseAdmin
      .from('campaigns')
      .update({
        sent_count:   sent,
        failed_count: failed,
        ...(allDone ? { status: 'sent', completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', id)
  }

  return NextResponse.json({ success: true })
}
