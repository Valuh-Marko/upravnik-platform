import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { io, Socket } from 'socket.io-client';
import { createTestApp, Fixture, seed } from './fixtures';

// Chat gateway (S3): handshake auth, membership on every event, revocation.
describe('Chat (e2e)', () => {
  let app: INestApplication<App>;
  let f: Fixture;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    f = await seed(app);
    await app.listen(0);
    url = `${await app.getUrl()}/chat`.replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    sockets.forEach((s) => s.disconnect());
    await app.close();
  });

  const open = (token?: string) => {
    const socket = io(url, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
    });
    sockets.push(socket);
    return socket;
  };

  const connect = (token: string) =>
    new Promise<Socket>((resolve, reject) => {
      const socket = open(token);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  const next = <T>(socket: Socket, event: string, ms = 2000) =>
    new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no ${event}`)), ms);
      socket.once(event, (data: T) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

  const nothing = (socket: Socket, event: string, ms = 300) =>
    new Promise<void>((resolve, reject) => {
      const onEvent = () => reject(new Error(`unexpected ${event}`));
      socket.once(event, onEvent);
      setTimeout(() => {
        socket.off(event, onEvent);
        resolve();
      }, ms);
    });

  type WsError = { status: string; message: unknown };

  it('refuses the handshake without a valid token', async () => {
    await expect(next(open(), 'connect_error')).resolves.toBeDefined();
    await expect(next(open('forged'), 'connect_error')).resolves.toBeDefined();
  });

  it("refuses to join a building the user isn't a member of", async () => {
    const outsider = await connect(f.tokens.outsider);
    outsider.emit('join', f.buildingA);
    const err = await next<WsError>(outsider, 'exception');
    expect(err.message).toBe('Forbidden');
  });

  describe('members of building A', () => {
    let a1: Socket;
    let a2: Socket;

    beforeAll(async () => {
      a1 = await connect(f.tokens.residentA1);
      a2 = await connect(f.tokens.residentA2);
      await expect(a1.emitWithAck('join', f.buildingA)).resolves.toEqual({
        joined: f.buildingA,
      });
      await a2.emitWithAck('join', f.buildingA);
    });

    it('receive each other’s messages', async () => {
      const received = next<{ body: string }>(a2, 'message');
      a1.emit('message', { buildingId: f.buildingA, body: 'Zdravo' });
      await expect(received).resolves.toMatchObject({ body: 'Zdravo' });
    });

    it('get validation errors for bad payloads', async () => {
      a1.emit('message', { buildingId: f.buildingA, body: '' });
      await expect(next<WsError>(a1, 'exception')).resolves.toEqual({
        status: 'error',
        message: ['body should not be empty'],
      });
    });

    it("can't post to another building", async () => {
      a1.emit('message', { buildingId: f.buildingB, body: 'x' });
      const err = await next<WsError>(a1, 'exception');
      expect(err.message).toBe('Forbidden');
    });

    it('stop receiving and sending once their membership is deactivated', async () => {
      await f
        .as('upravnikA')
        .patch(`/buildings/${f.buildingA}/members/${f.ids.residentA2}`, {
          isActive: false,
        })
        .expect(200);

      const silent = nothing(a2, 'message');
      a1.emit('message', { buildingId: f.buildingA, body: 'Tajna' });
      await next(a1, 'message');
      await silent;

      a2.emit('message', { buildingId: f.buildingA, body: 'x' });
      const err = await next<WsError>(a2, 'exception');
      expect(err.message).toBe('Forbidden');
    });

    it('are disconnected when their account is disabled', async () => {
      const dropped = next(a1, 'disconnect');
      await f
        .as('superAdmin')
        .patch(`/users/${f.ids.residentA1}`, { isActive: false })
        .expect(200);
      await expect(dropped).resolves.toBe('io server disconnect');
    });
  });
});
