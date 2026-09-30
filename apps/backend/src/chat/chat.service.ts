import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

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
