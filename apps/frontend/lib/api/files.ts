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

/** Points a tab opened before an await at `url`. When a popup blocker gave no tab, a link downloads it instead. */
export function showFile(tab: Window | null, url: string, fileName?: string) {
  if (tab) {
    tab.location.href = url
    return
  }
  const link = document.createElement('a')
  link.href = url
  if (fileName) link.download = fileName
  link.click()
}

/** Opens a stored file in a new tab. The tab opens synchronously so popup blockers allow it. */
export async function openStoredFile(buildingId: string, fileId: string) {
  const tab = window.open('', '_blank')
  try {
    showFile(tab, await filesApi.downloadUrl(buildingId, fileId))
  } catch (err) {
    tab?.close()
    throw err
  }
}
