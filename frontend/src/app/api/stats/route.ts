import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const [
    { count: totalAgents },
    { count: agentsWithEmail },
    { count: totalCampaigns },
    { count: draftCampaigns },
    { count: sentCampaigns },
    { data: sentStats },
  ] = await Promise.all([
    supabaseAdmin.from('agents').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agents').select('*', { count: 'exact', head: true }).not('email', 'is', null),
    supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabaseAdmin.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabaseAdmin.from('campaigns').select('sent_count, failed_count').in('status', ['sent', 'sending']),
  ])

  const totalEmailsSent   = sentStats?.reduce((s, c) => s + (c.sent_count   ?? 0), 0) ?? 0
  const totalEmailsFailed = sentStats?.reduce((s, c) => s + (c.failed_count ?? 0), 0) ?? 0

  return NextResponse.json({
    totalAgents:      totalAgents   ?? 0,
    agentsWithEmail:  agentsWithEmail ?? 0,
    totalCampaigns:   totalCampaigns ?? 0,
    draftCampaigns:   draftCampaigns ?? 0,
    sentCampaigns:    sentCampaigns  ?? 0,
    totalEmailsSent,
    totalEmailsFailed,
  })
}
