import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinanceFund } from '../../prisma';
import { IsNonZeroMoney, IsPeriod } from './validators';

export class PeriodDto {
  @ApiProperty({ example: '2026-10', description: 'Month, YYYY-MM.' })
  @IsPeriod()
  period: string;
}

export class OpeningBalanceDto {
  @ApiProperty({
    example: '12000.00',
    description:
      'Debt on the day the books start. Negative for a prepayment. One per unit.',
  })
  @IsNonZeroMoney()
  amount: string;
}

export class CreateAdjustmentDto {
  @ApiProperty({
    example: '-500.00',
    description: 'Positive charges the unit; negative credits it.',
  })
  @IsNonZeroMoney()
  amount: string;

  @ApiProperty({ example: 'Povraćaj za pogrešno obračunatu površinu' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: FinanceFund })
  @IsEnum(FinanceFund)
  @IsOptional()
  fund?: FinanceFund;
}

export class CancelChargeDto {
  @ApiProperty({ example: 'Pogrešno uneto početno stanje' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
