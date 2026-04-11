'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Mail, Send, AlertCircle, Upload, PlusCircle, CheckCircle, Clock } from 'lucide-react'
import { DashboardStats, Campaign } from '@/lib/types'
import { CampaignBadge } from '@/components/StatusBadge'
import { formatDistanceToNow } from 'date-fns'

function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/stats').then((r) => r.json()),
      fetch('/api/campaigns?limit=5').then((r) => r.json()),
    ]).then(([s, c]) => {
      setStats(s)
      setCampaigns(c.data ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Overview of your email campaigns</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/upload"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </Link>
          <Link
            href="/campaigns/new"
            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> New Campaign
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Agents"
            value={stats.totalAgents}
            sub={`${stats.agentsWithEmail} have email`}
            icon={Users}
            color="bg-slate-700"
          />
          <StatCard
            label="Campaigns"
            value={stats.totalCampaigns}
            sub={`${stats.draftCampaigns} drafts`}
            icon={Mail}
            color="bg-indigo-600"
          />
          <StatCard
            label="Emails Sent"
            value={stats.totalEmailsSent}
            sub={`${stats.sentCampaigns} campaigns`}
            icon={Send}
            color="bg-green-600"
          />
          <StatCard
            label="Failed"
            value={stats.totalEmailsFailed}
            sub="delivery failures"
            icon={AlertCircle}
            color="bg-red-500"
          />
        </div>
      )}

      {/* Email coverage alert */}
      {stats && stats.totalAgents > 0 && (
        <div className={`rounded-xl p-4 flex items-start gap-3 ${
          stats.agentsWithEmail === 0
            ? 'bg-amber-50 border border-amber-200'
            : 'bg-green-50 border border-green-200'
        }`}>
          {stats.agentsWithEmail === 0 ? (
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-800">
              {stats.agentsWithEmail === 0
                ? 'No agents have email addresses yet'
                : `${stats.agentsWithEmail} of ${stats.totalAgents} agents have email addresses`}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {stats.agentsWithEmail === 0
                ? 'Import an Excel file or manually add emails in the Agents page before creating campaigns.'
                : `Coverage: ${Math.round((stats.agentsWithEmail / stats.totalAgents) * 100)}%`}
            </p>
          </div>
        </div>
      )}

      {/* Recent Campaigns */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Campaigns</h2>
          <Link href="/campaigns" className="text-sm text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-12 text-center">
            <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No campaigns yet</p>
            <Link
              href="/campaigns/new"
              className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
            >
              <PlusCircle className="w-4 h-4" /> Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{c.subject}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  {c.total_recipients > 0 && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">{c.sent_count}/{c.total_recipients}</p>
                      <p className="text-xs text-slate-400">recipients</p>
                    </div>
                  )}
                  <CampaignBadge status={c.status} />
                  <span className="text-xs text-slate-400 flex items-center gap-1 w-24 text-right">
                    <Clock className="w-3 h-3 inline" />
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: '/upload',    icon: Upload,     label: 'Import Agents',  desc: 'Upload Excel file',       color: 'text-slate-600' },
          { href: '/agents',    icon: Users,      label: 'Manage Agents',  desc: 'Add / edit emails',       color: 'text-indigo-600' },
          { href: '/campaigns/new', icon: PlusCircle, label: 'New Campaign', desc: 'Create & send emails', color: 'text-green-600' },
        ].map(({ href, icon: Icon, label, desc, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-indigo-300 hover:bg-indigo-50 transition-colors group"
          >
            <Icon className={`w-5 h-5 ${color} group-hover:text-indigo-600`} />
            <div>
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <p className="text-xs text-slate-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
