import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnyUser, CurrentUser } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { StatusFilterQueryDto } from '../common/dto/my-list-query.dto';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class MyTicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
  @AnyUser()
  findAll(@CurrentUser() user: AuthUser, @Query() query: StatusFilterQueryDto) {
    return this.ticketsService.findAllForUser(
      user,
      query.buildingId,
      query.status,
    );
  }
}
