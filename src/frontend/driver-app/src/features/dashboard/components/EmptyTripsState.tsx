import { EmptyState } from '../../../components/EmptyState'

export function EmptyTripsState({ isOnline }: { isOnline: boolean }) {
  return (
    <EmptyState
      icon={isOnline ? 'checkmark-circle-outline' : 'power-outline'}
      title={isOnline ? 'No trips right now' : 'You are offline'}
      message={isOnline ? 'Waiting for new assignments...' : 'Toggle Online to start receiving trips'}
    />
  )
}
