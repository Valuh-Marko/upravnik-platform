import { Injectable } from '@nestjs/common';
import { ThreadStatus } from '../prisma';
import { Access } from '../auth/access/auth-user';
import { assertCanClose, assertOpen } from '../auth/access/policies';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplexThreadDto } from './dto/create-complex-thread.dto';
import { CreateComplexReplyDto } from './dto/create-complex-reply.dto';

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

  createThread(
    complexId: string,
    authorId: string,
    dto: CreateComplexThreadDto,
  ) {
    return this.prisma.complexThread.create({
      data: { complexId, authorId, ...dto },
    });
  }

  async findByComplex(complexId: string) {
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

  async findOne(id: string, complexId: string) {
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
  ) {
    const thread = await this.prisma.complexThread.findFirstOrThrow({
      where: { id: threadId, complexId },
    });
    assertOpen(thread);

    return this.prisma.complexThreadReply.create({
      data: { threadId, authorId, body: dto.body },
    });
  }

  async closeThread(
    id: string,
    complexId: string,
    userId: string,
    access: Access,
  ) {
    const thread = await this.prisma.complexThread.findFirstOrThrow({
      where: { id, complexId },
    });

    assertCanClose(access, thread, userId);

    return this.prisma.complexThread.update({
      where: { id },
      data: { status: ThreadStatus.CLOSED },
    });
  }
}
