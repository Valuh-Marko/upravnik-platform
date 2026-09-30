import api from '@/lib/axios'
import type { LoginDto, LoginResponse, MeResponse } from '@/lib/types'

export const authApi = {
  login: (dto: LoginDto) =>
    api.post<LoginResponse>('/auth/login', dto).then((r) => r.data),
  me: () =>
    api.get<MeResponse>('/auth/me').then((r) => r.data),
}
