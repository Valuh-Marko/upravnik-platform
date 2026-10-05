import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AccountType, Role, SystemRole } from '../src/prisma';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/storage/storage.service';

export const PASSWORD = 'Password123!';

// Keeps uploads in memory so e2e runs need no S3 server.
export class FakeStorage {
  objects = new Map<string, Buffer>();

  put(key: string, body: Buffer) {
    this.objects.set(key, body);
    return Promise.resolve();
  }

  signedDownloadUrl(key: string) {
    return Promise.resolve(`https://storage.test/${key}?signed`);
  }
}

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StorageService)
    .useValue(new FakeStorage())
    .compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

async function resetDb(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

export type Actor =
  | 'superAdmin'
  | 'upravnikA'
  | 'boardA'
  | 'residentA1'
  | 'residentA2'
  | 'residentB'
  | 'residentS'
  | 'inactiveA'
  | 'outsider';

// Complex C holds buildings A and B; building S is standalone.
//   upravnikA, boardA, residentA1, residentA2 : building A
//   inactiveA                                 : building A, membership deactivated
//   residentB                                 : building B
//   residentS                                 : building S
//   outsider                                  : no memberships
//   superAdmin                                : SUPER_ADMIN, no memberships
export async function seed(app: INestApplication<App>) {
  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  await resetDb(prisma);

  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const complex = await prisma.complex.create({
    data: { name: 'Blok C', address: 'Adresa 1', city: 'Beograd' },
  });
  const building = (name: string, complexId: string | null) =>
    prisma.building.create({
      data: { name, address: `${name} 1`, city: 'Beograd', complexId },
    });
  const buildingA = await building('A', complex.id);
  const buildingB = await building('B', complex.id);
  const buildingS = await building('S', null);

  const ids = {} as Record<Actor, string>;
  const tokens = {} as Record<Actor, string>;
  // Issued a minute ago, so a password reset right now revokes them (H4).
  const iat = Math.floor(Date.now() / 1000) - 60;

  const user = async (
    actor: Actor,
    membership?: { buildingId: string; role: Role; isActive?: boolean },
  ) => {
    const isResident = membership?.role === Role.RESIDENT;
    const created = await prisma.user.create({
      data: {
        username: actor,
        email: isResident ? null : `${actor}@test.rs`,
        passwordHash,
        firstName: actor,
        accountType: isResident
          ? AccountType.UNIT_ACCOUNT
          : AccountType.SYSTEM_USER,
        systemRole: actor === 'superAdmin' ? SystemRole.SUPER_ADMIN : null,
      },
    });
    if (membership) {
      const unit = isResident
        ? await prisma.unit.create({
            data: {
              buildingId: membership.buildingId,
              unitNumber: actor,
              type: 'APARTMENT',
              userId: created.id,
            },
          })
        : null;
      await prisma.buildingMember.create({
        data: {
          buildingId: membership.buildingId,
          userId: created.id,
          role: membership.role,
          unitId: unit?.id,
          isActive: membership.isActive ?? true,
        },
      });
    }
    ids[actor] = created.id;
    tokens[actor] = jwt.sign({
      sub: created.id,
      username: created.username,
      accountType: created.accountType,
      systemRole: created.systemRole ?? undefined,
      iat,
    });
  };

  await user('superAdmin');
  await user('upravnikA', { buildingId: buildingA.id, role: Role.UPRAVNIK });
  await user('boardA', { buildingId: buildingA.id, role: Role.BOARD_MEMBER });
  await user('residentA1', { buildingId: buildingA.id, role: Role.RESIDENT });
  await user('residentA2', { buildingId: buildingA.id, role: Role.RESIDENT });
  await user('residentB', { buildingId: buildingB.id, role: Role.RESIDENT });
  await user('residentS', { buildingId: buildingS.id, role: Role.RESIDENT });
  await user('inactiveA', {
    buildingId: buildingA.id,
    role: Role.RESIDENT,
    isActive: false,
  });
  await user('outsider');

  const http = request(app.getHttpServer());
  const as = (actor: Actor) => ({
    get: (url: string) =>
      http.get(`/api${url}`).auth(tokens[actor], { type: 'bearer' }),
    post: (url: string, body: object = {}) =>
      http
        .post(`/api${url}`)
        .auth(tokens[actor], { type: 'bearer' })
        .send(body),
    patch: (url: string, body: object = {}) =>
      http
        .patch(`/api${url}`)
        .auth(tokens[actor], { type: 'bearer' })
        .send(body),
    put: (url: string, body: object = {}) =>
      http.put(`/api${url}`).auth(tokens[actor], { type: 'bearer' }).send(body),
  });

  return {
    prisma,
    http,
    as,
    ids,
    tokens,
    complexId: complex.id,
    buildingA: buildingA.id,
    buildingB: buildingB.id,
    buildingS: buildingS.id,
  };
}

export type Fixture = Awaited<ReturnType<typeof seed>>;

// Response body helpers (supertest types the body as any).
export const idOf = (res: { body: unknown }) => (res.body as { id: string }).id;
export const idsOf = (res: { body: unknown }) =>
  (res.body as { id: string }[]).map((x) => x.id);
