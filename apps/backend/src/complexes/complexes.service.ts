import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, isSuperAdmin } from '../auth/access/auth-user';
import { CreateComplexDto } from './dto/create-complex.dto';

@Injectable()
export class ComplexesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateComplexDto) {
    return this.prisma.complex.create({ data: dto });
  }

  findAll(user: AuthUser) {
    if (isSuperAdmin(user)) {
      return this.prisma.complex.findMany({ include: { buildings: true } });
    }
    return this.prisma.complex.findMany({
      where: {
        buildings: {
          some: { members: { some: { userId: user.id, isActive: true } } },
        },
      },
      include: { buildings: true },
    });
  }

  findOne(id: string) {
    return this.prisma.complex.findUniqueOrThrow({
      where: { id },
      include: { buildings: true },
    });
  }
}
