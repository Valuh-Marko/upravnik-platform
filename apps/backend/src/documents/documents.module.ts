import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, RolesGuard],
})
export class DocumentsModule {}
