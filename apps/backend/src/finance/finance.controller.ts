import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  CurrentAccess,
  CurrentUser,
  InBuilding,
} from '../auth/access/access.decorators';
import type { Access, AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { MAX_FILE_BYTES } from '../files/files.service';
import { BudgetsService } from './budgets.service';
import { ChargesService } from './charges.service';
import { FinanceService } from './finance.service';
import { ImportsService } from './imports.service';
import { InvoicesService } from './invoices.service';
import { ReportsService } from './reports.service';
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
import { UpdateStatementLineDto, UploadStatementDto } from './dto/import.dto';
import { UpsertBudgetDto } from './dto/budget.dto';
import { ReportRangeDto } from './dto/report.dto';

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
    private importsService: ImportsService,
    private budgetsService: BudgetsService,
    private reportsService: ReportsService,
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

  // ─── Bank statement import (izvodi) ────────────────────────────

  // Statements carry payer names and accounts, so staff only.
  @Get('imports')
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  imports(@Param('buildingId') buildingId: string) {
    return this.importsService.list(buildingId);
  }

  @Get('imports/:id')
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  import(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.importsService.findOne(buildingId, id);
  }

  @Post('imports')
  @InBuilding(Role.UPRAVNIK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  uploadStatement(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadStatementDto,
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File,
  ) {
    return this.importsService.upload(buildingId, user.id, dto, file);
  }

  @Patch('imports/:id/lines/:lineId')
  @InBuilding(Role.UPRAVNIK)
  updateStatementLine(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateStatementLineDto,
  ) {
    return this.importsService.updateLine(buildingId, id, lineId, dto);
  }

  @Post('imports/:id/commit')
  @InBuilding(Role.UPRAVNIK)
  commitStatement(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importsService.commit(buildingId, user.id, id);
  }

  @Post('imports/:id/discard')
  @InBuilding(Role.UPRAVNIK)
  discardStatement(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importsService.discard(buildingId, user.id, id);
  }

  // ─── Budget (program održavanja) ───────────────────────────────

  @Get('budgets')
  @InBuilding()
  budgets(@Param('buildingId') buildingId: string) {
    return this.budgetsService.list(buildingId);
  }

  @Get('budgets/:year')
  @InBuilding()
  budget(
    @Param('buildingId') buildingId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.budgetsService.findOne(buildingId, year);
  }

  @Put('budgets/:year')
  @InBuilding(Role.UPRAVNIK)
  upsertBudget(
    @Param('buildingId') buildingId: string,
    @Param('year', ParseIntPipe) year: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertBudgetDto,
  ) {
    return this.budgetsService.upsert(buildingId, user.id, year, dto);
  }

  // ─── Reports ───────────────────────────────────────────────────

  @Get('reports')
  @InBuilding()
  reports(@Param('buildingId') buildingId: string) {
    return this.reportsService.list(buildingId);
  }

  @Get('reports/preview')
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  async previewReport(
    @Param('buildingId') buildingId: string,
    @Query() query: ReportRangeDto,
  ) {
    const pdf = await this.reportsService.preview(buildingId, query);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: 'inline; filename="pregled-izvestaja.pdf"',
    });
  }

  @Post('reports')
  @InBuilding(Role.UPRAVNIK)
  publishReport(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReportRangeDto,
  ) {
    return this.reportsService.publish(buildingId, user.id, dto);
  }
}
