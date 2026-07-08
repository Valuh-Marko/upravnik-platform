import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(private buildingsService: BuildingsService) {}

  @Post()
  @UseGuards(SystemAdminGuard)
  create(@Body() dto: CreateBuildingDto) {
    return this.buildingsService.create(dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.buildingsService.findAll(req.user.id, req.user.systemRole);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.buildingsService.findOne(id, req.user.id, req.user.systemRole);
  }
}
