import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AnyUser, CurrentUser } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { StatusFilterQueryDto } from '../common/dto/my-list-query.dto';
import { ThreadsService } from './threads.service';

@ApiTags('threads')
@ApiBearerAuth()
@Controller('threads')
export class MyThreadsController {
  constructor(private threadsService: ThreadsService) {}

  @Get()
  @AnyUser()
  findAll(@CurrentUser() user: AuthUser, @Query() query: StatusFilterQueryDto) {
    return this.threadsService.findAllForUser(
      user,
      query.buildingId,
      query.status,
    );
  }
}
