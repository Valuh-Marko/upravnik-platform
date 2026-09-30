import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentAccess,
  CurrentUser,
  InBuilding,
} from '../auth/access/access.decorators';
import type { Access, AuthUser } from '../auth/access/auth-user';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketReplyDto } from './dto/create-ticket-reply.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('buildings/:buildingId/tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  @InBuilding()
  create(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(buildingId, user.id, dto);
  }

  @Get()
  @InBuilding()
  findAll(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @CurrentAccess() access: Access,
  ) {
    return this.ticketsService.findByBuilding(buildingId, user.id, access);
  }

  @Get(':id')
  @InBuilding()
  findOne(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @CurrentAccess() access: Access,
  ) {
    return this.ticketsService.findOne(id, buildingId, user.id, access);
  }

  @Post(':id/replies')
  @InBuilding()
  createReply(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @CurrentAccess() access: Access,
    @Body() dto: CreateTicketReplyDto,
  ) {
    return this.ticketsService.createReply(
      id,
      buildingId,
      user.id,
      dto,
      access,
    );
  }

  @Patch(':id/close')
  @InBuilding()
  close(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @CurrentAccess() access: Access,
  ) {
    return this.ticketsService.closeTicket(id, buildingId, user.id, access);
  }
}
