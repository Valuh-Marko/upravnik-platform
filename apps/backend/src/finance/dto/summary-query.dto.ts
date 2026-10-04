import { IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateOnly } from './validators';

// Inclusive date range. Defaults to the current calendar year.
export class DateRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateOnly()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateOnly()
  @IsOptional()
  to?: string;
}
