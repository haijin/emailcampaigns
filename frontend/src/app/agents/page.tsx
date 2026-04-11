'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Users, Search, Mail, MapPin, Pencil, Check, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { Agent } from '@/lib/types'

export default function AgentsPage() {
  const [agents, setAgents]     = useState<Agent[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [country, setCountry]   = useState('')
  const [hasEmail, setHasEmail] = useState('')
  const [editId, setEditId]     = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')

  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page:  String(page),
      limit: String(LIMIT),
      ...(search   ? { search }   : {}),
      ...(country  ? { country }  : {}),
      ...(hasEmail ? { hasEmail } : {}),
    })
    const res = await fetch(`/api/agents?${params}`)
    const data = await res.json()
    setAgents(data.data ?? [])
    setTotal(data.count ?? 0)
    setLoading(false)
  }, [page, search, country, hasEmail])

  useEffect(() => { load() }, [load])

  // Debounce search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const saveEmail = async (id: string) => {
    const res = await fetch('/api/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, email: editEmail }),
    })
    if (res.ok) {
      toast.success('Email updated')
      setEditId(null)
      load()
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Failed to save')
    }
  }

  const pages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agents</h1>
          <p className="text-slate-500 text-sm mt-1">{total.toLocaleString()} agents total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, code, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by country"
          value={country}
          onChange={(e) => { setCountry(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40"
        />
        <select
          value={hasEmail}
          onChange={(e) => { setHasEmail(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">All agents</option>
          <option value="true">Has email</option>
          <option value="false">No email</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">INT Access</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No agents found
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{agent.code}</td>
                    <td className="px-4 py-3 max-w-48">
                      <Link href={`/agents/${agent.id}`} className="font-medium text-slate-900 hover:text-indigo-600 flex items-center gap-1 truncate group">
                        <span className="truncate">{agent.name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity" />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {editId === agent.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEmail(agent.id)
                              if (e.key === 'Escape') setEditId(null)
                            }}
                            className="px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-400 w-48"
                            placeholder="email@example.com"
                          />
                          <button onClick={() => saveEmail(agent.id)} className="p-1 text-green-600 hover:text-green-700">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1 text-slate-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : agent.email ? (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {agent.email}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">No email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {agent.city || agent.country ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-300" />
                          {[agent.city, agent.country].filter(Boolean).join(', ')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        agent.int_access === 'Y'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {agent.int_access ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditId(agent.id); setEditEmail(agent.email ?? '') }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit email"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-xs text-slate-600">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-3 py-1 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
