import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, ThreadStatus } from '../prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplexThreadDto } from './dto/create-complex-thread.dto';
import { CreateComplexReplyDto } from './dto/create-complex-reply.dto';

const SUPER_ADMIN = 'SUPER_ADMIN';

function complexAuthorSelect(complexId: string) {
  return {
    id: true,
    firstName: true,
    lastName: true,
    unit: { select: { unitNumber: true } },
    buildingMembers: {
      where: { building: { complexId } },
      select: { building: { select: { id: true, name: true } } },
      take: 1,
    },
  } as const;
}

function flattenComplexAuthor<
  T extends {
    unit: { unitNumber: string } | null;
    buildingMembers: { building: { id: string; name: string } }[];
  },
>(
  author: T,
): Omit<T, 'unit' | 'buildingMembers'> & {
  unitNumber: string | null;
  building: { id: string; name: string } | null;
} {
  const { unit, buildingMembers, ...rest } = author;
  return {
    ...rest,
    unitNumber: unit?.unitNumber ?? null,
    building: buildingMembers[0]?.building ?? null,
  };
}

@Injectable()
export class ComplexForumService {
  constructor(private prisma: PrismaService) {}

  // Returns the highest role the user holds in any building of this complex.
  // Throws ForbiddenException if the user has no membership in the complex.
  private async getCallerRole(
    complexId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    if (systemRole === SUPER_ADMIN) return Role.UPRAVNIK;

    const memberships = await this.prisma.buildingMember.findMany({
      where: { userId, building: { complexId }, isActive: true },
      select: { role: true },
    });

    if (memberships.length === 0) throw new ForbiddenException();

    if (memberships.some((m) => m.role === Role.UPRAVNIK)) return Role.UPRAVNIK;
    if (memberships.some((m) => m.role === Role.BOARD_MEMBER))
      return Role.BOARD_MEMBER;
    return Role.RESIDENT;
  }

  async createThread(
    complexId: string,
    authorId: string,
    dto: CreateComplexThreadDto,
    systemRole?: string | null,
  ) {
    await this.getCallerRole(complexId, authorId, systemRole);
    return this.prisma.complexThread.create({
      data: { complexId, authorId, ...dto },
    });
  }

  async findByComplex(
    complexId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    await this.getCallerRole(complexId, userId, systemRole);

    const threads = await this.prisma.complexThread.findMany({
      where: { complexId },
      include: {
        author: { select: complexAuthorSelect(complexId) },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return threads.map(({ author, ...thread }) => ({
      ...thread,
      author: flattenComplexAuthor(author),
    }));
  }

  async findOne(
    id: string,
    complexId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    await this.getCallerRole(complexId, userId, systemRole);

    const thread = await this.prisma.complexThread.findFirstOrThrow({
      where: { id, complexId },
      include: {
        author: { select: complexAuthorSelect(complexId) },
        replies: {
          include: { author: { select: complexAuthorSelect(complexId) } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const { author, replies, ...rest } = thread;
    return {
      ...rest,
      author: flattenComplexAuthor(author),
      replies: replies.map(({ author: ra, ...reply }) => ({
        ...reply,
        author: flattenComplexAuthor(ra),
      })),
    };
  }

  async createReply(
    threadId: string,
    complexId: string,
    authorId: string,
    dto: CreateComplexReplyDto,
    systemRole?: string | null,
  ) {
    await this.getCallerRole(complexId, authorId, systemRole);
    await this.prisma.complexThread.findFirstOrThrow({
      where: { id: threadId, complexId },
    });

    return this.prisma.complexThreadReply.create({
      data: { threadId, authorId, body: dto.body },
    });
  }

  async closeThread(
    id: string,
    complexId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    const role = await this.getCallerRole(complexId, userId, systemRole);
    const thread = await this.prisma.complexThread.findFirstOrThrow({
      where: { id, complexId },
    });

    const isStaff = role === Role.UPRAVNIK || role === Role.BOARD_MEMBER;
    if (!isStaff && thread.authorId !== userId) throw new ForbiddenException();

    return this.prisma.complexThread.update({
      where: { id },
      data: { status: ThreadStatus.CLOSED },
    });
  }
}
