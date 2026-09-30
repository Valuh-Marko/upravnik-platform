import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

export function createComplex(prisma: PrismaClient, overrides: { name?: string; address?: string; city?: string } = {}) {
  return prisma.complex.create({
    data: {
      name: overrides.name ?? `Stambeni Kompleks ${faker.location.street()}`,
      address: overrides.address ?? faker.location.streetAddress(),
      city: overrides.city ?? faker.helpers.arrayElement(['Beograd', 'Novi Sad', 'Niš', 'Kragujevac']),
    },
  });
}
