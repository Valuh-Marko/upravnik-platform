import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
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

// Date range plus text search and paging. Without `take` the whole list is returned.
export class ListQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ example: 'Petrović', description: 'Text search.' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: 50, description: 'Page size (1–200).' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  take?: number;

  @ApiPropertyOptional({ example: 0, description: 'Rows to skip.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number;
}
