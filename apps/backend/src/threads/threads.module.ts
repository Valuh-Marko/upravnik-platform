import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { MyThreadsController } from './my-threads.controller';
import { ThreadsService } from './threads.service';

@Module({
  controllers: [ThreadsController, MyThreadsController],
  providers: [ThreadsService],
})
export class ThreadsModule {}
