import { useMutation, useQueryClient } from '@tanstack/react-query'
import { driversService } from '../../../services/api/drivers'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'
import { haptics } from '../../../utils/haptics'
import type { Driver } from '../../../types'

// One place that flips the driver online/offline — used by the Chuyến header
// toggle and the map's GoOnlineCard. Optimistic on ['me'] so the switch moves
// instantly; rolled back on failure; driverContext refetched on settle.
export function useOnlineToggle() {
  const qc = useQueryClient()
  const { data: driver } = useCurrentUser()
  const isOnline = driver?.status === 'online'

  const mutation = useMutation({
    mutationFn: (online: boolean) => {
      if (!driver) throw new Error('driver not loaded')
      return driversService.update(driver.phone, { status: online ? 'online' : 'offline' })
    },
    onMutate: async online => {
      await qc.cancelQueries({ queryKey: ['me'] })
      const previous = qc.getQueryData<Driver>(['me'])
      qc.setQueryData<Driver | undefined>(['me'], old =>
        old ? { ...old, status: online ? 'online' : 'offline' } : old,
      )
      return { previous }
    },
    onError: (_err, _online, ctx) => {
      if (ctx?.previous) qc.setQueryData(['me'], ctx.previous)
      haptics.error()
    },
    onSuccess: d => {
      qc.setQueryData(['me'], d)
      haptics.success()
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['driverContext'] })
    },
  })

  return {
    isOnline,
    ready: !!driver,
    pending: mutation.isPending,
    setOnline: (online: boolean) => mutation.mutate(online),
  }
}
