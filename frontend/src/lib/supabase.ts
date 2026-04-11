import { createClient } from '@supabase/supabase-js'

// Lazy initialisation — avoids "supabaseUrl is required" errors at build time
// when env vars are not available during static page collection.

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return url
}

function getAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  return key
}

export function getSupabase() {
  return createClient(getSupabaseUrl(), getAnonKey())
}

export function getSupabaseAdmin() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? getAnonKey()
  )
}

// Convenience aliases — lazily create the client on first property access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase      = new Proxy({} as ReturnType<typeof getSupabase>,      { get: (_, p) => (getSupabase()      as any)[p] })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = new Proxy({} as ReturnType<typeof getSupabaseAdmin>, { get: (_, p) => (getSupabaseAdmin() as any)[p] })
