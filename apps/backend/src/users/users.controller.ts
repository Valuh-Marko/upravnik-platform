import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentUser,
  InBuilding,
  SuperAdmin,
} from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { UsersService } from './users.service';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { CreateBoardMemberDto } from './dto/create-board-member.dto';
import { CreateUnitAccountDto } from './dto/create-unit-account.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('system')
  @SuperAdmin()
  createSystemUser(@Body() dto: CreateSystemUserDto) {
    return this.usersService.createSystemUser(dto);
  }

  @Patch(':id')
  @SuperAdmin()
  updateUser(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, user.id, dto);
  }

  @Post('board-member/:buildingId')
  @InBuilding(Role.UPRAVNIK)
  createBoardMember(
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateBoardMemberDto,
  ) {
    return this.usersService.createBoardMember(dto, buildingId);
  }

  @Post('unit/:buildingId')
  @InBuilding(Role.UPRAVNIK)
  createUnitAccount(
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateUnitAccountDto,
  ) {
    return this.usersService.createUnitAccount(dto, buildingId);
  }

  @Post(':buildingId/members/:userId/reset-password')
  @InBuilding(Role.UPRAVNIK)
  resetPassword(
    @Param('buildingId') buildingId: string,
    @Param('userId') userId: string,
  ) {
    return this.usersService.resetUnitAccountPassword(userId, buildingId);
  }
}
