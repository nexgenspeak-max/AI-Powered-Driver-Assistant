import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { driversService } from '../../../services/api/drivers'

export const useDriverLogin = () => {
  const setDriver = useAuthStore(s => s.setDriver)
  return useMutation({
    mutationFn: (data: { name: string; phone: string }) => driversService.login(data),
    onSuccess: driver => setDriver(driver),
  })
}
