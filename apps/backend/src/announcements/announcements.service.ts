import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, isSuperAdmin } from '../auth/access/auth-user';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  create(buildingId: string, authorId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: { buildingId, authorId, ...dto },
    });
  }

  findByBuilding(buildingId: string) {
    return this.prisma.announcement.findMany({
      where: { buildingId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findOne(id: string, buildingId: string) {
    return this.prisma.announcement.findFirstOrThrow({
      where: { id, buildingId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async update(id: string, buildingId: string, data: { isPinned?: boolean }) {
    await this.prisma.announcement.findFirstOrThrow({
      where: { id, buildingId },
    });
    return this.prisma.announcement.update({ where: { id }, data });
  }

  async findAllForUser(user: AuthUser, buildingId?: string) {
    if (isSuperAdmin(user)) {
      return this.prisma.announcement.findMany({
        where: buildingId ? { buildingId } : {},
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          building: { select: { id: true, name: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      });
    }

    const memberships = await this.prisma.buildingMember.findMany({
      where: { userId: user.id, isActive: true },
      select: { buildingId: true },
    });
    const buildingIds = memberships.map((m) => m.buildingId);

    if (buildingId && !buildingIds.includes(buildingId)) return [];

    return this.prisma.announcement.findMany({
      where: { buildingId: buildingId ? buildingId : { in: buildingIds } },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        building: { select: { id: true, name: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
