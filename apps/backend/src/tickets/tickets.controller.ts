import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketReplyDto } from './dto/create-ticket-reply.dto';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings/:buildingId/tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  create(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(buildingId, req.user.id, dto);
  }

  @Get()
  findAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.ticketsService.findByBuilding(
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
    return this.ticketsService.findOne(
      id,
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }

  @Post(':id/replies')
  createReply(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateTicketReplyDto,
  ) {
    return this.ticketsService.createReply(
      id,
      buildingId,
      req.user.id,
      dto,
      req.user.systemRole,
    );
  }

  @Patch(':id/close')
  close(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.ticketsService.closeTicket(
      id,
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }
}
