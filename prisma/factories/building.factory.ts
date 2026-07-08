import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

export function createBuilding(
  prisma: PrismaClient,
  overrides: { complexId?: string; name?: string; address?: string; city?: string } = {},
) {
  return prisma.building.create({
    data: {
      complexId: overrides.complexId ?? null,
      name: overrides.name ?? `Zgrada ${faker.string.alpha({ length: 1, casing: 'upper' })}`,
      address: overrides.address ?? faker.location.streetAddress(),
      city: overrides.city ?? faker.helpers.arrayElement(['Beograd', 'Novi Sad', 'Niš', 'Kragujevac']),
    },
  });
}
