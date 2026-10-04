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
import {
  CurrentAccess,
  CurrentUser,
  InBuilding,
} from '../auth/access/access.decorators';
import type { Access, AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { ChargesService } from './charges.service';
import { FinanceService } from './finance.service';
import { InvoicesService } from './invoices.service';
import { TransactionsService } from './transactions.service';
import { UpsertFinanceProfileDto } from './dto/profile.dto';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { DateRangeQueryDto } from './dto/summary-query.dto';
import {
  CreateTransactionDto,
  ReverseTransactionDto,
  TransactionsQueryDto,
} from './dto/transaction.dto';
import {
  CancelInvoiceDto,
  CreateInvoiceDto,
  InvoicesQueryDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { CreateFeeRuleDto, UpdateFeeRuleDto } from './dto/fee-rule.dto';
import {
  CancelChargeDto,
  CreateAdjustmentDto,
  OpeningBalanceDto,
  PeriodDto,
} from './dto/charge.dto';

// Every building member reads; only the upravnik writes.
@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance')
export class FinanceController {
  constructor(
    private financeService: FinanceService,
    private transactionsService: TransactionsService,
    private invoicesService: InvoicesService,
    private chargesService: ChargesService,
  ) {}

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

  @Get('transactions')
  @InBuilding()
  transactions(
    @Param('buildingId') buildingId: string,
    @CurrentAccess() access: Access,
    @Query() query: TransactionsQueryDto,
  ) {
    return this.transactionsService.list(buildingId, access, query);
  }

  @Post('transactions')
  @InBuilding(Role.UPRAVNIK)
  createTransaction(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(buildingId, user.id, dto);
  }

  @Post('transactions/:id/reverse')
  @InBuilding(Role.UPRAVNIK)
  reverseTransaction(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReverseTransactionDto,
  ) {
    return this.transactionsService.reverse(buildingId, user.id, id, dto);
  }

  @Get('invoices')
  @InBuilding()
  invoices(
    @Param('buildingId') buildingId: string,
    @Query() query: InvoicesQueryDto,
  ) {
    return this.invoicesService.list(buildingId, query);
  }

  @Get('invoices/:id')
  @InBuilding()
  invoice(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(buildingId, id);
  }

  @Post('invoices')
  @InBuilding(Role.UPRAVNIK)
  createInvoice(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(buildingId, user.id, dto);
  }

  @Patch('invoices/:id')
  @InBuilding(Role.UPRAVNIK)
  updateInvoice(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(buildingId, user.id, id, dto);
  }

  @Post('invoices/:id/cancel')
  @InBuilding(Role.UPRAVNIK)
  cancelInvoice(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.invoicesService.cancel(buildingId, user.id, id, dto);
  }

  // ─── Unit charges (zaduženja) ──────────────────────────────────

  @Get('fee-rules')
  @InBuilding()
  feeRules(@Param('buildingId') buildingId: string) {
    return this.chargesService.feeRules(buildingId);
  }

  @Post('fee-rules')
  @InBuilding(Role.UPRAVNIK)
  createFeeRule(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFeeRuleDto,
  ) {
    return this.chargesService.createFeeRule(buildingId, user.id, dto);
  }

  @Patch('fee-rules/:id')
  @InBuilding(Role.UPRAVNIK)
  updateFeeRule(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateFeeRuleDto,
  ) {
    return this.chargesService.updateFeeRule(buildingId, user.id, id, dto);
  }

  // Per-unit amounts, so staff only.
  @Get('charges/preview')
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  previewCharges(
    @Param('buildingId') buildingId: string,
    @Query() query: PeriodDto,
  ) {
    return this.chargesService.preview(buildingId, query.period);
  }

  @Post('charges/generate')
  @InBuilding(Role.UPRAVNIK)
  generateCharges(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PeriodDto,
  ) {
    return this.chargesService.generate(buildingId, user.id, dto.period);
  }

  @Post('charges/regenerate')
  @InBuilding(Role.UPRAVNIK)
  regenerateCharges(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PeriodDto,
  ) {
    return this.chargesService.regenerate(buildingId, user.id, dto.period);
  }

  @Post('charges/:id/cancel')
  @InBuilding(Role.UPRAVNIK)
  cancelCharge(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelChargeDto,
  ) {
    return this.chargesService.cancelCharge(buildingId, user.id, id, dto);
  }

  @Post('units/:unitId/opening-balance')
  @InBuilding(Role.UPRAVNIK)
  openingBalance(
    @Param('buildingId') buildingId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: OpeningBalanceDto,
  ) {
    return this.chargesService.openingBalance(buildingId, user.id, unitId, dto);
  }

  @Post('units/:unitId/charges')
  @InBuilding(Role.UPRAVNIK)
  createAdjustment(
    @Param('buildingId') buildingId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.chargesService.adjustment(buildingId, user.id, unitId, dto);
  }

  // Residents may read only their own unit (checked in the service).
  @Get('units/:unitId/ledger')
  @InBuilding()
  unitLedger(
    @Param('buildingId') buildingId: string,
    @Param('unitId') unitId: string,
    @CurrentUser() user: AuthUser,
    @CurrentAccess() access: Access,
  ) {
    return this.chargesService.ledger(buildingId, user.id, access, unitId);
  }

  // Staff get every unit; residents only the building totals.
  @Get('arrears')
  @InBuilding()
  arrears(
    @Param('buildingId') buildingId: string,
    @CurrentAccess() access: Access,
  ) {
    return this.chargesService.arrears(buildingId, access);
  }
}
