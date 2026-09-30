import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdmin } from '../auth/access/access.decorators';
import { SetupService } from './setup.service';
import { BulkCreateDto } from './dto/bulk-create.dto';

@ApiTags('setup')
@ApiBearerAuth()
@SuperAdmin()
@Controller('setup')
export class SetupController {
  constructor(private setupService: SetupService) {}

  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateDto) {
    return this.setupService.bulkCreate(dto);
  }
}
