import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateOnly, IsMaticniBroj, IsPib } from './validators';

export class UpsertFinanceProfileDto {
  @ApiProperty({ example: 'Stambena zajednica Bulevar Oslobođenja 44' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiProperty({ example: '100002887', description: '9-digit PIB.' })
  @IsPib()
  pib: string;

  @ApiProperty({ example: '17542303', description: '8-digit matični broj.' })
  @IsMaticniBroj()
  maticniBroj: string;

  @ApiPropertyOptional({ example: 'Bulevar Oslobođenja 44, Novi Sad' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: '2026-01-01',
    description:
      'Date the books start. Bank account opening balances are as of this date. Can only change while there are no transactions.',
  })
  @IsDateOnly()
  booksStartDate: string;

  @ApiPropertyOptional({
    example: 30,
    description:
      'Days after a charge is issued before it counts as overdue (0–365). Default 30.',
  })
  @IsInt()
  @Min(0)
  @Max(365)
  @IsOptional()
  paymentTermDays?: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'Issue monthly charges automatically on the 1st at 06:00. Default false.',
  })
  @IsBoolean()
  @IsOptional()
  autoGenerateCharges?: boolean;
}
