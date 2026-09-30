import api from '@/lib/axios'
import type { BulkCreateDto, BulkCreateResponse } from '@/lib/types'

export const setupApi = {
  bulkCreate: (dto: BulkCreateDto) =>
    api.post<BulkCreateResponse>('/setup/bulk', dto).then((r) => r.data),
}
