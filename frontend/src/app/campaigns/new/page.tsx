'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Eye } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
    .header { background: #4f46e5; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .body { padding: 30px; background: #fff; border: 1px solid #e5e7eb; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
    h1 { margin: 0; font-size: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>TES - The Experts in Specialised Travel</h1>
  </div>
  <div class="body">
    <p>Dear {{name}},</p>
    <p>We are pleased to reach out to you regarding our latest travel offerings and updates.</p>
    <p>As one of our valued agents, we want to keep you informed about the exciting opportunities available through our network.</p>
    <p>Please feel free to contact us if you have any questions or require further information.</p>
    <p>Best regards,<br/>The TES Team</p>
    <a href="#" class="btn">Learn More</a>
  </div>
  <div class="footer">
    <p>You are receiving this email because you are a registered TES agent.</p>
    <p>© 2024 TES. All rights reserved.</p>
  </div>
</body>
</html>`

export default function NewCampaignPage() {
  const router = useRouter()
  const [saving, setSaving]   = useState(false)
  const [preview, setPreview] = useState(false)

  const [form, setForm] = useState({
    name:             '',
    subject:          '',
    from_name:        'AI Campaigns',
    from_email:       '',
    reply_to:         '',
    filter_country:   '',
    filter_int_access: '',
    html_content:     DEFAULT_HTML,
    text_content:     '',
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.subject || !form.from_email || !form.html_content) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    const res  = await fetch('/api/campaigns', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      toast.success('Campaign created')
      router.push(`/campaigns/${data.data.id}`)
    } else {
      toast.error(data.error ?? 'Failed to create campaign')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Campaign</h1>
          <p className="text-slate-500 text-sm">Configure and write your email campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-800">Campaign Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Campaign Name *</label>
              <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Q1 2025 Newsletter" required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Subject *</label>
              <input type="text" value={form.subject} onChange={(e) => set('subject', e.target.value)}
                placeholder="e.g. Exciting travel opportunities from TES" required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Name *</label>
              <input type="text" value={form.from_name} onChange={(e) => set('from_name', e.target.value)} required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">From Email *</label>
              <input type="email" value={form.from_email} onChange={(e) => set('from_email', e.target.value)} required
                placeholder="campaigns@yourdomain.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reply-To</label>
              <input type="email" value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
        </div>

        {/* Audience filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Audience Filters</h2>
          </div>
          <p className="text-xs text-slate-500">Leave blank to include all agents with an email address.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Country</label>
              <input type="text" value={form.filter_country} onChange={(e) => set('filter_country', e.target.value)}
                placeholder="e.g. Australia"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">INT Access</label>
              <select value={form.filter_int_access} onChange={(e) => set('filter_int_access', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">All</option>
                <option value="Y">Y - Has INT access</option>
                <option value="N">N - No INT access</option>
              </select>
            </div>
          </div>
        </div>

        {/* Email content */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Email Content *</h2>
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Eye className="w-4 h-4" /> {preview ? 'Edit' : 'Preview'}
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Use <code className="bg-slate-100 px-1 rounded">{'{{name}}'}</code> as a placeholder for the agent&apos;s name.
          </p>

          {preview ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 text-xs text-slate-500">Preview</div>
              <iframe
                srcDoc={form.html_content}
                className="w-full h-96 bg-white"
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <textarea
              value={form.html_content}
              onChange={(e) => set('html_content', e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
              placeholder="Paste or write your HTML email content here..."
            />
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Plain Text Version (optional)</label>
            <textarea
              value={form.text_content}
              onChange={(e) => set('text_content', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
              placeholder="Plain text fallback for email clients that don't support HTML..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/campaigns" className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : 'Save as Draft'}
          </button>
        </div>
      </form>
    </div>
  )
}
