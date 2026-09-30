import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { requireBuildingMember } from '../auth/building-membership.util';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  create(buildingId: string, authorId: string, dto: CreateAnnouncementDto) {
    return this.prisma.announcement.create({
      data: { buildingId, authorId, ...dto },
    });
  }

  async findByBuilding(
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    await requireBuildingMember(this.prisma, buildingId, userId, systemRole);
    return this.prisma.announcement.findMany({
      where: { buildingId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(
    id: string,
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    await requireBuildingMember(this.prisma, buildingId, userId, systemRole);
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

  async findAllForUser(
    userId: string,
    buildingId?: string,
    systemRole?: string | null,
  ) {
    if (systemRole === 'SUPER_ADMIN') {
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
      where: { userId },
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
