import api from '@/lib/axios'
import type { Notification } from '@/lib/types'

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications').then((r) => r.data),
  markRead: (id: string) =>
    api.patch<Notification>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.patch('/notifications/read-all').then((r) => r.data),
}
