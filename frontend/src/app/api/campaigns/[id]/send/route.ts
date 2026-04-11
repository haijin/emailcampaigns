import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Get campaign
  const { data: campaign, error: campErr } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (campErr || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (!['approved', 'paused'].includes(campaign.status)) {
    return NextResponse.json(
      { error: `Campaign must be in "approved" or "paused" status to send (current: ${campaign.status})` },
      { status: 400 }
    )
  }

  // Get pending recipients
  const { data: recipients, error: recErr } = await supabaseAdmin
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', id)
    .eq('status', 'pending')
    .limit(1000)

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

  if (!recipients || recipients.length === 0) {
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sent', completed_at: new Date().toISOString() })
      .eq('id', id)
    return NextResponse.json({ message: 'No pending recipients - campaign marked as sent' })
  }

  // Mark campaign as sending
  await supabaseAdmin
    .from('campaigns')
    .update({ status: 'sending', started_at: new Date().toISOString() })
    .eq('id', id)

  const emailServiceUrl = process.env.EMAIL_SERVICE_URL ?? 'http://localhost:8000'

  // Fire-and-forget to Python email service
  const payload = {
    campaign_id:  campaign.id,
    from_name:    campaign.from_name,
    from_email:   campaign.from_email,
    reply_to:     campaign.reply_to,
    subject:      campaign.subject,
    html_content: campaign.html_content,
    text_content: campaign.text_content,
    recipients:   recipients.map((r) => ({
      id:    r.id,
      email: r.email,
      name:  r.name ?? '',
    })),
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/campaigns/${id}/status`,
  }

  // Trigger email sending (non-blocking)
  fetch(`${emailServiceUrl}/send`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  }).catch((err) => {
    console.error('Email service call failed:', err)
  })

  return NextResponse.json({
    success:    true,
    message:    `Sending initiated for ${recipients.length} recipients`,
    recipients: recipients.length,
  })
}

// PATCH /api/campaigns/[id]/send  - pause / cancel
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action } = await req.json()

  const statusMap: Record<string, string> = {
    pause:    'paused',
    cancel:   'cancelled',
    approve:  'approved',
    review:   'review',
  }

  const newStatus = statusMap[action]
  if (!newStatus) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
