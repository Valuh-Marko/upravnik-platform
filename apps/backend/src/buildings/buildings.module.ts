import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';

@Module({
  imports: [ChatModule],
  controllers: [BuildingsController],
  providers: [BuildingsService],
})
export class BuildingsModule {}
