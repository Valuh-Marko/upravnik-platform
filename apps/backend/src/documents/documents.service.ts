import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { requireBuildingMember } from '../auth/building-membership.util';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  create(buildingId: string, uploadedBy: string, dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: { buildingId, uploadedBy, ...dto },
    });
  }

  async findByBuilding(
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    await requireBuildingMember(this.prisma, buildingId, userId, systemRole);
    return this.prisma.document.findMany({
      where: { buildingId },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    id: string,
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    await requireBuildingMember(this.prisma, buildingId, userId, systemRole);
    return this.prisma.document.findFirstOrThrow({ where: { id, buildingId } });
  }
}
