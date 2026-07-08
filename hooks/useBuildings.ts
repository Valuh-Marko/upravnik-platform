import { useQuery } from '@tanstack/react-query'
import { buildingsApi } from '@/lib/api/buildings'

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: buildingsApi.getAll,
  })
}

export function useBuilding(id: string) {
  return useQuery({
    queryKey: ['buildings', id],
    queryFn: () => buildingsApi.getOne(id),
    enabled: !!id,
  })
}
