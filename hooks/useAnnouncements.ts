import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsApi } from '@/lib/api/announcements'
import type { CreateAnnouncementDto } from '@/lib/types'

export function useAllAnnouncements(params?: { buildingId?: string }) {
  return useQuery({
    queryKey: ['announcements', 'all', params],
    queryFn: () => announcementsApi.getAllForUser(params),
    staleTime: 30 * 1000,
  })
}

export function useAnnouncements(buildingId: string) {
  return useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: () => announcementsApi.getAll(buildingId),
    enabled: !!buildingId,
    staleTime: 30 * 1000,
  })
}

export function useCreateAnnouncement(buildingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateAnnouncementDto) => announcementsApi.create(buildingId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements', buildingId] }),
  })
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      buildingId,
      id,
      isPinned,
    }: {
      buildingId: string
      id: string
      isPinned: boolean
    }) => announcementsApi.patch(buildingId, id, { isPinned }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })
}
