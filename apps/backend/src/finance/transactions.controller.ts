import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentAccess,
  CurrentUser,
  InBuilding,
} from '../auth/access/access.decorators';
import type { Access, AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  ReverseTransactionDto,
  TransactionsQueryDto,
} from './dto/transaction.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance/transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  @InBuilding()
  transactions(
    @Param('buildingId') buildingId: string,
    @CurrentAccess() access: Access,
    @Query() query: TransactionsQueryDto,
  ) {
    return this.transactionsService.list(buildingId, access, query);
  }

  @Post()
  @InBuilding(Role.UPRAVNIK)
  createTransaction(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(buildingId, user.id, dto);
  }

  @Post(':id/reverse')
  @InBuilding(Role.UPRAVNIK)
  reverseTransaction(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReverseTransactionDto,
  ) {
    return this.transactionsService.reverse(buildingId, user.id, id, dto);
  }
}
