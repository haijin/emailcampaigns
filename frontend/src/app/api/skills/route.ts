import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? ''

  let query = supabaseAdmin
    .from('skills')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name')

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, name, description, instructions, config, is_active, is_default } = body

  if (!type || !name || !instructions) {
    return NextResponse.json({ error: 'type, name and instructions are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('skills')
    .insert({ type, name, description, instructions, config: config ?? {}, is_active: is_active ?? true, is_default: is_default ?? false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
