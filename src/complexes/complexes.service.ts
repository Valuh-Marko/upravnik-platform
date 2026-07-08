import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComplexDto } from './dto/create-complex.dto';

const SUPER_ADMIN = 'SUPER_ADMIN';

@Injectable()
export class ComplexesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateComplexDto) {
    return this.prisma.complex.create({ data: dto });
  }

  findAll(userId: string, systemRole?: string | null) {
    if (systemRole === SUPER_ADMIN) {
      return this.prisma.complex.findMany({ include: { buildings: true } });
    }
    return this.prisma.complex.findMany({
      where: { buildings: { some: { members: { some: { userId } } } } },
      include: { buildings: true },
    });
  }

  async findOne(id: string, userId: string, systemRole?: string | null) {
    if (systemRole !== SUPER_ADMIN) {
      const membership = await this.prisma.buildingMember.findFirst({
        where: { userId, building: { complexId: id } },
      });
      if (!membership) throw new ForbiddenException();
    }
    return this.prisma.complex.findUniqueOrThrow({ where: { id }, include: { buildings: true } });
  }
}
