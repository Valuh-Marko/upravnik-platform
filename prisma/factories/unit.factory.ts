import { faker } from '@faker-js/faker';
import { PrismaClient, UnitType } from '@prisma/client';

export function createUnit(
  prisma: PrismaClient,
  buildingId: string,
  overrides: { unitNumber?: string; floor?: number; type?: UnitType; residentCount?: number } = {},
) {
  const floor = overrides.floor ?? faker.number.int({ min: 1, max: 10 });
  return prisma.unit.create({
    data: {
      buildingId,
      unitNumber: overrides.unitNumber ?? `${floor}-${faker.string.alpha({ length: 1, casing: 'upper' })}`,
      floor,
      residentCount: overrides.residentCount ?? faker.number.int({ min: 1, max: 4 }),
      type: overrides.type ?? UnitType.APARTMENT,
      areaSqm: faker.number.float({ min: 30, max: 120, fractionDigits: 1 }),
    },
  });
}
