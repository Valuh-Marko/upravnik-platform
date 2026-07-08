import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [UnitsController],
  providers: [UnitsService, RolesGuard],
})
export class UnitsModule {}
