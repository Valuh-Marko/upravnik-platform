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
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { InvoicesService } from './invoices.service';
import {
  CancelInvoiceDto,
  CreateInvoiceDto,
  InvoicesQueryDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance/invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  @InBuilding()
  invoices(
    @Param('buildingId') buildingId: string,
    @Query() query: InvoicesQueryDto,
  ) {
    return this.invoicesService.list(buildingId, query);
  }

  @Get(':id')
  @InBuilding()
  invoice(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(buildingId, id);
  }

  @Post()
  @InBuilding(Role.UPRAVNIK)
  createInvoice(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(buildingId, user.id, dto);
  }

  @Patch(':id')
  @InBuilding(Role.UPRAVNIK)
  updateInvoice(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(buildingId, user.id, id, dto);
  }

  @Post(':id/cancel')
  @InBuilding(Role.UPRAVNIK)
  cancelInvoice(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CancelInvoiceDto,
  ) {
    return this.invoicesService.cancel(buildingId, user.id, id, dto);
  }
}
