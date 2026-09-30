import { Module } from '@nestjs/common';
import { ComplexForumController } from './complex-forum.controller';
import { ComplexForumService } from './complex-forum.service';

@Module({
  controllers: [ComplexForumController],
  providers: [ComplexForumService],
})
export class ComplexForumModule {}
