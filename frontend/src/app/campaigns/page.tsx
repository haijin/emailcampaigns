'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, PlusCircle, Send, Users, Calendar, Trash2 } from 'lucide-react'
import { Campaign, CampaignStatus } from '@/lib/types'
import { CampaignBadge } from '@/components/StatusBadge'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_TABS: Array<{ label: string; value: string }> = [
  { label: 'All',       value: '' },
  { label: 'Draft',     value: 'draft' },
  { label: 'Review',    value: 'review' },
  { label: 'Approved',  value: 'approved' },
  { label: 'Sending',   value: 'sending' },
  { label: 'Sent',      value: 'sent' },
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [status, setStatus]       = useState('')
  const [loading, setLoading]     = useState(true)

  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), ...(status ? { status } : {}) })
    const res  = await fetch(`/api/campaigns?${params}`)
    const data = await res.json()
    setCampaigns(data.data ?? [])
    setTotal(data.count ?? 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [page, status]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteCampaign = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Campaign deleted'); load() }
    else { const d = await res.json(); toast.error(d.error ?? 'Delete failed') }
  }

  const pages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">{total} campaign{total !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" /> New Campaign
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatus(t.value); setPage(1) }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              status === t.value
                ? 'bg-white text-slate-900 font-medium shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
            <Mail className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">No campaigns found</p>
            <Link href="/campaigns/new" className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
              <PlusCircle className="w-4 h-4" /> Create one
            </Link>
          </div>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CampaignBadge status={c.status as CampaignStatus} />
                  <Link href={`/campaigns/${c.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate">
                    {c.name}
                  </Link>
                </div>
                <p className="text-sm text-slate-500 truncate">{c.subject}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.total_recipients.toLocaleString()} recipients</span>
                  {c.sent_count > 0 && <span className="flex items-center gap-1"><Send className="w-3 h-3 text-green-500" />{c.sent_count.toLocaleString()} sent</span>}
                  {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} failed</span>}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                  {c.from_email && <span>From: {c.from_name}</span>}
                </div>
              </div>

              {/* Progress bar for active campaigns */}
              {['sending', 'sent'].includes(c.status) && c.total_recipients > 0 && (
                <div className="w-32 shrink-0">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{Math.round((c.sent_count / c.total_recipients) * 100)}%</span>
                    <span>{c.sent_count}/{c.total_recipients}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(c.sent_count / c.total_recipients) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/campaigns/${c.id}`}
                  className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  View
                </Link>
                {!['sending', 'sent'].includes(c.status) && (
                  <button
                    onClick={() => deleteCampaign(c.id, c.name)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white">Prev</button>
          <span className="px-4 py-2 text-sm text-slate-600">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-4 py-2 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white">Next</button>
        </div>
      )}
    </div>
  )
}
