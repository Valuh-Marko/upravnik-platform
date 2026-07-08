import api from '@/lib/axios'
import type { CreateSystemUserDto, CreateUnitAccountDto, ResetPasswordDto } from '@/lib/types'

export const usersApi = {
  createSystemUser: (dto: CreateSystemUserDto) =>
    api.post('/users/system', dto).then((r) => r.data),

  createUnitAccount: (buildingId: string, dto: CreateUnitAccountDto) =>
    api.post(`/users/unit/${buildingId}`, dto).then((r) => r.data),

  resetPassword: (userId: string, dto: ResetPasswordDto) =>
    api.post(`/users/${userId}/reset-password`, dto).then((r) => r.data),
}
