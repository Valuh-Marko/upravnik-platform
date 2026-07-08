// Prisma `select` projection for exposing a User over the API without leaking passwordHash.
export const SAFE_USER_SELECT = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  accountType: true,
  systemRole: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
