import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from './validators';

// Inclusive; both required (unlike DateRangeQueryDto).
export class ReportRangeDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateOnly()
  from: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateOnly()
  to: string;
}
