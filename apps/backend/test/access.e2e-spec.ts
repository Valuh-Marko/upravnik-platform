import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { Actor, createTestApp, Fixture, idOf, idsOf, seed } from './fixtures';

// Who may reach what. Covers the route-level policies, the ownership rules in
// policies.ts, and the error mapping (404 / 409 / 400).
describe('Access control (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;

  beforeAll(async () => {
    app = await createTestApp();
    f = await seed(app);
  });

  afterAll(() => app.close());

  const post = { title: 'Naslov', body: 'Tekst', category: 'GENERAL' };

  describe('authentication', () => {
    it('rejects requests without a token', async () => {
      await f.http.get(`/api/buildings/${f.buildingA}`).expect(401);
      await f.http.get('/api/auth/me').expect(401);
    });

    it('rejects a token signed with another secret', async () => {
      const [header, payload] = f.tokens.residentA1.split('.');
      await f.http
        .get('/api/auth/me')
        .auth(`${header}.${payload}.forged`, { type: 'bearer' })
        .expect(401);
    });
  });

  describe('building routes', () => {
    const readRoutes = (b: string) => [
      `/buildings/${b}`,
      `/buildings/${b}/units`,
      `/buildings/${b}/announcements`,
      `/buildings/${b}/documents`,
      `/buildings/${b}/threads`,
      `/buildings/${b}/tickets`,
    ];

    it.each<[Actor, number]>([
      ['superAdmin', 200],
      ['upravnikA', 200],
      ['boardA', 200],
      ['residentA1', 200],
      ['residentB', 403],
      ['inactiveA', 403],
      ['outsider', 403],
    ])('%s reading building A gets %i', async (actor, status) => {
      for (const url of readRoutes(f.buildingA)) {
        await f.as(actor).get(url).expect(status);
      }
    });

    it('only UPRAVNIK creates units', async () => {
      const unit = { unitNumber: 'X1', type: 'APARTMENT' };
      await f
        .as('boardA')
        .post(`/buildings/${f.buildingA}/units`, unit)
        .expect(403);
      await f
        .as('residentA1')
        .post(`/buildings/${f.buildingA}/units`, unit)
        .expect(403);
      await f
        .as('upravnikA')
        .post(`/buildings/${f.buildingA}/units`, unit)
        .expect(201);
    });

    it('only staff post announcements and documents', async () => {
      const ann = { title: 'Naslov', body: 'Tekst' };
      const doc = {
        title: 'Izveštaj',
        fileUrl: 'https://files.test/izvestaj.pdf',
        category: 'REPORT',
      };
      const a = `/buildings/${f.buildingA}`;
      await f.as('residentA1').post(`${a}/announcements`, ann).expect(403);
      await f.as('boardA').post(`${a}/announcements`, ann).expect(201);
      await f.as('residentA1').post(`${a}/documents`, doc).expect(403);
      await f.as('boardA').post(`${a}/documents`, doc).expect(201);
    });

    it('rejects non-https document URLs (H9)', async () => {
      await f
        .as('upravnikA')
        .post(`/buildings/${f.buildingA}/documents`, {
          title: 'x',
          fileUrl: 'javascript:alert(1)',
          category: 'OTHER',
        })
        .expect(400);
      await f
        .as('upravnikA')
        .post(`/buildings/${f.buildingA}/documents`, {
          title: 'x',
          fileUrl: 'http://files.test/a.pdf',
          category: 'OTHER',
        })
        .expect(400);
    });

    it('only SUPER_ADMIN creates buildings and complexes', async () => {
      const b = { name: 'N', address: 'Adresa', city: 'Beograd' };
      await f.as('upravnikA').post('/buildings', b).expect(403);
      await f.as('superAdmin').post('/buildings', b).expect(201);
      await f.as('upravnikA').post('/complexes', b).expect(403);
    });
  });

  describe('lists scoped to the caller', () => {
    it('GET /buildings returns only active memberships', async () => {
      const mine = await f.as('residentA1').get('/buildings').expect(200);
      expect(idsOf(mine)).toEqual([f.buildingA]);
      const inactive = await f.as('inactiveA').get('/buildings').expect(200);
      expect(inactive.body).toEqual([]);
    });

    it('GET /complexes is empty for users outside any complex', async () => {
      const res = await f.as('residentS').get('/complexes').expect(200);
      expect(res.body).toEqual([]);
    });

    it('rejects invalid query params with 400', async () => {
      await f.as('residentA1').get('/tickets?status=FOO').expect(400);
      await f.as('residentA1').get('/threads?buildingId=nope').expect(400);
      await f.as('residentA1').get('/announcements?unknown=1').expect(400);
    });
  });

  describe('complex routes', () => {
    it.each<[Actor, number]>([
      ['residentA1', 200],
      ['residentB', 200],
      ['residentS', 403],
      ['inactiveA', 403],
      ['outsider', 403],
      ['superAdmin', 200],
    ])('%s reading complex C gets %i', async (actor, status) => {
      await f.as(actor).get(`/complexes/${f.complexId}`).expect(status);
      await f.as(actor).get(`/complexes/${f.complexId}/threads`).expect(status);
    });
  });

  describe('missing and foreign ids', () => {
    it('returns 404 for unknown ids, including malformed ones', async () => {
      const a = `/buildings/${f.buildingA}`;
      await f.as('residentA1').get(`${a}/threads/${randomUUID()}`).expect(404);
      await f.as('residentA1').get(`${a}/threads/not-a-uuid`).expect(404);
      await f.as('residentA1').get(`${a}/units/${randomUUID()}`).expect(404);
      await f.as('superAdmin').get(`/buildings/${randomUUID()}`).expect(404);
    });

    it("can't reach building B's thread through building A", async () => {
      const t = await f
        .as('residentB')
        .post(`/buildings/${f.buildingB}/threads`, post)
        .expect(201);
      await f
        .as('residentA1')
        .get(`/buildings/${f.buildingA}/threads/${idOf(t)}`)
        .expect(404);
    });
  });

  describe('tickets are private to author and staff (S2)', () => {
    let ticketId: string;

    beforeAll(async () => {
      const t = await f
        .as('residentA1')
        .post(`/buildings/${f.buildingA}/tickets`, post)
        .expect(201);
      ticketId = idOf(t);
    });

    it.each<[Actor, number]>([
      ['residentA1', 200],
      ['boardA', 200],
      ['upravnikA', 200],
      ['residentA2', 403],
      ['residentB', 403],
      ['outsider', 403],
    ])('%s reading the ticket gets %i', async (actor, status) => {
      await f
        .as(actor)
        .get(`/buildings/${f.buildingA}/tickets/${ticketId}`)
        .expect(status);
    });

    it("hides other residents' tickets from lists", async () => {
      const staff = await f
        .as('boardA')
        .get(`/buildings/${f.buildingA}/tickets`);
      expect(idsOf(staff)).toContain(ticketId);
      const other = await f
        .as('residentA2')
        .get(`/buildings/${f.buildingA}/tickets`);
      expect(idsOf(other)).not.toContain(ticketId);
      const mine = await f.as('residentA2').get('/tickets');
      expect(idsOf(mine)).not.toContain(ticketId);
    });

    it('non-authors cannot reply', async () => {
      await f
        .as('residentA2')
        .post(`/buildings/${f.buildingA}/tickets/${ticketId}/replies`, {
          body: 'x',
        })
        .expect(403);
    });

    it('staff close it, then replies get 409 (D2, D3)', async () => {
      const url = `/buildings/${f.buildingA}/tickets/${ticketId}`;
      await f.as('boardA').patch(`${url}/close`).expect(200);
      await f
        .as('residentA1')
        .post(`${url}/replies`, { body: 'x' })
        .expect(409);
    });
  });

  describe('closing threads (D2) and replying to closed ones (D3)', () => {
    it('building threads: author or staff close', async () => {
      const t = await f
        .as('residentA1')
        .post(`/buildings/${f.buildingA}/threads`, post)
        .expect(201);
      const url = `/buildings/${f.buildingA}/threads/${idOf(t)}`;
      await f
        .as('residentA2')
        .post(`${url}/replies`, { body: 'x' })
        .expect(201);
      await f.as('residentA2').patch(`${url}/close`).expect(403);
      await f.as('residentA1').patch(`${url}/close`).expect(200);
      await f
        .as('residentA2')
        .post(`${url}/replies`, { body: 'x' })
        .expect(409);
    });

    it('complex threads: members of other buildings may reply, not close', async () => {
      const t = await f
        .as('residentA1')
        .post(`/complexes/${f.complexId}/threads`, post)
        .expect(201);
      const url = `/complexes/${f.complexId}/threads/${idOf(t)}`;
      await f.as('residentB').post(`${url}/replies`, { body: 'x' }).expect(201);
      await f.as('residentB').patch(`${url}/close`).expect(403);
      await f.as('residentS').post(`${url}/replies`, { body: 'x' }).expect(403);
      await f.as('boardA').patch(`${url}/close`).expect(200);
      await f.as('residentB').post(`${url}/replies`, { body: 'x' }).expect(409);
    });
  });
});
