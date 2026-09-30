import api from '@/lib/axios'
import type { Announcement, CreateAnnouncementDto } from '@/lib/types'

export const announcementsApi = {
  getAllForUser: (params?: { buildingId?: string }) =>
    api.get<Announcement[]>('/announcements', { params }).then((r) => r.data),
  getAll: (buildingId: string) =>
    api.get<Announcement[]>(`/buildings/${buildingId}/announcements`).then((r) => r.data),
  getOne: (buildingId: string, id: string) =>
    api.get<Announcement>(`/buildings/${buildingId}/announcements/${id}`).then((r) => r.data),
  create: (buildingId: string, dto: CreateAnnouncementDto) =>
    api.post<Announcement>(`/buildings/${buildingId}/announcements`, dto).then((r) => r.data),
  patch: (buildingId: string, id: string, dto: { isPinned: boolean }) =>
    api.patch<Announcement>(`/buildings/${buildingId}/announcements/${id}`, dto).then((r) => r.data),
}
