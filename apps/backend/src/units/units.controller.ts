import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InBuilding } from '../auth/access/access.decorators';
import { Role } from '../prisma';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';

@ApiTags('units')
@ApiBearerAuth()
@Controller('buildings/:buildingId/units')
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Post()
  @InBuilding(Role.UPRAVNIK)
  create(@Param('buildingId') buildingId: string, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(buildingId, dto);
  }

  @Get()
  @InBuilding()
  findAll(@Param('buildingId') buildingId: string) {
    return this.unitsService.findByBuilding(buildingId);
  }

  @Get(':id')
  @InBuilding()
  findOne(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.unitsService.findOne(id, buildingId);
  }
}
