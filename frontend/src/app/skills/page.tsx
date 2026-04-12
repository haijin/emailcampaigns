'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Wand2, Search, Mail, Plus, Pencil, Trash2, Star, StarOff,
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, X, Check,
  Loader2, FlaskConical, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Skill, SkillType } from '@/lib/types'

const TYPE_META: Record<SkillType, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  contact_search: { label: 'Contact Search',  icon: Search, color: 'text-purple-600', desc: 'Controls how Claude searches the internet for agent contact information.' },
  email_draft:    { label: 'Email Drafting',  icon: Mail,   color: 'text-indigo-600', desc: 'Controls how Claude writes and formats email campaign content.' },
}

const EMPTY: Omit<Skill, 'id' | 'usage_count' | 'created_at' | 'updated_at'> = {
  type:         'email_draft',
  name:         '',
  description:  '',
  instructions: '',
  config:       {},
  is_active:    true,
  is_default:   false,
}

function SkillCard({
  skill,
  onEdit,
  onDelete,
  onToggleDefault,
  onToggleActive,
}: {
  skill: Skill
  onEdit: (s: Skill) => void
  onDelete: (s: Skill) => void
  onToggleDefault: (s: Skill) => void
  onToggleActive: (s: Skill) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[skill.type]
  const Icon = meta.icon

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all ${
      skill.is_default ? 'border-indigo-300 shadow-sm shadow-indigo-100' : 'border-slate-200'
    } ${!skill.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3 p-4">
        <div className={`p-2 rounded-lg shrink-0 ${skill.is_default ? 'bg-indigo-100' : 'bg-slate-100'}`}>
          <Icon className={`w-4 h-4 ${skill.is_default ? 'text-indigo-600' : 'text-slate-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{skill.name}</span>
            {skill.is_default && (
              <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Default
              </span>
            )}
            {!skill.is_active && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
          {skill.description && (
            <p className="text-sm text-slate-500 mt-0.5">{skill.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
            <span className={`flex items-center gap-1 ${meta.color}`}>
              <Icon className="w-3 h-3" /> {meta.label}
            </span>
            {skill.usage_count > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" /> Used {skill.usage_count} time{skill.usage_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={expanded ? 'Collapse' : 'View instructions'}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onToggleDefault(skill)}
            className={`p-1.5 rounded-lg transition-colors ${skill.is_default ? 'text-indigo-500 hover:bg-indigo-50' : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'}`}
            title={skill.is_default ? 'Remove as default' : 'Set as default'}>
            {skill.is_default ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
          </button>
          <button onClick={() => onToggleActive(skill)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title={skill.is_active ? 'Deactivate' : 'Activate'}>
            {skill.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => onEdit(skill)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(skill)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Instructions sent to Claude</p>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white border border-slate-100 rounded-lg p-3 max-h-64 overflow-y-auto">
            {skill.instructions}
          </pre>
          {Object.keys(skill.config ?? {}).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(skill.config ?? {}).map(([k, v]) => (
                <span key={k} className="text-xs bg-white border border-slate-200 rounded px-2 py-0.5 text-slate-500">
                  {k}: <span className="font-medium text-slate-700">{String(v)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SkillForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Skill>
  onSave: (data: Partial<Skill>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Type *</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
            <option value="contact_search">Contact Search</option>
            <option value="email_draft">Email Drafting</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Name *</label>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} required
            placeholder="e.g. APAC Contact Finder"
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600">Description</label>
          <input type="text" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)}
            placeholder="Short description of what this skill does"
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-600">
            Instructions for Claude *
            <span className="text-slate-400 font-normal ml-1">— this is the system prompt</span>
          </label>
          <textarea value={form.instructions} onChange={(e) => set('instructions', e.target.value)} required rows={12}
            placeholder="Write clear instructions for how Claude should behave for this skill..."
            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono resize-y" />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
            Active
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
            <input type="checkbox" checked={form.is_default} onChange={(e) => set('is_default', e.target.checked)} className="rounded" />
            Set as default
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {initial.id ? 'Update Skill' : 'Create Skill'}
        </button>
      </div>
    </form>
  )
}

export default function SkillsPage() {
  const [skills, setSkills]     = useState<Skill[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<SkillType | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Skill | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/skills')
    const data = await res.json()
    setSkills(data.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = tab === 'all' ? skills : skills.filter((s) => s.type === tab)

  const saveSkill = async (data: Partial<Skill>) => {
    const isEdit = !!editing?.id
    const res = await fetch(isEdit ? `/api/skills/${editing.id}` : '/api/skills', {
      method:  isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    const json = await res.json()
    if (res.ok) {
      toast.success(isEdit ? 'Skill updated' : 'Skill created')
      setShowForm(false)
      setEditing(null)
      load()
    } else {
      toast.error(json.error ?? 'Failed to save')
    }
  }

  const deleteSkill = async (skill: Skill) => {
    if (!confirm(`Delete "${skill.name}"?`)) return
    const res  = await fetch(`/api/skills/${skill.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) { toast.success('Deleted'); load() }
    else { toast.error(data.error ?? 'Delete failed') }
  }

  const toggleDefault = async (skill: Skill) => {
    const res = await fetch(`/api/skills/${skill.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ is_default: !skill.is_default }),
    })
    if (res.ok) { toast.success(skill.is_default ? 'Removed as default' : 'Set as default'); load() }
    else { toast.error('Update failed') }
  }

  const toggleActive = async (skill: Skill) => {
    const res = await fetch(`/api/skills/${skill.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ is_active: !skill.is_active }),
    })
    if (res.ok) { load() }
  }

  const openEdit = (skill: Skill) => { setEditing(skill); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-indigo-600" />
            <h1 className="text-2xl font-bold text-slate-900">Skills</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Configure the AI instructions used when searching for contacts and drafting email content.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Skill
        </button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(TYPE_META).map(([type, meta]) => {
          const Icon  = meta.icon
          const count = skills.filter((s) => s.type === type).length
          const def   = skills.find((s) => s.type === type && s.is_default)
          return (
            <div key={type} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
              <div className="p-2 bg-slate-100 rounded-lg shrink-0 h-fit">
                <Icon className={`w-4 h-4 ${meta.color}`} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{meta.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{meta.desc}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {count} skill{count !== 1 ? 's' : ''}
                  {def ? <span className="ml-2 text-indigo-600">· Default: <strong>{def.name}</strong></span> : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wand2 className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-800">{editing ? `Edit: ${editing.name}` : 'New Skill'}</h2>
          </div>
          <SkillForm
            initial={editing ?? {}}
            onSave={saveSkill}
            onCancel={closeForm}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([['all', 'All'], ['contact_search', 'Contact Search'], ['email_draft', 'Email Drafting']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${tab === v ? 'bg-white text-slate-900 font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Skills list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <FlaskConical className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">No skills yet</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
            <Plus className="w-4 h-4" /> Create one
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onEdit={openEdit}
              onDelete={deleteSkill}
              onToggleDefault={toggleDefault}
              onToggleActive={toggleActive}
            />
          ))}
        </div>
      )}
    </div>
  )
}
