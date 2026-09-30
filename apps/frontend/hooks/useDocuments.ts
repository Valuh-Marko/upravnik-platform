import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '@/lib/api/documents'

export function useDocuments(buildingId: string) {
  return useQuery({
    queryKey: ['documents', buildingId],
    queryFn: () => documentsApi.getAll(buildingId),
    enabled: !!buildingId,
    staleTime: 30 * 1000,
  })
}
