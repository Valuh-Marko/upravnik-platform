import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';
import { PrismaClient, AccountType, Role, SystemRole } from '@prisma/client';

const HASH_ROUNDS = 10;

export async function createSystemUser(
  prisma: PrismaClient,
  overrides: {
    email?: string;
    password?: string;
    systemRole?: SystemRole;
    firstName?: string;
    lastName?: string;
  } = {},
) {
  const email = overrides.email ?? faker.internet.email().toLowerCase();
  const plainPassword = overrides.password ?? 'Password123!';

  const user = await prisma.user.create({
    data: {
      username: email,
      email,
      passwordHash: await bcrypt.hash(plainPassword, HASH_ROUNDS),
      accountType: AccountType.SYSTEM_USER,
      systemRole: overrides.systemRole ?? null,
      firstName: overrides.firstName ?? faker.person.firstName(),
      lastName: overrides.lastName ?? faker.person.lastName(),
      phone: faker.phone.number(),
    },
  });

  return { ...user, plainPassword };
}

export async function createUnitAccount(
  prisma: PrismaClient,
  unitId: string,
  buildingId: string,
  overrides: { unitNumber?: string; password?: string } = {},
) {
  const unitNumber = overrides.unitNumber ?? faker.string.alphanumeric(3).toUpperCase();
  const plainPassword = overrides.password ?? 'Resident123!';

  const user = await prisma.user.create({
    data: {
      username: unitNumber,
      email: faker.internet.email().toLowerCase(),
      passwordHash: await bcrypt.hash(plainPassword, HASH_ROUNDS),
      accountType: AccountType.UNIT_ACCOUNT,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      unit: { connect: { id: unitId } },
    },
  });

  await prisma.buildingMember.create({
    data: { buildingId, userId: user.id, role: Role.RESIDENT, unitId },
  });

  await prisma.unit.update({ where: { id: unitId }, data: { userId: user.id } });

  return { ...user, plainPassword };
}
