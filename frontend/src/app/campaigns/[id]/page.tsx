'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Eye, Pencil, Send, Pause, CheckCircle, XCircle,
  Users, Mail, RefreshCw, Clock, AlertTriangle, ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Campaign, CampaignRecipient } from '@/lib/types'
import { CampaignBadge, RecipientBadge } from '@/components/StatusBadge'
import { format, formatDistanceToNow } from 'date-fns'

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{pct}% delivered</span>
        <span>{value.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [campaign, setCampaign]       = useState<Campaign | null>(null)
  const [recipients, setRecipients]   = useState<CampaignRecipient[]>([])
  const [recTotal, setRecTotal]       = useState(0)
  const [recPage, setRecPage]         = useState(1)
  const [recStatus, setRecStatus]     = useState('')
  const [loading, setLoading]         = useState(true)
  const [editing, setEditing]         = useState(false)
  const [preview, setPreview]         = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [editForm, setEditForm] = useState({
    name: '', subject: '', html_content: '', text_content: '',
    from_name: '', from_email: '', reply_to: '',
  })

  const loadCampaign = useCallback(async () => {
    const res  = await fetch(`/api/campaigns/${id}`)
    const data = await res.json()
    if (res.ok) {
      setCampaign(data.data)
      setEditForm({
        name:         data.data.name,
        subject:      data.data.subject,
        html_content: data.data.html_content,
        text_content: data.data.text_content ?? '',
        from_name:    data.data.from_name,
        from_email:   data.data.from_email,
        reply_to:     data.data.reply_to ?? '',
      })
    }
    setLoading(false)
  }, [id])

  const loadRecipients = useCallback(async () => {
    const params = new URLSearchParams({ page: String(recPage), limit: '20', ...(recStatus ? { status: recStatus } : {}) })
    const res  = await fetch(`/api/campaigns/${id}/recipients?${params}`)
    const data = await res.json()
    setRecipients(data.data ?? [])
    setRecTotal(data.count ?? 0)
  }, [id, recPage, recStatus])

  useEffect(() => { loadCampaign() }, [loadCampaign])
  useEffect(() => { if (!loading) loadRecipients() }, [loadRecipients, loading])

  // Auto-refresh when sending
  useEffect(() => {
    if (campaign?.status !== 'sending') return
    const t = setInterval(() => { loadCampaign(); loadRecipients() }, 5000)
    return () => clearInterval(t)
  }, [campaign?.status, loadCampaign, loadRecipients])

  const action = async (act: string) => {
    setActionLoading(true)
    const isStart = act === 'start'
    const res = await fetch(
      `/api/campaigns/${id}/send`,
      isStart
        ? { method: 'POST' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: act }) }
    )
    const data = await res.json()
    setActionLoading(false)
    if (res.ok) {
      toast.success(data.message ?? 'Done')
      loadCampaign()
    } else {
      toast.error(data.error ?? 'Action failed')
    }
  }

  const saveEdit = async () => {
    setActionLoading(true)
    const res = await fetch(`/api/campaigns/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(editForm),
    })
    const data = await res.json()
    setActionLoading(false)
    if (res.ok) {
      toast.success('Campaign updated')
      setCampaign(data.data)
      setEditing(false)
    } else {
      toast.error(data.error ?? 'Update failed')
    }
  }

  const recPages = Math.ceil(recTotal / 20)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Campaign not found</p>
        <Link href="/campaigns" className="text-indigo-600 hover:underline mt-2 inline-block">Back to campaigns</Link>
      </div>
    )
  }

  const canEdit  = !['sending', 'sent'].includes(campaign.status)
  const canSend  = campaign.status === 'approved'
  const canPause = campaign.status === 'sending'
  const canResume = campaign.status === 'paused'

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/campaigns" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CampaignBadge status={campaign.status} />
            {campaign.status === 'sending' && (
              <span className="flex items-center gap-1 text-xs text-indigo-600 animate-pulse">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Live
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 truncate">{campaign.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Created {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
            {campaign.completed_at && ` · Completed ${format(new Date(campaign.completed_at), 'dd MMM yyyy HH:mm')}`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === 'sending' && (
            <button onClick={() => loadCampaign()} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Pencil className="w-4 h-4" /> Edit
            </button>
          )}
          {campaign.status === 'draft' && (
            <button onClick={() => action('review')} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors">
              Submit for Review
            </button>
          )}
          {campaign.status === 'review' && (
            <button onClick={() => action('approve')} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <CheckCircle className="w-4 h-4" /> Approve
            </button>
          )}
          {canSend && (
            <button onClick={() => action('start')} disabled={actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
              {actionLoading ? 'Starting...' : 'Send Now'}
            </button>
          )}
          {canPause && (
            <button onClick={() => action('pause')} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors">
              <Pause className="w-4 h-4" /> Pause
            </button>
          )}
          {canResume && (
            <button onClick={() => action('start')} disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" /> Resume
            </button>
          )}
        </div>
      </div>

      {/* Workflow hint */}
      {campaign.status === 'draft' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          This campaign is a draft. Edit the content, then submit for review → approve → send.
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Recipients', value: campaign.total_recipients, icon: Users, color: 'text-slate-600' },
          { label: 'Sent',       value: campaign.sent_count,       icon: Send,  color: 'text-green-600' },
          { label: 'Failed',     value: campaign.failed_count,     icon: XCircle, color: 'text-red-500' },
          { label: 'Pending',
            value: campaign.total_recipients - campaign.sent_count - campaign.failed_count,
            icon: Clock, color: 'text-slate-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className="text-xl font-bold text-slate-900">{value.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar (for active campaigns) */}
      {['sending', 'sent'].includes(campaign.status) && campaign.total_recipients > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <ProgressBar value={campaign.sent_count} total={campaign.total_recipients} />
        </div>
      )}

      <div className="grid grid-cols-5 gap-5">
        {/* Campaign Info / Edit */}
        <div className="col-span-2 space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-slate-800">Details</h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Campaign Name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Subject</label>
                  <input value={editForm.subject} onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">From Name</label>
                  <input value={editForm.from_name} onChange={(e) => setEditForm((f) => ({ ...f, from_name: e.target.value }))}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">From Email</label>
                  <input type="email" value={editForm.from_email} onChange={(e) => setEditForm((f) => ({ ...f, from_email: e.target.value }))}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} disabled={actionLoading}
                    className="flex-1 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="flex-1 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <dl className="space-y-2 text-sm">
                {[
                  { label: 'Subject',    value: campaign.subject },
                  { label: 'From',       value: `${campaign.from_name} <${campaign.from_email}>` },
                  { label: 'Reply-To',   value: campaign.reply_to ?? '—' },
                  { label: 'Country filter', value: campaign.filter_country ?? 'All countries' },
                  { label: 'INT Access',     value: campaign.filter_int_access ?? 'All' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
                    <dd className="text-slate-700 mt-0.5 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Email preview */}
        <div className="col-span-3 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">Email Content</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setPreview(false)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${!preview ? 'bg-white border border-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
                HTML
              </button>
              <button onClick={() => setPreview(true)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors flex items-center gap-1 ${preview ? 'bg-white border border-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
          </div>

          {editing ? (
            <textarea
              value={editForm.html_content}
              onChange={(e) => setEditForm((f) => ({ ...f, html_content: e.target.value }))}
              className="w-full h-80 px-4 py-3 text-xs font-mono border-none focus:outline-none resize-none"
            />
          ) : preview ? (
            <iframe
              srcDoc={campaign.html_content}
              className="w-full h-80"
              title="Email preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <pre className="px-4 py-3 text-xs font-mono text-slate-600 overflow-auto h-80 whitespace-pre-wrap">
              {campaign.html_content}
            </pre>
          )}
        </div>
      </div>

      {/* Recipients table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800">Recipients</span>
            <span className="text-xs text-slate-400">({recTotal.toLocaleString()})</span>
          </div>
          <select value={recStatus} onChange={(e) => { setRecStatus(e.target.value); setRecPage(1) }}
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Email</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Sent At</th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500 text-xs">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No recipients</td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-700">{r.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.email}</td>
                    <td className="px-4 py-2.5"><RecipientBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">
                      {r.sent_at ? format(new Date(r.sent_at), 'dd MMM HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-red-400 text-xs max-w-xs truncate" title={r.error_message ?? ''}>
                      {r.error_message ?? ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {recPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400">Page {recPage} of {recPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setRecPage((p) => Math.max(1, p - 1))} disabled={recPage === 1}
                className="px-2 py-1 text-xs border border-slate-200 rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setRecPage((p) => Math.min(recPages, p + 1))} disabled={recPage === recPages}
                className="px-2 py-1 text-xs border border-slate-200 rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
