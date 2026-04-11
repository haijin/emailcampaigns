'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, Check, X, Plus, Trash2, Star, StarOff,
  Globe, Mail, Phone, MapPin,
  Sparkles, Loader2, ExternalLink, Building2, Tag, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Agent, AgentContact, ContactType, SearchedContact } from '@/lib/types'

// ── Contact type config ────────────────────────────────────────────────────
const CONTACT_TYPES: { value: ContactType; label: string; icon: React.ElementType; placeholder: string }[] = [
  { value: 'email',    label: 'Email',    icon: Mail,     placeholder: 'agent@example.com' },
  { value: 'phone',    label: 'Phone',    icon: Phone,    placeholder: '+1 555 000 0000' },
  { value: 'website',  label: 'Website',  icon: Globe,    placeholder: 'https://www.example.com' },
  { value: 'linkedin', label: 'LinkedIn', icon: Globe, placeholder: 'https://linkedin.com/company/...' },
  { value: 'facebook', label: 'Facebook', icon: Globe, placeholder: 'https://facebook.com/...' },
  { value: 'twitter',  label: 'Twitter',  icon: Globe, placeholder: 'https://twitter.com/...' },
  { value: 'address',  label: 'Address',  icon: MapPin,   placeholder: '123 Main St, City' },
  { value: 'other',    label: 'Other',    icon: Tag,      placeholder: 'Any other contact info' },
]

function typeConfig(type: ContactType) {
  return CONTACT_TYPES.find((t) => t.value === type) ?? CONTACT_TYPES[CONTACT_TYPES.length - 1]
}

function confidenceBadge(c: string) {
  const map: Record<string, string> = {
    high:   'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low:    'bg-slate-100 text-slate-500',
  }
  return map[c] ?? map.low
}

function contactLink(type: ContactType, value: string): string | null {
  if (type === 'email')   return `mailto:${value}`
  if (type === 'phone')   return `tel:${value}`
  if (['website', 'linkedin', 'facebook', 'twitter'].includes(type)) return value
  return null
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ContactRow({
  contact,
  onDelete,
  onTogglePrimary,
}: {
  contact: AgentContact
  onDelete: (id: string) => void
  onTogglePrimary: (contact: AgentContact) => void
}) {
  const cfg  = typeConfig(contact.type)
  const Icon = cfg.icon
  const href = contactLink(contact.type, contact.value)

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      contact.is_primary ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'
    }`}>
      <div className={`p-2 rounded-lg shrink-0 ${contact.is_primary ? 'bg-indigo-100' : 'bg-slate-100'}`}>
        <Icon className={`w-4 h-4 ${contact.is_primary ? 'text-indigo-600' : 'text-slate-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{cfg.label}</span>
          {contact.label && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{contact.label}</span>
          )}
          {contact.is_primary && (
            <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Primary</span>
          )}
          {contact.source === 'web_search' && (
            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> AI found
            </span>
          )}
        </div>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-sm text-slate-800 hover:text-indigo-600 flex items-center gap-1 break-all">
            {contact.value}
            <ExternalLink className="w-3 h-3 shrink-0 text-slate-300" />
          </a>
        ) : (
          <p className="text-sm text-slate-800 break-all">{contact.value}</p>
        )}
        {contact.notes && <p className="text-xs text-slate-400 mt-0.5">{contact.notes}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onTogglePrimary(contact)}
          title={contact.is_primary ? 'Remove primary' : 'Set as primary'}
          className={`p-1.5 rounded-lg transition-colors ${
            contact.is_primary
              ? 'text-indigo-500 hover:bg-indigo-100'
              : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'
          }`}
        >
          {contact.is_primary ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => onDelete(contact.id)}
          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [agent, setAgent]           = useState<Agent | null>(null)
  const [contacts, setContacts]     = useState<AgentContact[]>([])
  const [loading, setLoading]       = useState(true)
  const [editMode, setEditMode]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [searching, setSearching]   = useState(false)
  const [suggestions, setSuggestions] = useState<SearchedContact[]>([])
  const [addingContact, setAddingContact] = useState(false)

  const [editForm, setEditForm] = useState({
    name: '', code: '', email: '', city: '', country: '',
    address1: '', address2: '', address3: '', postal_code: '', int_access: '',
  })

  const [newContact, setNewContact] = useState({
    type: 'email' as ContactType,
    value: '',
    label: '',
    is_primary: false,
    notes: '',
  })

  const loadAgent = useCallback(async () => {
    const [agentRes, contactsRes] = await Promise.all([
      fetch(`/api/agents/${id}`),
      fetch(`/api/agents/${id}/contacts`),
    ])
    const [agentData, contactsData] = await Promise.all([agentRes.json(), contactsRes.json()])
    if (agentData.data) {
      setAgent(agentData.data)
      const a = agentData.data
      setEditForm({
        name:        a.name        ?? '',
        code:        a.code        ?? '',
        email:       a.email       ?? '',
        city:        a.city        ?? '',
        country:     a.country     ?? '',
        address1:    a.address1    ?? '',
        address2:    a.address2    ?? '',
        address3:    a.address3    ?? '',
        postal_code: a.postal_code ?? '',
        int_access:  a.int_access  ?? '',
      })
    }
    setContacts(contactsData.data ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { loadAgent() }, [loadAgent])

  const saveAgent = async () => {
    setSaving(true)
    const res  = await fetch(`/api/agents/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(editForm),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) { toast.success('Agent saved'); setAgent(data.data); setEditMode(false) }
    else { toast.error(data.error ?? 'Save failed') }
  }

  const addContact = async () => {
    if (!newContact.value.trim()) { toast.error('Value is required'); return }
    const res  = await fetch(`/api/agents/${id}/contacts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(newContact),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success('Contact added')
      setContacts((prev) => [...prev, data.data])
      setNewContact({ type: 'email', value: '', label: '', is_primary: false, notes: '' })
      setAddingContact(false)
    } else { toast.error(data.error ?? 'Failed to add') }
  }

  const deleteContact = async (contactId: string) => {
    const res = await fetch(`/api/agents/${id}/contacts?contact_id=${contactId}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Removed')
      setContacts((prev) => prev.filter((c) => c.id !== contactId))
    } else { toast.error('Delete failed') }
  }

  const togglePrimary = async (contact: AgentContact) => {
    const res  = await fetch(`/api/agents/${id}/contacts`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ contact_id: contact.id, is_primary: !contact.is_primary, type: contact.type }),
    })
    if (res.ok) { loadAgent() }
    else { toast.error('Update failed') }
  }

  const importSuggestion = async (s: SearchedContact) => {
    const res = await fetch(`/api/agents/${id}/contacts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        type:       s.type,
        value:      s.value,
        label:      s.label,
        is_primary: false,
        source:     'web_search',
        notes:      s.source_url ? `Found at: ${s.source_url}` : undefined,
      }),
    })
    if (res.ok) {
      toast.success('Contact imported')
      setSuggestions((prev) => prev.filter((x) => x.value !== s.value))
      loadAgent()
    } else { toast.error('Import failed') }
  }

  const searchContacts = async () => {
    setSearching(true)
    setSuggestions([])
    try {
      const res  = await fetch(`/api/agents/${id}/search`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Search failed'); return }
      if (data.contacts.length === 0) { toast('No contacts found online', { icon: 'ℹ️' }); return }
      setSuggestions(data.contacts)
      toast.success(`Found ${data.contacts.length} contact${data.contacts.length !== 1 ? 's' : ''}`)
    } finally {
      setSearching(false)
    }
  }

  // Group contacts by type
  const groupedContacts = contacts.reduce<Record<string, AgentContact[]>>((acc, c) => {
    if (!acc[c.type]) acc[c.type] = []
    acc[c.type].push(c)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Agent not found</p>
        <Link href="/agents" className="text-indigo-600 hover:underline mt-2 inline-block">Back to agents</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/agents" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-mono text-slate-400">{agent.code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              agent.int_access === 'Y' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
            }`}>INT {agent.int_access ?? '—'}</span>
            {!agent.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactive</span>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{agent.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {[agent.city, agent.country].filter(Boolean).join(', ') || 'Location unknown'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={saveAgent} disabled={saving}
                className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1">
              <Pencil className="w-4 h-4" /> Edit Info
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left: Agent Info */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-slate-400">Agent Info</h2>

            {editMode ? (
              <div className="space-y-3">
                {[
                  { key: 'name',        label: 'Name *',       type: 'text' },
                  { key: 'code',        label: 'Code',         type: 'text' },
                  { key: 'email',       label: 'Primary Email',type: 'email' },
                  { key: 'address1',    label: 'Address 1',    type: 'text' },
                  { key: 'address2',    label: 'Address 2',    type: 'text' },
                  { key: 'address3',    label: 'Address 3',    type: 'text' },
                  { key: 'city',        label: 'City',         type: 'text' },
                  { key: 'country',     label: 'Country',      type: 'text' },
                  { key: 'postal_code', label: 'Postal Code',  type: 'text' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-500">{label}</label>
                    <input
                      type={type}
                      value={editForm[key as keyof typeof editForm]}
                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-slate-500">INT Access</label>
                  <select
                    value={editForm.int_access}
                    onChange={(e) => setEditForm((f) => ({ ...f, int_access: e.target.value }))}
                    className="w-full mt-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="">—</option>
                    <option value="Y">Y</option>
                    <option value="N">N</option>
                  </select>
                </div>
              </div>
            ) : (
              <dl className="space-y-2.5">
                {[
                  { label: 'Address', value: [agent.address1, agent.address2, agent.address3].filter(Boolean).join(', ') || '—' },
                  { label: 'City',    value: agent.city    ?? '—' },
                  { label: 'Country', value: agent.country ?? '—' },
                  { label: 'Postcode', value: agent.postal_code ?? '—' },
                  { label: 'Primary Email', value: agent.email ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</dt>
                    <dd className="text-sm text-slate-700 mt-0.5 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Right: Contact List */}
        <div className="col-span-3 space-y-4">

          {/* AI Search */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-slate-800 text-sm">Find Contacts with AI</span>
                </div>
                <p className="text-xs text-slate-500">
                  Claude searches the internet for emails, phones, websites and social profiles for this agency.
                </p>
              </div>
              <button
                onClick={searchContacts}
                disabled={searching}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {searching
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                  : <><Sparkles className="w-4 h-4" /> Search</>}
              </button>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-purple-700">
                  {suggestions.length} result{suggestions.length !== 1 ? 's' : ''} found — click to import
                </p>
                {suggestions.map((s, i) => {
                  const cfg  = typeConfig(s.type)
                  const Icon = cfg.icon
                  return (
                    <div key={i} className="flex items-center gap-3 bg-white border border-purple-100 rounded-lg p-3">
                      <Icon className="w-4 h-4 text-purple-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-slate-400 uppercase">{s.type}</span>
                          {s.label && <span className="text-xs text-slate-400">· {s.label}</span>}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${confidenceBadge(s.confidence)}`}>
                            {s.confidence}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 break-all">{s.value}</p>
                        {s.source_url && (
                          <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-purple-500 hover:underline truncate block">{s.source_url}</a>
                        )}
                      </div>
                      <button
                        onClick={() => importSuggestion(s)}
                        className="shrink-0 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Import
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Contact List */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-semibold text-slate-800 text-sm">
                Contacts <span className="text-slate-400 font-normal">({contacts.length})</span>
              </span>
              <button
                onClick={() => setAddingContact(!addingContact)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Contact
              </button>
            </div>

            {/* Add contact form */}
            {addingContact && (
              <div className="border-b border-slate-100 p-4 bg-slate-50 space-y-3">
                <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">New Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Type</label>
                    <select
                      value={newContact.type}
                      onChange={(e) => setNewContact((f) => ({ ...f, type: e.target.value as ContactType }))}
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Label <span className="text-slate-300">(optional)</span></label>
                    <input
                      type="text"
                      value={newContact.label}
                      onChange={(e) => setNewContact((f) => ({ ...f, label: e.target.value }))}
                      placeholder="e.g. General Enquiries"
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Value *</label>
                    <input
                      type="text"
                      value={newContact.value}
                      onChange={(e) => setNewContact((f) => ({ ...f, value: e.target.value }))}
                      placeholder={typeConfig(newContact.type).placeholder}
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500">Notes <span className="text-slate-300">(optional)</span></label>
                    <input
                      type="text"
                      value={newContact.notes}
                      onChange={(e) => setNewContact((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Any additional notes..."
                      className="w-full mt-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_primary"
                      checked={newContact.is_primary}
                      onChange={(e) => setNewContact((f) => ({ ...f, is_primary: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="is_primary" className="text-sm text-slate-600 cursor-pointer">
                      Set as primary {newContact.type}
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={addContact}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    <Check className="w-4 h-4" /> Add
                  </button>
                  <button onClick={() => setAddingContact(false)}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Grouped contacts */}
            <div className="p-4 space-y-4">
              {contacts.length === 0 ? (
                <div className="py-8 text-center">
                  <Mail className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No contacts yet</p>
                  <p className="text-xs text-slate-300 mt-1">Add manually or use AI search above</p>
                </div>
              ) : (
                Object.entries(groupedContacts).map(([type, items]) => {
                  const cfg  = typeConfig(type as ContactType)
                  return (
                    <div key={type}>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <cfg.icon className="w-3.5 h-3.5" /> {cfg.label}
                        <span className="text-slate-300 font-normal">({items.length})</span>
                      </p>
                      <div className="space-y-2">
                        {items.map((c) => (
                          <ContactRow
                            key={c.id}
                            contact={c}
                            onDelete={deleteContact}
                            onTogglePrimary={togglePrimary}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
