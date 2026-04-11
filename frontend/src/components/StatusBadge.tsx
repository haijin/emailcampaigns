import { CampaignStatus, RecipientStatus } from '@/lib/types'

const campaignColors: Record<CampaignStatus, string> = {
  draft:      'bg-slate-100 text-slate-700',
  review:     'bg-yellow-100 text-yellow-700',
  approved:   'bg-blue-100 text-blue-700',
  sending:    'bg-indigo-100 text-indigo-700',
  sent:       'bg-green-100 text-green-700',
  paused:     'bg-orange-100 text-orange-700',
  cancelled:  'bg-red-100 text-red-700',
}

const recipientColors: Record<RecipientStatus, string> = {
  pending:       'bg-slate-100 text-slate-600',
  sending:       'bg-indigo-100 text-indigo-700',
  sent:          'bg-green-100 text-green-700',
  failed:        'bg-red-100 text-red-700',
  bounced:       'bg-orange-100 text-orange-700',
  unsubscribed:  'bg-gray-100 text-gray-600',
}

export function CampaignBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${campaignColors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export function RecipientBadge({ status }: { status: RecipientStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${recipientColors[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
