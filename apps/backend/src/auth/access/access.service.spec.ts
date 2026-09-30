import { AccountType, Role, SystemRole } from '../../prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from './access.service';
import { AuthUser } from './auth-user';

const user: AuthUser = {
  id: 'u1',
  username: 'u1',
  accountType: AccountType.SYSTEM_USER,
  systemRole: null,
};
const superAdmin: AuthUser = { ...user, systemRole: SystemRole.SUPER_ADMIN };

describe('AccessService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    buildingMember: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const service = new AccessService(prisma as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  describe('loadUser', () => {
    const row = {
      id: 'u1',
      username: 'u1',
      accountType: AccountType.SYSTEM_USER,
      systemRole: null,
      isActive: true,
      passwordChangedAt: null as Date | null,
    };

    it('returns the user for an active account', async () => {
      prisma.user.findUnique.mockResolvedValue(row);
      await expect(service.loadUser('u1', 100)).resolves.toEqual(user);
    });

    it('returns null for a missing or disabled account', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.loadUser('u1')).resolves.toBeNull();
      prisma.user.findUnique.mockResolvedValue({ ...row, isActive: false });
      await expect(service.loadUser('u1')).resolves.toBeNull();
    });

    it('rejects tokens issued before the last password change', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...row,
        passwordChangedAt: new Date(100_500), // second 100
      });
      await expect(service.loadUser('u1', 99)).resolves.toBeNull();
      // Same second as the change: still valid (iat has second granularity).
      await expect(service.loadUser('u1', 100)).resolves.toEqual(user);
    });
  });

  describe('resolveBuildingRole', () => {
    it('treats SUPER_ADMIN as UPRAVNIK without a lookup', async () => {
      await expect(service.resolveBuildingRole(superAdmin, 'b1')).resolves.toBe(
        Role.UPRAVNIK,
      );
      expect(prisma.buildingMember.findFirst).not.toHaveBeenCalled();
    });

    it('only looks at active memberships and returns null for non-members', async () => {
      prisma.buildingMember.findFirst.mockResolvedValue(null);
      await expect(service.resolveBuildingRole(user, 'b1')).resolves.toBeNull();
      expect(prisma.buildingMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { buildingId: 'b1', userId: 'u1', isActive: true },
        }),
      );
    });
  });

  describe('resolveComplexRole', () => {
    it('returns the highest role across the complex', async () => {
      prisma.buildingMember.findMany.mockResolvedValue([
        { role: Role.RESIDENT },
        { role: Role.BOARD_MEMBER },
        { role: Role.RESIDENT },
      ]);
      await expect(service.resolveComplexRole(user, 'c1')).resolves.toBe(
        Role.BOARD_MEMBER,
      );
    });

    it('returns null without memberships', async () => {
      prisma.buildingMember.findMany.mockResolvedValue([]);
      await expect(service.resolveComplexRole(user, 'c1')).resolves.toBeNull();
    });
  });
});
