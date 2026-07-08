import api from '@/lib/axios'
import type { Building, CreateBuildingDto } from '@/lib/types'

export const buildingsApi = {
  getAll: () => api.get<Building[]>('/buildings').then((r) => r.data),
  getOne: (id: string) => api.get<Building>(`/buildings/${id}`).then((r) => r.data),
  create: (dto: CreateBuildingDto) => api.post<Building>('/buildings', dto).then((r) => r.data),
}
