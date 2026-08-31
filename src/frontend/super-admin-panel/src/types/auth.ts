export interface OpsUser {
  id: string
  name: string
  email: string
  status: 'online' | 'offline' | 'locked'
  created_at: string
  updated_at: string
}

export type AuthUser = OpsUser & {
  role: 'admin' | 'super_admin' | 'driver' | 'customer'
  permissions: string[]
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}
