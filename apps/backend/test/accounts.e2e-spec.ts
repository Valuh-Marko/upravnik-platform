import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { createTestApp, Fixture, PASSWORD, seed } from './fixtures';

// Password reset (S1, H4), deactivation (R1) and login throttling (H1).
describe('Accounts (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;

  beforeAll(async () => {
    app = await createTestApp();
    f = await seed(app);
  });

  afterAll(() => app.close());

  const login = (username: string, password = PASSWORD) =>
    f.http.post('/api/auth/login').send({ username, password });

  describe('reset unit account password (S1, H4)', () => {
    const reset = (userId: string, buildingId = f.buildingA) =>
      f
        .as('upravnikA')
        .post(`/users/${buildingId}/members/${userId}/reset-password`);

    it('refuses anyone but an active resident of the building', async () => {
      await reset(f.ids.boardA).expect(404);
      await reset(f.ids.upravnikA).expect(404);
      await reset(f.ids.inactiveA).expect(404);
      await reset(f.ids.residentB).expect(404);
      await reset(randomUUID()).expect(404);
    });

    it('only UPRAVNIK of that building may reset', async () => {
      await f
        .as('boardA')
        .post(
          `/users/${f.buildingA}/members/${f.ids.residentA1}/reset-password`,
        )
        .expect(403);
      await reset(f.ids.residentB, f.buildingB).expect(403);
    });

    it('issues a new password and revokes existing tokens', async () => {
      const res = await reset(f.ids.residentA1).expect(201);
      const { plainPassword } = res.body as { plainPassword: string };

      await f.as('residentA1').get('/auth/me').expect(401);
      await login('residentA1').expect(401);
      const fresh = await login('residentA1', plainPassword).expect(201);
      await f.http
        .get('/api/auth/me')
        .auth((fresh.body as { accessToken: string }).accessToken, {
          type: 'bearer',
        })
        .expect(200);
    });
  });

  describe('deactivate a building membership (R1)', () => {
    const member = (userId: string) =>
      `/buildings/${f.buildingA}/members/${userId}`;

    it('only UPRAVNIK may change memberships, and not of another UPRAVNIK', async () => {
      await f
        .as('boardA')
        .patch(member(f.ids.residentA2), { isActive: false })
        .expect(403);
      await f
        .as('upravnikA')
        .patch(member(f.ids.upravnikA), { isActive: false })
        .expect(403);
      await f
        .as('upravnikA')
        .patch(member(f.ids.residentB), { isActive: false })
        .expect(404);
    });

    it('cuts access to the building immediately and can be undone', async () => {
      await f
        .as('upravnikA')
        .patch(member(f.ids.residentA2), { isActive: false })
        .expect(200);
      await f.as('residentA2').get(`/buildings/${f.buildingA}`).expect(403);
      await f.as('residentA2').get('/auth/me').expect(200);

      await f
        .as('upravnikA')
        .patch(member(f.ids.residentA2), { isActive: true })
        .expect(200);
      await f.as('residentA2').get(`/buildings/${f.buildingA}`).expect(200);
    });
  });

  describe('disable an account (R1)', () => {
    it('is SUPER_ADMIN only', async () => {
      await f
        .as('upravnikA')
        .patch(`/users/${f.ids.residentB}`, { isActive: false })
        .expect(403);
    });

    it('rejects self-deactivation and unknown ids', async () => {
      await f
        .as('superAdmin')
        .patch(`/users/${f.ids.superAdmin}`, { isActive: false })
        .expect(400);
      await f
        .as('superAdmin')
        .patch(`/users/${randomUUID()}`, { isActive: false })
        .expect(404);
    });

    it('invalidates tokens and blocks login', async () => {
      await f
        .as('superAdmin')
        .patch(`/users/${f.ids.residentB}`, { isActive: false })
        .expect(200);
      await f.as('residentB').get('/auth/me').expect(401);
      await login('residentB').expect(401);
    });
  });

  describe('login throttling (H1)', () => {
    it('allows 5 attempts per IP and username per minute', async () => {
      for (let i = 0; i < 5; i++) {
        await login('outsider', 'wrong').expect(401);
      }
      await login('outsider', 'wrong').expect(429);
      // Other usernames are counted separately.
      await login('boardA').expect(201);
    });
  });
});
