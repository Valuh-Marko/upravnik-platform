import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateFeeRuleDto, UpdateFeeRuleDto } from './dto/fee-rule.dto';
import {
  CancelChargeDto,
  CreateAdjustmentDto,
  OpeningBalanceDto,
  PeriodDto,
} from './dto/charge.dto';

// Unit charges (zaduženja): fee rules, monthly runs and per-unit ledgers.
@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance')
export class ChargesController {
  constructor(private chargesService: ChargesService) {}

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
