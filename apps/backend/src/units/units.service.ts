import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { requireBuildingMember } from '../auth/building-membership.util';
import { SAFE_USER_SELECT } from '../auth/safe-user-select.util';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  create(buildingId: string, dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: { buildingId, ...dto } });
  }

  async findByBuilding(buildingId: string, userId: string, systemRole?: string | null) {
    await requireBuildingMember(this.prisma, buildingId, userId, systemRole);
    return this.prisma.unit.findMany({
      where: { buildingId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  async findOne(id: string, buildingId: string, userId: string, systemRole?: string | null) {
    await requireBuildingMember(this.prisma, buildingId, userId, systemRole);
    return this.prisma.unit.findFirstOrThrow({
      where: { id, buildingId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }
}
