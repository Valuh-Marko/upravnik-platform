import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { BudgetsService } from './budgets.service';
import { UpsertBudgetDto } from './dto/budget.dto';

// Budget (program održavanja).
@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance/budgets')
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Get()
  @InBuilding()
  budgets(@Param('buildingId') buildingId: string) {
    return this.budgetsService.list(buildingId);
  }

  @Get(':year')
  @InBuilding()
  budget(
    @Param('buildingId') buildingId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.budgetsService.findOne(buildingId, year);
  }

  @Put(':year')
  @InBuilding(Role.UPRAVNIK)
  upsertBudget(
    @Param('buildingId') buildingId: string,
    @Param('year', ParseIntPipe) year: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertBudgetDto,
  ) {
    return this.budgetsService.upsert(buildingId, user.id, year, dto);
  }
}
