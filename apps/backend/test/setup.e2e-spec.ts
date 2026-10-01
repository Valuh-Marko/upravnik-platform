import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createTestApp, Fixture, seed } from './fixtures';

// Bulk provisioning: unit numbers are unique per building.
describe('Setup (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;

  beforeAll(async () => {
    app = await createTestApp();
    f = await seed(app);
  });

  afterAll(() => app.close());

  const building = (name: string, unitNumbers: string[]) => ({
    name,
    address: `${name} 1`,
    city: 'Novi Sad',
    units: unitNumbers.map((unitNumber) => ({ unitNumber, type: 'APARTMENT' })),
  });
  const bulk = (body: object) => f.as('superAdmin').post('/setup/bulk', body);

  it('only SUPER_ADMIN may provision', async () => {
    await f
      .as('upravnikA')
      .post('/setup/bulk', { buildings: [building('X', ['1'])] })
      .expect(403);
  });

  it('creates a complex with buildings and units', async () => {
    const res = await bulk({
      complex: { name: 'Blok 7', address: 'Bulevar 7', city: 'Novi Sad' },
      buildings: [
        building('Lamela 1', ['1', '2']),
        building('Lamela 2', ['1']),
      ],
    }).expect(201);

    expect(res.body).toMatchObject({
      complex: { name: 'Blok 7' },
      buildings: [
        { name: 'Lamela 1', unitCount: 2 },
        { name: 'Lamela 2', unitCount: 1 },
      ],
      totalUnits: 3,
    });
  });

  it('rejects duplicate unit numbers within a building and creates nothing', async () => {
    const before = await f.prisma.building.count();
    const res = await bulk({
      buildings: [building('Dupla', ['1', '2', '2'])],
    }).expect(400);

    expect((res.body as { message: string[] }).message).toEqual([
      'Dupla: duplirani brojevi jedinica 2',
    ]);
    expect(await f.prisma.building.count()).toBe(before);
  });

  it('rejects more than 1000 units in one building', async () => {
    const numbers = Array.from({ length: 1001 }, (_, i) => String(i + 1));
    await bulk({ buildings: [building('Velika', numbers)] }).expect(400);
  });

  it('rejects a second unit with an existing number (409)', async () => {
    await f.prisma.unit.create({
      data: { buildingId: f.buildingS, unitNumber: '9', type: 'APARTMENT' },
    });
    await f
      .as('superAdmin')
      .post(`/buildings/${f.buildingS}/units`, {
        unitNumber: '9',
        type: 'APARTMENT',
      })
      .expect(409);
  });
});
