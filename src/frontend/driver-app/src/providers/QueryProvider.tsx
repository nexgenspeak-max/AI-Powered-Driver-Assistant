import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Exported (not just used internally) so plain, non-React modules that run
// outside the component tree — apiClient.ts, wakeWordService.ts — can peek
// at the cached ['me'] profile via queryClient.getQueryData() instead of
// needing their own copy of it (the profile is intentionally not persisted
// anywhere else, see authStore.ts).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
