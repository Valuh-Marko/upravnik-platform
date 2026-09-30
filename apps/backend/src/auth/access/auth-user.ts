import { AccountType, Role, SystemRole } from '../../prisma';

// The authenticated caller, as returned by JwtStrategy.validate().
export interface AuthUser {
  id: string;
  username: string;
  accountType: AccountType;
  systemRole: SystemRole | null;
}

// The caller's resolved role for the building/complex in the route.
// Set by AccessGuard on @InBuilding / @InComplex routes.
export interface Access {
  role: Role;
  isSuperAdmin: boolean;
  buildingId?: string;
  complexId?: string;
}

// The request fields the auth layer reads and sets.
export interface AuthRequest {
  user: AuthUser;
  access?: Access;
  params: Record<string, string>;
}

export function isSuperAdmin(user: Pick<AuthUser, 'systemRole'>) {
  return user.systemRole === SystemRole.SUPER_ADMIN;
}
