-- ============================================================
-- Email Campaign Management - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- AGENTS TABLE
-- Imported from Excel (TES Active Agents.xlsx)
-- ============================================================
CREATE TABLE IF NOT EXISTS agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  address1      TEXT,
  address2      TEXT,
  address3      TEXT,
  city          VARCHAR(100),
  country       VARCHAR(100),
  postal_code   VARCHAR(20),
  int_access    VARCHAR(5),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_email   ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_country ON agents(country);
CREATE INDEX IF NOT EXISTS idx_agents_code    ON agents(code);

-- ============================================================
-- FILE IMPORTS TABLE
-- Tracks every Excel upload
-- ============================================================
CREATE TABLE IF NOT EXISTS file_imports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       VARCHAR(255) NOT NULL,
  total_rows     INTEGER DEFAULT 0,
  imported_rows  INTEGER DEFAULT 0,
  skipped_rows   INTEGER DEFAULT 0,
  status         VARCHAR(20) DEFAULT 'processing',  -- processing | completed | failed
  error_message  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMAIL TEMPLATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  html_content  TEXT NOT NULL,
  text_content  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CAMPAIGNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  subject           VARCHAR(500) NOT NULL,
  html_content      TEXT NOT NULL,
  text_content      TEXT,
  from_name         VARCHAR(255) NOT NULL,
  from_email        VARCHAR(255) NOT NULL,
  reply_to          VARCHAR(255),
  status            VARCHAR(20) DEFAULT 'draft',
  -- draft | review | approved | sending | sent | paused | cancelled
  filter_country    VARCHAR(100),
  filter_int_access VARCHAR(5),
  total_recipients  INTEGER DEFAULT 0,
  sent_count        INTEGER DEFAULT 0,
  failed_count      INTEGER DEFAULT 0,
  opened_count      INTEGER DEFAULT 0,
  scheduled_at      TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ============================================================
-- CAMPAIGN RECIPIENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  agent_id       UUID REFERENCES agents(id),
  email          VARCHAR(255) NOT NULL,
  name           VARCHAR(255),
  status         VARCHAR(20) DEFAULT 'pending',
  -- pending | sending | sent | failed | bounced | unsubscribed
  sent_at        TIMESTAMPTZ,
  error_message  TEXT,
  message_id     VARCHAR(255),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status   ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_recipients_agent    ON campaign_recipients(agent_id);

-- ============================================================
-- UPDATED_AT AUTO-TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS
-- ============================================================

-- Campaign summary view
CREATE OR REPLACE VIEW campaign_summary AS
SELECT
  c.id,
  c.name,
  c.subject,
  c.from_name,
  c.from_email,
  c.status,
  c.total_recipients,
  c.sent_count,
  c.failed_count,
  c.created_at,
  c.scheduled_at,
  c.completed_at,
  CASE WHEN c.total_recipients > 0
    THEN ROUND((c.sent_count::NUMERIC / c.total_recipients) * 100, 1)
    ELSE 0
  END AS delivery_rate
FROM campaigns c;

-- ============================================================
-- ROW LEVEL SECURITY (optional - enable if using Supabase Auth)
-- ============================================================
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
