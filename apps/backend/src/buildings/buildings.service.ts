import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { requireBuildingMember } from '../auth/building-membership.util';
import { SAFE_USER_SELECT } from '../auth/safe-user-select.util';

const SUPER_ADMIN = 'SUPER_ADMIN';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateBuildingDto) {
    return this.prisma.building.create({ data: dto });
  }

  findAll(userId: string, systemRole?: string | null) {
    if (systemRole === SUPER_ADMIN) {
      return this.prisma.building.findMany({ include: { complex: true } });
    }
    return this.prisma.building.findMany({
      where: { members: { some: { userId } } },
      include: { complex: true },
    });
  }

  async findOne(id: string, userId: string, systemRole?: string | null) {
    await requireBuildingMember(this.prisma, id, userId, systemRole);
    return this.prisma.building.findUniqueOrThrow({
      where: { id },
      include: {
        complex: true,
        units: true,
        members: { include: { user: { select: SAFE_USER_SELECT } } },
      },
    });
  }
}
