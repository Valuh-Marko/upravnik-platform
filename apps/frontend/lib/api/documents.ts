import api from '@/lib/axios'
import type { Document, CreateDocumentDto } from '@/lib/types'

export const documentsApi = {
  getAll: (buildingId: string) =>
    api.get<Document[]>(`/buildings/${buildingId}/documents`).then((r) => r.data),
  getOne: (buildingId: string, id: string) =>
    api.get<Document>(`/buildings/${buildingId}/documents/${id}`).then((r) => r.data),
  create: (buildingId: string, dto: CreateDocumentDto) =>
    api.post<Document>(`/buildings/${buildingId}/documents`, dto).then((r) => r.data),
}
