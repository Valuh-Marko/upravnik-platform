import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../prisma';
import { UsersService } from './users.service';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { CreateBoardMemberDto } from './dto/create-board-member.dto';
import { CreateUnitAccountDto } from './dto/create-unit-account.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('system')
  @UseGuards(SystemAdminGuard)
  createSystemUser(@Body() dto: CreateSystemUserDto) {
    return this.usersService.createSystemUser(dto);
  }

  @Post('board-member/:buildingId')
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK)
  createBoardMember(
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateBoardMemberDto,
  ) {
    return this.usersService.createBoardMember(dto, buildingId);
  }

  @Post('unit/:buildingId')
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK)
  createUnitAccount(
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateUnitAccountDto,
  ) {
    return this.usersService.createUnitAccount(dto, buildingId);
  }

  @Post(':buildingId/members/:userId/reset-password')
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK)
  resetPassword(
    @Param('buildingId') buildingId: string,
    @Param('userId') userId: string,
  ) {
    return this.usersService.resetUnitAccountPassword(userId, buildingId);
  }
}
