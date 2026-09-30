import api from '@/lib/axios'
import type { Thread, ThreadReply, ComplexThread, ComplexThreadReply, CreateThreadDto, CreateReplyDto } from '@/lib/types'

export const threadsApi = {
  getAllForUser: (params?: { buildingId?: string; status?: 'OPEN' | 'CLOSED' }) =>
    api.get<Thread[]>('/threads', { params }).then((r) => r.data),
  getAll: (buildingId: string) =>
    api.get<Thread[]>(`/buildings/${buildingId}/threads`).then((r) => r.data),
  getOne: (buildingId: string, id: string) =>
    api.get<Thread>(`/buildings/${buildingId}/threads/${id}`).then((r) => r.data),
  create: (buildingId: string, dto: CreateThreadDto) =>
    api.post<Thread>(`/buildings/${buildingId}/threads`, dto).then((r) => r.data),
  createReply: (buildingId: string, threadId: string, dto: CreateReplyDto) =>
    api
      .post<ThreadReply>(`/buildings/${buildingId}/threads/${threadId}/replies`, dto)
      .then((r) => r.data),
  close: (buildingId: string, threadId: string) =>
    api.patch<Thread>(`/buildings/${buildingId}/threads/${threadId}/close`).then((r) => r.data),
  getAllForComplex: (complexId: string) =>
    api.get<ComplexThread[]>(`/complexes/${complexId}/threads`).then((r) => r.data),
  getOneForComplex: (complexId: string, threadId: string) =>
    api.get<ComplexThread>(`/complexes/${complexId}/threads/${threadId}`).then((r) => r.data),
  createForComplex: (complexId: string, dto: CreateThreadDto) =>
    api.post<ComplexThread>(`/complexes/${complexId}/threads`, dto).then((r) => r.data),
  createReplyForComplex: (complexId: string, threadId: string, dto: CreateReplyDto) =>
    api
      .post<ComplexThreadReply>(`/complexes/${complexId}/threads/${threadId}/replies`, dto)
      .then((r) => r.data),
  closeComplexThread: (complexId: string, threadId: string) =>
    api
      .patch<ComplexThread>(`/complexes/${complexId}/threads/${threadId}/close`)
      .then((r) => r.data),
}
