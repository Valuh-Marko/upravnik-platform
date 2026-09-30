import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { threadsApi } from '@/lib/api/threads'
import type { CreateThreadDto, CreateReplyDto, ComplexThread } from '@/lib/types'

export function useAllThreads(params?: { buildingId?: string; status?: 'OPEN' | 'CLOSED' }) {
  return useQuery({
    queryKey: ['threads', 'all', params],
    queryFn: () => threadsApi.getAllForUser(params),
    staleTime: 30 * 1000,
  })
}

export function useThreads(buildingId: string) {
  return useQuery({
    queryKey: ['threads', buildingId],
    queryFn: () => threadsApi.getAll(buildingId),
    enabled: !!buildingId,
    staleTime: 30 * 1000,
  })
}

export function useThread(buildingId: string, threadId: string) {
  return useQuery({
    queryKey: ['threads', buildingId, threadId],
    queryFn: () => threadsApi.getOne(buildingId, threadId),
    enabled: !!buildingId && !!threadId,
  })
}

export function useCreateThread(buildingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateThreadDto) => threadsApi.create(buildingId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['threads', buildingId] }),
  })
}

export function useCreateReply(buildingId: string, threadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateReplyDto) => threadsApi.createReply(buildingId, threadId, dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['threads', buildingId, threadId] }),
  })
}

export function useComplexThreads(complexId: string) {
  return useQuery({
    queryKey: ['complexThreads', complexId],
    queryFn: () => threadsApi.getAllForComplex(complexId),
    enabled: !!complexId,
    staleTime: 0,
  })
}

export function useComplexThread(complexId: string, threadId: string) {
  return useQuery({
    queryKey: ['complexThreads', complexId, threadId],
    queryFn: () => threadsApi.getOneForComplex(complexId, threadId),
    enabled: !!complexId && !!threadId,
  })
}

export function useCreateComplexThread(complexId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateThreadDto) => threadsApi.createForComplex(complexId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['complexThreads', complexId] }),
  })
}

export function useCreateComplexReply(complexId: string, threadId: string) {
  return useMutation({
    mutationFn: (dto: CreateReplyDto) =>
      threadsApi.createReplyForComplex(complexId, threadId, dto),
  })
}

export function useCloseComplexThread(complexId: string, threadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => threadsApi.closeComplexThread(complexId, threadId),
    onSuccess: (updatedThread) => {
      queryClient.setQueryData(['complexThreads', complexId, threadId], updatedThread)
      queryClient.invalidateQueries({ queryKey: ['complexThreads', complexId] })
    },
  })
}

export type { ComplexThread }
