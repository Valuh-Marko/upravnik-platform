import { Injectable } from '@nestjs/common';
import { Role } from '../../prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser, isSuperAdmin } from './auth-user';

const ROLE_RANK: Record<Role, number> = {
  [Role.RESIDENT]: 0,
  [Role.BOARD_MEMBER]: 1,
  [Role.UPRAVNIK]: 2,
};

// The single place that turns (user, building | complex) into a role.
// Used by AccessGuard (HTTP) and ChatGateway (WebSocket).
@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  // Loads the user behind a token. Returns null if the account is missing, disabled,
  // or the token was issued before the last password change.
  async loadUser(userId: string, issuedAt?: number): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return null;
    if (
      user.passwordChangedAt &&
      issuedAt !== undefined &&
      issuedAt < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      return null;
    }
    return {
      id: user.id,
      username: user.username,
      accountType: user.accountType,
      systemRole: user.systemRole ?? null,
    };
  }

  // SUPER_ADMIN counts as UPRAVNIK everywhere. Returns null for non-members and inactive memberships.
  async resolveBuildingRole(
    user: AuthUser,
    buildingId: string,
  ): Promise<Role | null> {
    if (isSuperAdmin(user)) return Role.UPRAVNIK;
    const member = await this.prisma.buildingMember.findFirst({
      where: { buildingId, userId: user.id, isActive: true },
      select: { role: true },
    });
    return member?.role ?? null;
  }

  // Highest role the user holds across the complex's buildings.
  async resolveComplexRole(
    user: AuthUser,
    complexId: string,
  ): Promise<Role | null> {
    if (isSuperAdmin(user)) return Role.UPRAVNIK;
    const members = await this.prisma.buildingMember.findMany({
      where: { userId: user.id, isActive: true, building: { complexId } },
      select: { role: true },
    });
    return members.reduce<Role | null>(
      (best, m) =>
        best && ROLE_RANK[best] >= ROLE_RANK[m.role] ? best : m.role,
      null,
    );
  }
}
