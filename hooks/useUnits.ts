import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unitsApi } from '@/lib/api/units'
import type { CreateUnitDto } from '@/lib/types'

export function useUnits(buildingId: string) {
  return useQuery({
    queryKey: ['units', buildingId],
    queryFn: () => unitsApi.getAll(buildingId),
    enabled: !!buildingId,
  })
}

export function useUnit(buildingId: string, unitId: string) {
  return useQuery({
    queryKey: ['units', buildingId, unitId],
    queryFn: () => unitsApi.getOne(buildingId, unitId),
    enabled: !!buildingId && !!unitId,
  })
}

export function useCreateUnit(buildingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateUnitDto) => unitsApi.create(buildingId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units', buildingId] }),
  })
}
