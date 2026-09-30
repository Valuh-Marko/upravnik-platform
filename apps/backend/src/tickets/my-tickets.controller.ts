import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class MyTicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  @ApiQuery({ name: 'buildingId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'CLOSED'] })
  findAll(
    @Request() req: any,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
  ) {
    return this.ticketsService.findAllForUser(
      req.user.id,
      buildingId,
      status,
      req.user.systemRole,
    );
  }
}
