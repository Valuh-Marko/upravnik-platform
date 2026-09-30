import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../prisma';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';

@ApiTags('units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings/:buildingId/units')
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK)
  create(@Param('buildingId') buildingId: string, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(buildingId, dto);
  }

  @Get()
  findAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.unitsService.findByBuilding(
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }

  @Get(':id')
  findOne(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.unitsService.findOne(
      id,
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }
}
