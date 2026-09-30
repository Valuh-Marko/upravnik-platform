import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { requireBuildingMember } from '../auth/building-membership.util';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Throws if the user isn't a member of this building; used to gate room joins and message sends.
  assertMember(buildingId: string, userId: string, systemRole?: string | null) {
    return requireBuildingMember(this.prisma, buildingId, userId, systemRole);
  }

  saveMessage(buildingId: string, senderId: string, body: string) {
    return this.prisma.chatMessage.create({
      data: { buildingId, senderId, body },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  getHistory(buildingId: string, limit = 50) {
    return this.prisma.chatMessage.findMany({
      where: { buildingId },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
