import api from '@/lib/axios'
import type { Complex, CreateComplexDto } from '@/lib/types'

export const complexesApi = {
  create: (dto: CreateComplexDto) => api.post<Complex>('/complexes', dto).then((r) => r.data),
  getAll: () => api.get<Complex[]>('/complexes').then((r) => r.data),
  getOne: (id: string) => api.get<Complex>(`/complexes/${id}`).then((r) => r.data),
}
