import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '../prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SAFE_USER_SELECT } from '../auth/safe-user-select.util';
import { Access, AuthUser, isSuperAdmin } from '../auth/access/auth-user';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class BuildingsService {
  constructor(
    private prisma: PrismaService,
    private chat: ChatGateway,
  ) {}

  create(dto: CreateBuildingDto) {
    return this.prisma.building.create({ data: dto });
  }

  findAll(user: AuthUser) {
    if (isSuperAdmin(user)) {
      return this.prisma.building.findMany({ include: { complex: true } });
    }
    return this.prisma.building.findMany({
      where: { members: { some: { userId: user.id, isActive: true } } },
      include: { complex: true },
    });
  }

  findOne(id: string) {
    return this.prisma.building.findUniqueOrThrow({
      where: { id },
      include: {
        complex: true,
        units: true,
        members: { include: { user: { select: SAFE_USER_SELECT } } },
      },
    });
  }

  // Activates or deactivates a membership. Deactivation revokes access immediately
  // (HTTP and chat) but keeps the member's history. Only SUPER_ADMIN may change
  // another UPRAVNIK's membership.
  async updateMember(
    buildingId: string,
    userId: string,
    access: Access,
    dto: UpdateMemberDto,
  ) {
    const member = await this.prisma.buildingMember.findUniqueOrThrow({
      where: { buildingId_userId: { buildingId, userId } },
    });
    if (member.role === Role.UPRAVNIK && !access.isSuperAdmin) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.buildingMember.update({
      where: { id: member.id },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        buildingId: true,
        userId: true,
        role: true,
        unitId: true,
        isActive: true,
        joinedAt: true,
      },
    });
    if (!dto.isActive) this.chat.leaveBuilding(userId, buildingId);
    return updated;
  }
}
