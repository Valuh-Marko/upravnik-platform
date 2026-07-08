import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import { SetupService } from './setup.service';
import { BulkCreateDto } from './dto/bulk-create.dto';

@ApiTags('setup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAdminGuard)
@Controller('setup')
export class SetupController {
  constructor(private setupService: SetupService) {}

  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateDto) {
    return this.setupService.bulkCreate(dto);
  }
}
