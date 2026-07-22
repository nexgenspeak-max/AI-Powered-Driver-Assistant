export interface Admin {
  id: string
  name: string
  email: string
  status: 'online' | 'offline' | 'locked'
  created_at: string
  updated_at: string
}

// Login is token-only now (see services/api/auth.ts) — the profile is
// fetched separately via me(), which returns this shape.
// auth-service's admin login path looks accounts up by email only (not scoped by
// role), so this can legitimately come back as 'driver' | 'customer' — callers
// must check it, not assume 'admin'.
export type AuthUser = Admin & { role: 'admin' | 'driver' | 'customer'; permissions: string[] }

export interface AuthTokens {
  access_token: string
  refresh_token: string
}
