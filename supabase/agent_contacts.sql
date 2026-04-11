-- ============================================================
-- Agent Contacts Table
-- Run this in Supabase SQL Editor (after schema.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  type        VARCHAR(50)  NOT NULL,   -- email | phone | website | linkedin | facebook | twitter | address | other
  value       TEXT         NOT NULL,
  label       VARCHAR(100),            -- e.g. "Work Email", "HQ Phone", "Booking URL"
  is_primary  BOOLEAN      DEFAULT FALSE,
  source      VARCHAR(50)  DEFAULT 'manual',  -- manual | web_search
  notes       TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_contacts_agent ON agent_contacts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_contacts_type  ON agent_contacts(type);

CREATE OR REPLACE TRIGGER agent_contacts_updated_at
  BEFORE UPDATE ON agent_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
