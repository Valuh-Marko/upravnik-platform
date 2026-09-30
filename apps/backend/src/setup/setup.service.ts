import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkCreateDto } from './dto/bulk-create.dto';

@Injectable()
export class SetupService {
  constructor(private prisma: PrismaService) {}

  async bulkCreate(dto: BulkCreateDto) {
    return this.prisma.$transaction(async (tx) => {
      const complex = dto.complex
        ? await tx.complex.create({ data: dto.complex })
        : null;

      const buildings = await Promise.all(
        dto.buildings.map(async ({ units, ...buildingData }) => {
          const building = await tx.building.create({
            data: {
              ...buildingData,
              ...(complex ? { complexId: complex.id } : {}),
            },
          });

          await tx.unit.createMany({
            data: units.map((u) => ({ ...u, buildingId: building.id })),
          });

          return {
            id: building.id,
            name: building.name,
            unitCount: units.length,
          };
        }),
      );

      const totalUnits = buildings.reduce((sum, b) => sum + b.unitCount, 0);

      return {
        ...(complex ? { complex: { id: complex.id, name: complex.name } } : {}),
        buildings,
        totalUnits,
      };
    });
  }
}
