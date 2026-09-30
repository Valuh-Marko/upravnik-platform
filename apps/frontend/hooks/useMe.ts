import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api/auth'

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
    staleTime: 5 * 60 * 1000,
  })
}
