import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
  }

  const { skill_id, brief, campaign_name, from_name } = await req.json()

  if (!brief) {
    return NextResponse.json({ error: 'brief is required' }, { status: 400 })
  }

  // Load skill (use default email_draft skill if not specified)
  let skill
  if (skill_id) {
    const { data } = await supabaseAdmin.from('skills').select('*').eq('id', skill_id).single()
    skill = data
  } else {
    const { data } = await supabaseAdmin.from('skills').select('*').eq('type', 'email_draft').eq('is_default', true).single()
    skill = data
  }

  if (!skill) {
    return NextResponse.json({ error: 'No email draft skill found' }, { status: 404 })
  }

  const userPrompt = `Write a complete HTML email for the following campaign:

Campaign name: ${campaign_name || 'Email Campaign'}
Sender / company: ${from_name || 'AI Campaigns'}
Brief / key message: ${brief}

Remember to use {{name}} as the placeholder for the recipient's agent name.
Output ONLY the complete HTML — no markdown, no code fences, no explanation.`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: skill.instructions,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const html = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Strip markdown code fences if Claude wrapped it anyway
    const cleaned = html
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    // Increment usage count
    await supabaseAdmin
      .from('skills')
      .update({ usage_count: (skill.usage_count ?? 0) + 1 })
      .eq('id', skill.id)

    return NextResponse.json({ html: cleaned, skill_name: skill.name })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Draft failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
