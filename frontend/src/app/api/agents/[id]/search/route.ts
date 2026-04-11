import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { SearchedContact, ContactType } from '@/lib/types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  // Load agent info
  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const agentDescription = [
    `Company/Agency name: ${agent.name}`,
    agent.code   ? `Code: ${agent.code}`                          : null,
    agent.city   ? `City: ${agent.city}`                          : null,
    agent.country? `Country: ${agent.country}`                    : null,
    agent.address1 ? `Address: ${[agent.address1, agent.address2, agent.address3].filter(Boolean).join(', ')}` : null,
    agent.postal_code ? `Postal code: ${agent.postal_code}`       : null,
  ].filter(Boolean).join('\n')

  const prompt = `You are a research assistant helping find contact information for a travel agency.

Search for contact information for this travel agency:
${agentDescription}

Please search the internet and find:
1. Email address(es)
2. Phone number(s)
3. Website URL
4. LinkedIn company page
5. Physical address (if different from above)
6. Any social media profiles (Facebook, Twitter/X, Instagram)

Return ONLY a valid JSON array with this structure (no markdown, no explanation):
[
  {
    "type": "email|phone|website|linkedin|facebook|twitter|address|other",
    "value": "the actual contact value",
    "label": "short descriptive label e.g. General Enquiries, Booking Phone",
    "confidence": "high|medium|low",
    "source_url": "URL where you found this (optional)"
  }
]

Rules:
- Only include contacts you actually found with reasonable confidence
- "high" confidence = found directly on official website or verified source
- "medium" confidence = found on directory or listing site
- "low" confidence = inferred or uncertain
- If you cannot find anything, return an empty array []
- Do not invent or guess contact details`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof client.messages.create>[0]['tools'],
      messages: [{ role: 'user', content: prompt }],
    })

    // Extract text from response
    let rawJson = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        rawJson += block.text
      }
    }

    // Parse the JSON array
    const jsonMatch = rawJson.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ contacts: [], message: 'No contacts found' })
    }

    const contacts: SearchedContact[] = JSON.parse(jsonMatch[0])

    // Validate and sanitise
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

    return NextResponse.json({ contacts: sanitised, agentName: agent.name })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
