import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  AnyUser,
  CurrentAccess,
  CurrentUser,
  InBuilding,
  SuperAdmin,
} from '../auth/access/access.decorators';
import type { Access, AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@ApiTags('buildings')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingsController {
  constructor(private buildingsService: BuildingsService) {}

  @Post()
  @SuperAdmin()
  create(@Body() dto: CreateBuildingDto) {
    return this.buildingsService.create(dto);
  }

  @Get()
  @AnyUser()
  findAll(@CurrentUser() user: AuthUser) {
    return this.buildingsService.findAll(user);
  }

  @Get(':buildingId')
  @InBuilding()
  findOne(@Param('buildingId') buildingId: string) {
    return this.buildingsService.findOne(buildingId);
  }

  @Patch(':buildingId/members/:userId')
  @InBuilding(Role.UPRAVNIK)
  updateMember(
    @Param('buildingId') buildingId: string,
    @Param('userId') userId: string,
    @CurrentAccess() access: Access,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.buildingsService.updateMember(buildingId, userId, access, dto);
  }
}
