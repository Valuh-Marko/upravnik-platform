import { Injectable } from '@nestjs/common';
import { ThreadStatus } from '../prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { Access, AuthUser, isSuperAdmin } from '../auth/access/auth-user';
import { assertCanClose, assertOpen } from '../auth/access/policies';

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  unit: { select: { unitNumber: true } },
} as const;

function flattenAuthor<T extends { unit: { unitNumber: string } | null }>(
  author: T,
): Omit<T, 'unit'> & { unitNumber: string | null } {
  const { unit, ...rest } = author;
  return { ...rest, unitNumber: unit?.unitNumber ?? null };
}

@Injectable()
export class ThreadsService {
  constructor(private prisma: PrismaService) {}

  createThread(buildingId: string, authorId: string, dto: CreateThreadDto) {
    return this.prisma.thread.create({
      data: { buildingId, authorId, ...dto },
    });
  }

  async findByBuilding(buildingId: string) {
    const threads = await this.prisma.thread.findMany({
      where: { buildingId },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return threads.map(({ author, ...thread }) => ({
      ...thread,
      author: flattenAuthor(author),
    }));
  }

  async findOne(id: string, buildingId: string) {
    const thread = await this.prisma.thread.findFirstOrThrow({
      where: { id, buildingId },
      include: {
        author: { select: AUTHOR_SELECT },
        replies: {
          include: { author: { select: AUTHOR_SELECT } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const { author, replies, ...rest } = thread;
    return {
      ...rest,
      author: flattenAuthor(author),
      replies: replies.map(({ author: ra, ...reply }) => ({
        ...reply,
        author: flattenAuthor(ra),
      })),
    };
  }

  async createReply(
    threadId: string,
    buildingId: string,
    authorId: string,
    dto: CreateReplyDto,
  ) {
    const thread = await this.prisma.thread.findFirstOrThrow({
      where: { id: threadId, buildingId },
    });
    assertOpen(thread);
    return this.prisma.threadReply.create({
      data: { threadId, authorId, ...dto },
    });
  }

  async closeThread(
    id: string,
    buildingId: string,
    userId: string,
    access: Access,
  ) {
    const thread = await this.prisma.thread.findFirstOrThrow({
      where: { id, buildingId },
    });
    assertCanClose(access, thread, userId);
    return this.prisma.thread.update({
      where: { id },
      data: { status: ThreadStatus.CLOSED },
    });
  }

  async findAllForUser(
    user: AuthUser,
    buildingId?: string,
    status?: ThreadStatus,
  ) {
    const statusFilter = status ? { status } : {};

    if (isSuperAdmin(user)) {
      const threads = await this.prisma.thread.findMany({
        where: { ...(buildingId ? { buildingId } : {}), ...statusFilter },
        include: {
          author: { select: AUTHOR_SELECT },
          building: { select: { id: true, name: true } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return threads.map(({ author, ...thread }) => ({
        ...thread,
        author: flattenAuthor(author),
      }));
    }

    const memberships = await this.prisma.buildingMember.findMany({
      where: { userId: user.id, isActive: true },
      select: { buildingId: true },
    });
    const buildingIds = memberships.map((m) => m.buildingId);

    if (buildingId && !buildingIds.includes(buildingId)) return [];

    const threads = await this.prisma.thread.findMany({
      where: {
        buildingId: buildingId ? buildingId : { in: buildingIds },
        ...statusFilter,
      },
      include: {
        author: { select: AUTHOR_SELECT },
        building: { select: { id: true, name: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return threads.map(({ author, ...thread }) => ({
      ...thread,
      author: flattenAuthor(author),
    }));
  }
}
