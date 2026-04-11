import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('agent_contacts')
    .select('*')
    .eq('agent_id', id)
    .order('is_primary', { ascending: false })
    .order('type')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const { type, value, label, is_primary, source, notes } = body

  if (!type || !value) {
    return NextResponse.json({ error: 'type and value are required' }, { status: 400 })
  }

  // If marked primary, unset other primaries of same type
  if (is_primary) {
    await supabaseAdmin
      .from('agent_contacts')
      .update({ is_primary: false })
      .eq('agent_id', id)
      .eq('type', type)
  }

  // Also sync primary email back to agents.email
  if (type === 'email' && is_primary) {
    await supabaseAdmin
      .from('agents')
      .update({ email: value.trim().toLowerCase() })
      .eq('id', id)
  }

  const { data, error } = await supabaseAdmin
    .from('agent_contacts')
    .insert({ agent_id: id, type, value: value.trim(), label, is_primary: is_primary ?? false, source: source ?? 'manual', notes })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const { contact_id, ...updates } = body

  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  // Handle primary flag
  if (updates.is_primary && updates.type) {
    await supabaseAdmin
      .from('agent_contacts')
      .update({ is_primary: false })
      .eq('agent_id', id)
      .eq('type', updates.type)
  }

  const { data, error } = await supabaseAdmin
    .from('agent_contacts')
    .update(updates)
    .eq('id', contact_id)
    .eq('agent_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync primary email to agents table
  if (data.type === 'email' && data.is_primary) {
    await supabaseAdmin
      .from('agents')
      .update({ email: data.value.toLowerCase() })
      .eq('id', id)
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const contact_id = searchParams.get('contact_id')

  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('agent_contacts')
    .delete()
    .eq('id', contact_id)
    .eq('agent_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
