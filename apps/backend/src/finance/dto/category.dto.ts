import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { FinanceDirection, FinanceFund } from '../../prisma';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Održavanje interfona' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FinanceDirection, example: FinanceDirection.EXPENSE })
  @IsEnum(FinanceDirection)
  direction: FinanceDirection;

  @ApiPropertyOptional({
    enum: FinanceFund,
    example: FinanceFund.TEKUCE_ODRZAVANJE,
  })
  @IsEnum(FinanceFund)
  @IsOptional()
  fund?: FinanceFund;

  @ApiPropertyOptional({
    description:
      'INCOME only. Owner payments can be linked to a unit and hide the payer from residents.',
  })
  @IsBoolean()
  @IsOptional()
  isOwnerPayment?: boolean;

  @ApiPropertyOptional({
    description:
      'INCOME only. Market income (e.g. rent) — relevant for the PBN-1 tax return.',
  })
  @IsBoolean()
  @IsOptional()
  isMarketIncome?: boolean;
}

export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['direction'] as const),
) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
