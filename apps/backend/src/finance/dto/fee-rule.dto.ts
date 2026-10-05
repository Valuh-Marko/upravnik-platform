import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { FeeMethod, FinanceFund, UnitType } from '../../prisma';
import { IsNonNegativeMoney, IsPeriod } from './validators';

export class CreateFeeRuleDto {
  @ApiProperty({ enum: FinanceFund, example: FinanceFund.TEKUCE_ODRZAVANJE })
  @IsEnum(FinanceFund)
  fund: FinanceFund;

  @ApiProperty({
    enum: FeeMethod,
    description: 'PER_UNIT: amount per unit. PER_SQM: amount per m² of area.',
  })
  @IsEnum(FeeMethod)
  method: FeeMethod;

  @ApiProperty({
    example: '1500.00',
    description: 'RSD per month. "0" exempts the unit type.',
  })
  @IsNonNegativeMoney()
  amount: string;

  @ApiPropertyOptional({
    enum: UnitType,
    nullable: true,
    description:
      'Only for this unit type, overriding the default rule. Omit or null for the default.',
  })
  @IsEnum(UnitType)
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  unitType?: UnitType | null;

  @ApiProperty({ example: '2026-01', description: 'First month, inclusive.' })
  @IsPeriod()
  validFrom: string;

  @ApiPropertyOptional({
    example: '2026-12',
    nullable: true,
    description: 'Last month, inclusive. Omit or null for open-ended.',
  })
  @IsPeriod()
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  validTo?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: "The assembly's decision (a building document).",
  })
  @IsUUID()
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  decisionDocumentId?: string | null;
}

export class UpdateFeeRuleDto extends PartialType(CreateFeeRuleDto) {}
