import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { ReportsService } from './reports.service';
import { ReportRangeDto } from './dto/report.dto';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  @InBuilding()
  reports(@Param('buildingId') buildingId: string) {
    return this.reportsService.list(buildingId);
  }

  @Get('preview')
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

  @Post()
  @InBuilding(Role.UPRAVNIK)
  publishReport(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReportRangeDto,
  ) {
    return this.reportsService.publish(buildingId, user.id, dto);
  }
}
