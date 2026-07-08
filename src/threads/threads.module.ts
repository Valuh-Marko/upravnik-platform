import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { MyThreadsController } from './my-threads.controller';
import { ThreadsService } from './threads.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [ThreadsController, MyThreadsController],
  providers: [ThreadsService, RolesGuard],
})
export class ThreadsModule {}
