import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  create(buildingId: string, uploadedBy: string, dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: { buildingId, uploadedBy, ...dto },
    });
  }

  findByBuilding(buildingId: string) {
    return this.prisma.document.findMany({
      where: { buildingId },
      include: {
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string, buildingId: string) {
    return this.prisma.document.findFirstOrThrow({ where: { id, buildingId } });
  }
}
