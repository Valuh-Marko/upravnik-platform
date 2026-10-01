import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkCreateDto } from './dto/bulk-create.dto';

@Injectable()
export class SetupService {
  constructor(private prisma: PrismaService) {}

  async bulkCreate(dto: BulkCreateDto) {
    assertUniqueUnitNumbers(dto);

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

// Residents log in by unit number, so it must be unique within a building.
function assertUniqueUnitNumbers(dto: BulkCreateDto) {
  const messages = dto.buildings.flatMap((b) => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const { unitNumber } of b.units) {
      const key = unitNumber.trim();
      if (seen.has(key)) dupes.add(key);
      seen.add(key);
    }
    return dupes.size
      ? [`${b.name}: duplirani brojevi jedinica ${[...dupes].join(', ')}`]
      : [];
  });
  if (messages.length) throw new BadRequestException(messages);
}
