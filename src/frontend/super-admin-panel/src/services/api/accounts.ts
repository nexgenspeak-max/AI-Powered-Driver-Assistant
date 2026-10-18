import { authClient } from './authClient'

export type DispatcherAccount = {
  id: string
  name: string
  email?: string
  status: 'online' | 'offline' | 'locked'
  created_at?: string
}

/** Dispatcher (role=admin) accounts — identity-service lets only a super_admin create them. */
export const accountsService = {
  listDispatchers: () =>
    authClient.get<DispatcherAccount[]>('/accounts', { params: { role: 'admin' } }).then(r => r.data),
  createDispatcher: (body: { name: string; email: string; password: string }) =>
    authClient.post<DispatcherAccount>('/accounts', { role: 'admin', ...body }).then(r => r.data),
  setStatus: (id: string, status: 'offline' | 'locked') =>
    authClient.patch<DispatcherAccount>(`/accounts/${id}`, { status }).then(r => r.data),
}
