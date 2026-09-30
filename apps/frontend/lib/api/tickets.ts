import api from '@/lib/axios'
import type { Ticket, TicketReply, CreateTicketDto, CreateReplyDto } from '@/lib/types'

export const ticketsApi = {
  getAllForUser: (params?: { buildingId?: string; status?: 'OPEN' | 'CLOSED' }) =>
    api.get<Ticket[]>('/tickets', { params }).then((r) => r.data),
  getAll: (buildingId: string) =>
    api.get<Ticket[]>(`/buildings/${buildingId}/tickets`).then((r) => r.data),
  getOne: (buildingId: string, id: string) =>
    api.get<Ticket>(`/buildings/${buildingId}/tickets/${id}`).then((r) => r.data),
  create: (buildingId: string, dto: CreateTicketDto) =>
    api.post<Ticket>(`/buildings/${buildingId}/tickets`, dto).then((r) => r.data),
  createReply: (buildingId: string, ticketId: string, dto: CreateReplyDto) =>
    api
      .post<TicketReply>(`/buildings/${buildingId}/tickets/${ticketId}/replies`, dto)
      .then((r) => r.data),
  close: (buildingId: string, ticketId: string) =>
    api
      .patch<Ticket>(`/buildings/${buildingId}/tickets/${ticketId}/close`)
      .then((r) => r.data),
}
