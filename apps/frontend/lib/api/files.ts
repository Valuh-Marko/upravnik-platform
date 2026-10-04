import api from '@/lib/axios'
import type { StoredFileInfo } from '@/lib/types'

export const filesApi = {
  upload: (buildingId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    // Overrides the JSON default; axios then lets the browser set the boundary.
    return api
      .post<StoredFileInfo>(`/buildings/${buildingId}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  downloadUrl: (buildingId: string, fileId: string) =>
    api
      .get<{ url: string }>(`/buildings/${buildingId}/files/${fileId}/download`)
      .then((r) => r.data.url),
}
