import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketsApi } from '@/lib/api/tickets'
import type { CreateTicketDto, CreateReplyDto } from '@/lib/types'

export function useMyTickets(params?: { buildingId?: string; status?: 'OPEN' | 'CLOSED' }) {
  return useQuery({
    queryKey: ['tickets', 'my', params],
    queryFn: () => ticketsApi.getAllForUser(params),
    staleTime: 0,
  })
}

export function useAllTickets() {
  return useQuery({
    queryKey: ['tickets', 'all'],
    queryFn: () => ticketsApi.getAllForUser(),
    staleTime: 0,
  })
}

export function useTickets(buildingId: string) {
  return useQuery({
    queryKey: ['tickets', buildingId],
    queryFn: () => ticketsApi.getAll(buildingId),
    enabled: !!buildingId,
    staleTime: 0,
  })
}

export function useTicket(buildingId: string, ticketId: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['tickets', buildingId, ticketId],
    queryFn: () => ticketsApi.getOne(buildingId, ticketId),
    enabled: !!buildingId && !!ticketId,
  })

  useEffect(() => {
    if (!query.isSuccess) return
    queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] })
    queryClient.invalidateQueries({ queryKey: ['tickets', 'all'] })
    queryClient.invalidateQueries({ queryKey: ['tickets', buildingId] })
  }, [query.isSuccess, ticketId, queryClient, buildingId])

  return query
}

export function useCreateTicket(buildingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateTicketDto) => ticketsApi.create(buildingId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', buildingId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] })
    },
  })
}

export function useCreateTicketReply(buildingId: string, ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateReplyDto) => ticketsApi.createReply(buildingId, ticketId, dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['tickets', buildingId, ticketId] }),
  })
}

export function useCloseTicket(buildingId: string, ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => ticketsApi.close(buildingId, ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', buildingId, ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', buildingId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] })
    },
  })
}
