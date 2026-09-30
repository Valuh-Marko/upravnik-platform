import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { complexesApi } from '@/lib/api/complexes'
import type { CreateComplexDto } from '@/lib/types'

export function useComplexes() {
  return useQuery({
    queryKey: ['complexes'],
    queryFn: complexesApi.getAll,
  })
}

export function useComplex(id: string) {
  return useQuery({
    queryKey: ['complexes', id],
    queryFn: () => complexesApi.getOne(id),
    enabled: !!id,
  })
}

export function useCreateComplex() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateComplexDto) => complexesApi.create(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['complexes'] }),
  })
}
