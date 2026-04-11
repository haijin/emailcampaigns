'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Upload,
  Users,
  Mail,
  PlusCircle,
  Send,
} from 'lucide-react'

const nav = [
  { href: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/upload',    label: 'Import File', icon: Upload },
  { href: '/agents',    label: 'Agents',      icon: Users },
  { href: '/campaigns', label: 'Campaigns',   icon: Mail },
  { href: '/campaigns/new', label: 'New Campaign', icon: PlusCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Send className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">TES Campaigns</p>
            <p className="text-xs text-slate-400">Email Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-700">
        <p className="text-xs text-slate-500">TES Active Agents</p>
      </div>
    </aside>
  )
}
