import 'dotenv/config';
import { PrismaClient, Role, SystemRole, UnitType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createSystemUser, createUnitAccount } from './factories/user.factory';
import { createComplex } from './factories/complex.factory';
import { createBuilding } from './factories/building.factory';
import { createUnit } from './factories/unit.factory';
import { createAnnouncement } from './factories/announcement.factory';
import { createDocument } from './factories/document.factory';
import { createThread, createReply } from './factories/thread.factory';
import { createTicket, createTicketReply } from './factories/ticket.factory';
import { createComplexThread, createComplexReply } from './factories/complex-thread.factory';
import { createChatMessage } from './factories/chat.factory';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

const BUILDING_LAYOUTS = [
  { name: 'Lamela 1', address: 'Bulevar Oslobođenja 44', prefix: 'l1', floors: 5, unitsPerFloor: 4 },
  { name: 'Lamela 2', address: 'Bulevar Oslobođenja 46', prefix: 'l2', floors: 4, unitsPerFloor: 4 },
  { name: 'Lamela 3', address: 'Bulevar Oslobođenja 48', prefix: 'l3', floors: 4, unitsPerFloor: 3 },
  { name: 'Lamela 4', address: 'Bulevar Oslobođenja 50', prefix: 'l4', floors: 3, unitsPerFloor: 4 },
];

async function seedBuilding(
  buildingId: string,
  layout: (typeof BUILDING_LAYOUTS)[0],
  upravnikId: string,
  boardMemberId: string,
) {
  const residents: Awaited<ReturnType<typeof createUnitAccount>>[] = [];
  const allUnits: { id: string }[] = [];

  for (let floor = 1; floor <= layout.floors; floor++) {
    for (let pos = 1; pos <= layout.unitsPerFloor; pos++) {
      const unitNumber = `${floor}-${pos}`;
      const username = `${layout.prefix}.${unitNumber}`;

      const unit = await createUnit(prisma, buildingId, {
        unitNumber,
        floor,
        residentCount: Math.random() > 0.2 ? Math.floor(Math.random() * 3) + 1 : 0,
      });
      allUnits.push(unit);

      // floor 1, pos 1 always gets an account (stable Postman example); ~85% for the rest
      const guaranteed = floor === 1 && pos === 1;
      if (guaranteed || Math.random() < 0.85) {
        const resident = await createUnitAccount(prisma, unit.id, buildingId, {
          unitNumber: username,
          password: 'Resident123!',
        });
        residents.push(resident);
      }
    }
  }

  // Announcements (6 per building, 2 pinned)
  await createAnnouncement(prisma, buildingId, upravnikId, { isPinned: true });
  await createAnnouncement(prisma, buildingId, boardMemberId, { isPinned: true });
  for (let i = 0; i < 4; i++) {
    const author = i % 2 === 0 ? upravnikId : boardMemberId;
    await createAnnouncement(prisma, buildingId, author);
  }

  // Documents (4 per building)
  await createDocument(prisma, buildingId, upravnikId);
  await createDocument(prisma, buildingId, upravnikId);
  await createDocument(prisma, buildingId, boardMemberId);
  await createDocument(prisma, buildingId, boardMemberId);

  // Threads with replies (6 per building)
  for (let i = 0; i < 6; i++) {
    const author = residents[i % residents.length];
    const thread = await createThread(prisma, buildingId, author.id);
    const repliers = [upravnikId, boardMemberId, ...residents.slice(0, 3).map((r) => r.id)];
    const replyCount = Math.floor(Math.random() * 3) + 2;
    for (let r = 0; r < replyCount; r++) {
      await createReply(prisma, thread.id, repliers[r % repliers.length]);
    }
  }

  // Tickets with replies (5 per building — mix of categories and statuses)
  const ticketAuthors = residents.slice(0, 5);
  for (let i = 0; i < 5; i++) {
    const author = ticketAuthors[i % ticketAuthors.length];
    const ticket = await createTicket(prisma, buildingId, author.id, {});

    // Last ticket is closed
    if (i === 4) {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { status: 'CLOSED' } });
    }

    // Staff reply on every ticket
    await createTicketReply(prisma, ticket.id, upravnikId, true);

    // Resident follow-up on first 3 tickets
    if (i < 3) {
      await createTicketReply(prisma, ticket.id, author.id, false);
    }

    // Seed read state for demo:
    // - Upravnik has read tickets 0, 1, 2 (tickets 3 and 4 show unread for them)
    // - Board member has read only ticket 0 (tickets 1–4 show unread)
    // - Resident author has read ticket 0 (ticket 1 has a staff reply they haven't seen yet)
    if (i === 0) {
      await prisma.ticketRead.createMany({
        data: [
          { ticketId: ticket.id, userId: upravnikId },
          { ticketId: ticket.id, userId: boardMemberId },
          { ticketId: ticket.id, userId: author.id },
        ],
      });
    } else if (i === 1 || i === 2) {
      await prisma.ticketRead.create({ data: { ticketId: ticket.id, userId: upravnikId } });
    }
  }

  // Chat messages (20 per building)
  const chatParticipants = [
    upravnikId,
    boardMemberId,
    ...residents.slice(0, 6).map((r) => r.id),
  ];
  for (let i = 0; i < 20; i++) {
    await createChatMessage(prisma, buildingId, chatParticipants[i % chatParticipants.length]);
  }

  return { residents, unitCount: allUnits.length };
}

async function main() {
  console.log('Seeding database...');

  // Wipe in dependency order
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.ticketRead.deleteMany();
  await prisma.ticketReply.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.complexThreadReply.deleteMany();
  await prisma.complexThread.deleteMany();
  await prisma.threadReply.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.document.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.buildingMember.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.building.deleteMany();
  await prisma.complex.deleteMany();
  await prisma.user.deleteMany();

  // ── System users ──────────────────────────────────────────────────────────

  const { plainPassword: adminPw, ...admin } = await createSystemUser(prisma, {
    email: 'admin@upravnik.rs',
    password: 'Admin123!',
    systemRole: SystemRole.SUPER_ADMIN,
    firstName: 'Super',
    lastName: 'Admin',
  });

  const { plainPassword: upravnikPw, ...upravnik } = await createSystemUser(prisma, {
    email: 'upravnik@zgrada.rs',
    password: 'Upravnik123!',
    firstName: 'Marko',
    lastName: 'Petrović',
  });

  // Board members — one per lamela
  const boardMembers = await Promise.all([
    createSystemUser(prisma, {
      email: 'board.l1@zgrada.rs',
      password: 'Board123!',
      firstName: 'Ana',
      lastName: 'Nikolić',
    }),
    createSystemUser(prisma, {
      email: 'board.l2@zgrada.rs',
      password: 'Board123!',
      firstName: 'Dragan',
      lastName: 'Jovanović',
    }),
    createSystemUser(prisma, {
      email: 'board.l3@zgrada.rs',
      password: 'Board123!',
      firstName: 'Milica',
      lastName: 'Savić',
    }),
    createSystemUser(prisma, {
      email: 'board.l4@zgrada.rs',
      password: 'Board123!',
      firstName: 'Zoran',
      lastName: 'Marković',
    }),
  ]);

  // ── Structure ─────────────────────────────────────────────────────────────

  const complex = await createComplex(prisma, {
    name: 'Stambeni Kompleks Sunčani Breg',
    address: 'Bulevar Oslobođenja 44',
    city: 'Novi Sad',
  });

  // ── Buildings + content ───────────────────────────────────────────────────

  const buildingSummaries: {
    id: string;
    name: string;
    unitCount: number;
    residentCount: number;
    boardMemberEmail: string;
  }[] = [];

  for (let i = 0; i < BUILDING_LAYOUTS.length; i++) {
    const layout = BUILDING_LAYOUTS[i];
    const boardMember = boardMembers[i];

    const building = await createBuilding(prisma, {
      complexId: complex.id,
      name: layout.name,
      address: layout.address,
      city: 'Novi Sad',
    });

    await prisma.buildingMember.createMany({
      data: [
        { buildingId: building.id, userId: upravnik.id, role: Role.UPRAVNIK },
        { buildingId: building.id, userId: boardMember.id, role: Role.BOARD_MEMBER },
      ],
    });

    const { residents, unitCount } = await seedBuilding(
      building.id,
      layout,
      upravnik.id,
      boardMember.id,
    );

    buildingSummaries.push({
      id: building.id,
      name: layout.name,
      unitCount,
      residentCount: residents.length,
      boardMemberEmail: boardMember.email!,
    });
  }

  // ── Complex forum (8 threads across all lamelae) ─────────────────────────

  // Collect one resident per lamela for authoring cross-lamela posts
  const allBuildingIds = buildingSummaries.map((b) => b.id);
  const complexParticipants = await prisma.buildingMember.findMany({
    where: { buildingId: { in: allBuildingIds }, role: Role.RESIDENT, isActive: true },
    select: { userId: true, buildingId: true },
    distinct: ['buildingId'],
  });
  const complexAuthors = [
    upravnik.id,
    ...complexParticipants.map((p) => p.userId),
  ];

  for (let i = 0; i < 8; i++) {
    const author = complexAuthors[i % complexAuthors.length];
    const thread = await createComplexThread(prisma, complex.id, author);
    const replyCount = Math.floor(Math.random() * 4) + 2;
    for (let r = 0; r < replyCount; r++) {
      await createComplexReply(prisma, thread.id, complexAuthors[(i + r + 1) % complexAuthors.length]);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log('\n✅ Seeding complete!\n');
  console.log('─── System accounts ───────────────────────────────────');
  console.log(`  SUPER_ADMIN   ${admin.email!.padEnd(30)} Admin123!`);
  console.log(`  UPRAVNIK      ${upravnik.email!.padEnd(30)} Upravnik123!`);
  console.log('\n─── Board members ─────────────────────────────────────');
  boardMembers.forEach((bm, i) => {
    console.log(`  ${BUILDING_LAYOUTS[i].name.padEnd(10)} ${bm.email!.padEnd(30)} Board123!`);
  });
  console.log('\n─── Buildings ─────────────────────────────────────────');
  buildingSummaries.forEach((b) => {
    console.log(`  ${b.name.padEnd(10)} (${b.unitCount} stanova, ${b.residentCount} naloga)  ID: ${b.id}`);
  });
  console.log('\n  Complex ID:', complex.id);
  console.log('\n  Svi stanarski nalozi koriste lozinku: Resident123!');
  console.log('  Format korisničkog imena: <lamela>.<stan>  npr. "l1.1-1", "l2.2-3", "l3.1-2"');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
