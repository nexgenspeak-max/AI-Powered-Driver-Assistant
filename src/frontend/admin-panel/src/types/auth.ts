export interface Admin {
  id: string
  name: string
  email: string
  status: 'online' | 'offline' | 'locked'
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  // auth-service's admin login path looks accounts up by email only (not scoped by
  // role), so this can legitimately come back as 'driver' | 'customer' — callers
  // must check it, not assume 'admin'.
  user: Admin & { role: 'admin' | 'driver' | 'customer'; permissions: string[] }
}
