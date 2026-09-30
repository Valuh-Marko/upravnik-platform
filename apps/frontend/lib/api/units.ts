import api from '@/lib/axios'
import type { Unit, CreateUnitDto } from '@/lib/types'

export const unitsApi = {
  create: (buildingId: string, dto: CreateUnitDto) =>
    api.post<Unit>(`/buildings/${buildingId}/units`, dto).then((r) => r.data),

  getAll: (buildingId: string) =>
    api.get<Unit[]>(`/buildings/${buildingId}/units`).then((r) => r.data),

  getOne: (buildingId: string, unitId: string) =>
    api.get<Unit>(`/buildings/${buildingId}/units/${unitId}`).then((r) => r.data),
}
