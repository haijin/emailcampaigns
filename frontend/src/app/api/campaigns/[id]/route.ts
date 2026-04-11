import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  // Prevent editing campaigns that are already sending/sent
  const { data: existing } = await supabaseAdmin
    .from('campaigns')
    .select('status')
    .eq('id', id)
    .single()

  if (existing && ['sending', 'sent'].includes(existing.status) && body.html_content) {
    return NextResponse.json(
      { error: 'Cannot edit content of a campaign that is sending or sent' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('campaigns')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('campaigns')
    .select('status')
    .eq('id', id)
    .single()

  if (existing && existing.status === 'sending') {
    return NextResponse.json({ error: 'Cannot delete a campaign currently sending' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
