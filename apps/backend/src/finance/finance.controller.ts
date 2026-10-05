import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { FinanceService } from './finance.service';
import { UpsertFinanceProfileDto } from './dto/profile.dto';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { DateRangeQueryDto } from './dto/summary-query.dto';

// Every building member reads; only the upravnik writes. The same rule
// applies to every finance controller.
@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get()
  @InBuilding()
  overview(@Param('buildingId') buildingId: string) {
    return this.financeService.overview(buildingId);
  }

  @Put('profile')
  @InBuilding(Role.UPRAVNIK)
  upsertProfile(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertFinanceProfileDto,
  ) {
    return this.financeService.upsertProfile(buildingId, user.id, dto);
  }

  @Post('bank-accounts')
  @InBuilding(Role.UPRAVNIK)
  createBankAccount(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBankAccountDto,
  ) {
    return this.financeService.createBankAccount(buildingId, user.id, dto);
  }

  @Patch('bank-accounts/:id')
  @InBuilding(Role.UPRAVNIK)
  updateBankAccount(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.financeService.updateBankAccount(buildingId, user.id, id, dto);
  }

  @Get('summary')
  @InBuilding()
  summary(
    @Param('buildingId') buildingId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.financeService.summary(buildingId, query);
  }

  @Get('categories')
  @InBuilding()
  categories(@Param('buildingId') buildingId: string) {
    return this.financeService.categories(buildingId);
  }

  @Post('categories')
  @InBuilding(Role.UPRAVNIK)
  createCategory(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.financeService.createCategory(buildingId, user.id, dto);
  }

  @Patch('categories/:id')
  @InBuilding(Role.UPRAVNIK)
  updateCategory(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.financeService.updateCategory(buildingId, user.id, id, dto);
  }

  @Get('suppliers')
  @InBuilding()
  suppliers(@Param('buildingId') buildingId: string) {
    return this.financeService.suppliers(buildingId);
  }

  @Post('suppliers')
  @InBuilding(Role.UPRAVNIK)
  createSupplier(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.financeService.createSupplier(buildingId, user.id, dto);
  }

  @Patch('suppliers/:id')
  @InBuilding(Role.UPRAVNIK)
  updateSupplier(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.financeService.updateSupplier(buildingId, user.id, id, dto);
  }
}
