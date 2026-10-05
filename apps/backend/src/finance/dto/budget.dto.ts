import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateOnly, IsNonNegativeMoney } from './validators';

export class BudgetLineDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: '240000.00' })
  @IsNonNegativeMoney()
  plannedAmount: string;

  @ApiPropertyOptional({ example: 'Redovan servis lifta' })
  @IsString()
  @IsOptional()
  note?: string;
}

// Replaces the year's budget: lines not listed are removed.
export class UpsertBudgetDto {
  @ApiPropertyOptional({
    example: '2026-01-20',
    nullable: true,
    description: 'Date the assembly adopted the programme.',
  })
  @IsDateOnly()
  @IsOptional()
  adoptedAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  decisionDocumentId?: string | null;

  @ApiProperty({ type: [BudgetLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetLineDto)
  lines: BudgetLineDto[];
}
