import { ForbiddenException } from '@nestjs/common';
import { Role } from '../prisma';
import { PrismaService } from '../prisma/prisma.service';

const SUPER_ADMIN = 'SUPER_ADMIN';

// Resolves the caller's role in a building, or throws ForbiddenException if they aren't a member.
export async function requireBuildingMember(
  prisma: PrismaService,
  buildingId: string,
  userId: string,
  systemRole?: string | null,
): Promise<Role> {
  if (systemRole === SUPER_ADMIN) return Role.UPRAVNIK;

  const member = await prisma.buildingMember.findUnique({
    where: { buildingId_userId: { buildingId, userId } },
  });

  if (!member) throw new ForbiddenException();
  return member.role;
}
