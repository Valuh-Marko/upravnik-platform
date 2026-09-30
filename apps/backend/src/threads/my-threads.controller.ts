import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThreadsService } from './threads.service';

@ApiTags('threads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('threads')
export class MyThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Get()
  @ApiQuery({ name: 'buildingId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'CLOSED'] })
  findAll(
    @Request() req: any,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
  ) {
    return this.threadsService.findAllForUser(
      req.user.id,
      buildingId,
      status,
      req.user.systemRole,
    );
  }
}
