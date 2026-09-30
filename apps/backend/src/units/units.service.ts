import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { SAFE_USER_SELECT } from '../auth/safe-user-select.util';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  create(buildingId: string, dto: CreateUnitDto) {
    return this.prisma.unit.create({ data: { buildingId, ...dto } });
  }

  findByBuilding(buildingId: string) {
    return this.prisma.unit.findMany({
      where: { buildingId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }

  findOne(id: string, buildingId: string) {
    return this.prisma.unit.findFirstOrThrow({
      where: { id, buildingId },
      include: { user: { select: SAFE_USER_SELECT } },
    });
  }
}
