export interface Agent {
  id: string
  code: string
  name: string
  email: string | null
  address1: string | null
  address2: string | null
  address3: string | null
  city: string | null
  country: string | null
  postal_code: string | null
  int_access: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FileImport {
  id: string
  filename: string
  total_rows: number
  imported_rows: number
  skipped_rows: number
  status: 'processing' | 'completed' | 'failed'
  error_message: string | null
  created_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content: string | null
  created_at: string
  updated_at: string
}

export type CampaignStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'cancelled'

export interface Campaign {
  id: string
  name: string
  subject: string
  html_content: string
  text_content: string | null
  from_name: string
  from_email: string
  reply_to: string | null
  status: CampaignStatus
  filter_country: string | null
  filter_int_access: string | null
  total_recipients: number
  sent_count: number
  failed_count: number
  opened_count: number
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type RecipientStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'bounced'
  | 'unsubscribed'

export interface CampaignRecipient {
  id: string
  campaign_id: string
  agent_id: string | null
  email: string
  name: string | null
  status: RecipientStatus
  sent_at: string | null
  error_message: string | null
  message_id: string | null
  created_at: string
}

export type ContactType =
  | 'email'
  | 'phone'
  | 'website'
  | 'linkedin'
  | 'facebook'
  | 'twitter'
  | 'address'
  | 'other'

export interface AgentContact {
  id: string
  agent_id: string
  type: ContactType
  value: string
  label: string | null
  is_primary: boolean
  source: 'manual' | 'web_search'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SearchedContact {
  type: ContactType
  value: string
  label: string
  confidence: 'high' | 'medium' | 'low'
  source_url?: string
}

export interface DashboardStats {
  totalAgents: number
  agentsWithEmail: number
  totalCampaigns: number
  draftCampaigns: number
  sentCampaigns: number
  totalEmailsSent: number
  totalEmailsFailed: number
}
