import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { SearchedContact, ContactType } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DEFAULT_SEARCH_PROMPT = `You are a research assistant helping find contact information for a travel agency.

Find all available contact details for the agency below.
Return ONLY a valid JSON array — no markdown, no explanation:
[
  {
    "type": "email|phone|website|linkedin|facebook|twitter|address|other",
    "value": "the actual contact value",
    "label": "short descriptive label",
    "confidence": "high|medium|low",
    "source_url": "URL where found (optional)"
  }
]
Do not invent or guess contact details. Return [] if nothing found.`

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const { skill_id } = body

  // Load agent
  const { data: agent, error } = await supabaseAdmin
    .from('agents').select('*').eq('id', id).single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  // Load skill (use provided, fall back to default, then built-in prompt)
  let systemPrompt = DEFAULT_SEARCH_PROMPT
  let skillName = 'Built-in'

  if (skill_id) {
    const { data: skill } = await supabaseAdmin.from('skills').select('*').eq('id', skill_id).single()
    if (skill) { systemPrompt = skill.instructions; skillName = skill.name }
  } else {
    const { data: skill } = await supabaseAdmin.from('skills')
      .select('*').eq('type', 'contact_search').eq('is_default', true).single()
    if (skill) { systemPrompt = skill.instructions; skillName = skill.name }
  }

  const agentDescription = [
    `Company/Agency name: ${agent.name}`,
    agent.code        ? `Code: ${agent.code}`    : null,
    agent.city        ? `City: ${agent.city}`    : null,
    agent.country     ? `Country: ${agent.country}` : null,
    agent.address1    ? `Address: ${[agent.address1, agent.address2, agent.address3].filter(Boolean).join(', ')}` : null,
    agent.postal_code ? `Postal code: ${agent.postal_code}` : null,
  ].filter(Boolean).join('\n')

  const userPrompt = `Find contact information for this travel agency:\n\n${agentDescription}`

  try {
    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof client.messages.create>[0]['tools'],
      messages:   [{ role: 'user', content: userPrompt }],
    })

    let rawJson = ''
    for (const block of response.content) {
      if (block.type === 'text') rawJson += block.text
    }

    const jsonMatch = rawJson.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ contacts: [], message: 'No contacts found', skill_name: skillName })

    const contacts: SearchedContact[] = JSON.parse(jsonMatch[0])
    const VALID_TYPES: ContactType[] = ['email', 'phone', 'website', 'linkedin', 'facebook', 'twitter', 'address', 'other']

    const sanitised = contacts
      .filter((c) => c.value && VALID_TYPES.includes(c.type))
      .map((c) => ({
        type:       c.type,
        value:      c.value.trim(),
        label:      c.label || '',
        confidence: c.confidence || 'medium',
        source_url: c.source_url,
      }))

    // Increment skill usage
    if (skill_id) {
      const { data: sk } = await supabaseAdmin.from('skills').select('usage_count').eq('id', skill_id).single()
      if (sk) await supabaseAdmin.from('skills').update({ usage_count: (sk.usage_count ?? 0) + 1 }).eq('id', skill_id)
    }

    return NextResponse.json({ contacts: sanitised, agentName: agent.name, skill_name: skillName })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
