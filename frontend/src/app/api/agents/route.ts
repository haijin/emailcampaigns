import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page     = parseInt(searchParams.get('page')    ?? '1')
  const limit    = parseInt(searchParams.get('limit')   ?? '50')
  const search   = searchParams.get('search')   ?? ''
  const country  = searchParams.get('country')  ?? ''
  const hasEmail = searchParams.get('hasEmail') ?? ''

  const from = (page - 1) * limit
  const to   = from + limit - 1

  let query = supabaseAdmin
    .from('agents')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, to)

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (country) {
    query = query.eq('country', country)
  }
  if (hasEmail === 'true') {
    query = query.not('email', 'is', null)
  } else if (hasEmail === 'false') {
    query = query.is('email', null)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count, page, limit })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, email, ...rest } = body

  if (!id) {
    return NextResponse.json({ error: 'Agent ID required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { ...rest }
  if (email !== undefined) {
    updates.email = email?.trim().toLowerCase() || null
  }

  const { data, error } = await supabaseAdmin
    .from('agents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
