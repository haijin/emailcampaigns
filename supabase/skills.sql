-- ============================================================
-- Skills Table
-- Manages AI prompt strategies for contact search & email drafting
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS skills (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(50) NOT NULL,       -- 'contact_search' | 'email_draft'
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  instructions TEXT        NOT NULL,       -- System prompt / instructions sent to Claude
  config       JSONB       DEFAULT '{}',   -- Extra settings (tone, language, format, etc.)
  is_active    BOOLEAN     DEFAULT TRUE,
  is_default   BOOLEAN     DEFAULT FALSE,
  usage_count  INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_type    ON skills(type);
CREATE INDEX IF NOT EXISTS idx_skills_default ON skills(type, is_default);

CREATE OR REPLACE TRIGGER skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enforce only one default per type
CREATE OR REPLACE FUNCTION enforce_single_default_skill()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE skills SET is_default = FALSE
    WHERE type = NEW.type AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER skills_single_default
  BEFORE INSERT OR UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION enforce_single_default_skill();

-- ── Seed default skills ────────────────────────────────────────────────────

INSERT INTO skills (type, name, description, instructions, config, is_default) VALUES

-- Contact Search skill
('contact_search', 'Standard Contact Finder',
 'Finds emails, phones, websites and social profiles for travel agencies.',
 'You are a research assistant specialising in finding contact information for travel agencies and tour operators.

Search the internet thoroughly for the travel agency provided. Look for:
1. Primary email address (booking, general enquiries, info)
2. Phone numbers (main office, reservations)
3. Official website URL
4. LinkedIn company page
5. Facebook business page
6. Physical/mailing address

Search strategies:
- Check the agency''s official website first
- Look on travel industry directories (IATA, ASTA, CLIA, ATOL)
- Check LinkedIn company search
- Try Google: "[agency name] [city] contact email"
- Check Facebook business pages

Return only verified contacts with a confidence rating:
- high: found directly on official website
- medium: found on reputable directory or listing
- low: found on aggregator or uncertain source

Do not invent or guess any contact details.',
 '{"max_results": 10, "confidence_threshold": "low"}',
 true),

-- Email Draft skills
('email_draft', 'Professional Newsletter',
 'Writes formal, professional email newsletters for travel agencies.',
 'You are an expert travel industry copywriter. Write professional HTML email content for travel agencies.

Style guidelines:
- Tone: Professional, warm, and trustworthy
- Length: Medium (300-500 words of body copy)
- Structure: Compelling headline → value proposition → key details → clear CTA
- Language: Clear, jargon-free, benefit-focused
- Always personalise with {{name}} placeholder for agent name

HTML requirements:
- Self-contained HTML document with inline CSS only
- Mobile-responsive design using max-width: 600px
- Clean, modern layout with header, body, footer sections
- Brand colours: indigo (#4f46e5) for header/buttons
- Include unsubscribe note in footer
- Use web-safe fonts (Arial, Georgia)

Generate complete, ready-to-send HTML. Do not include markdown or explanations — output HTML only.',
 '{"tone": "professional", "length": "medium", "language": "en"}',
 true),

('email_draft', 'Friendly Promotional',
 'Writes upbeat, friendly promotional emails to drive bookings.',
 'You are a creative travel copywriter who writes engaging, friendly promotional emails.

Style guidelines:
- Tone: Enthusiastic, friendly, conversational
- Length: Short to medium (200-350 words)
- Structure: Exciting hook → offer/news → benefits → urgent CTA
- Use active voice and power words ("exclusive", "discover", "limited")
- Always personalise with {{name}} placeholder

HTML requirements:
- Self-contained HTML with inline CSS
- Max-width 600px, mobile-friendly
- Bold, colourful header with offer headline
- Highlight key offer in a styled box/banner
- Large, prominent CTA button
- Use bright accent colours alongside brand indigo (#4f46e5)

Output complete HTML only — no markdown, no explanations.',
 '{"tone": "friendly", "length": "short", "language": "en"}',
 false),

('email_draft', 'Agent Announcement',
 'Writes concise product or rate update announcements for agents.',
 'You are a B2B travel communications specialist. Write clear, informative announcements for travel agents.

Style guidelines:
- Tone: Direct, informative, respectful of the agent''s time
- Length: Short (150-250 words)
- Structure: Subject summary → key details (bullet points) → action required → contact
- Use bullet points for key information
- Always personalise with {{name}} placeholder

HTML requirements:
- Clean, minimal HTML with inline CSS
- Max-width 600px
- Simple header with company name
- Body with clear heading and bullet-point details
- Reply/contact CTA at bottom
- Professional grey and indigo colour scheme

Output complete HTML only.',
 '{"tone": "formal", "length": "short", "language": "en"}',
 false)

ON CONFLICT DO NOTHING;
