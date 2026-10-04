import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinanceDirection, FinanceFund } from '../../prisma';
import { DateRangeQueryDto } from './summary-query.dto';
import { IsAccountNumber, IsDateOnly, IsMoney } from './validators';

export class InvoicePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  invoiceId: string;

  @ApiProperty({ example: '3000.00' })
  @IsMoney()
  amount: string;
}

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  bankAccountId: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Category; its direction decides whether this is income or expense.',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: '5000.00' })
  @IsMoney()
  amount: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateOnly()
  valueDate: string;

  @ApiProperty({ example: 'Održavanje lifta – septembar' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'Lift Servis d.o.o.' })
  @IsString()
  @IsOptional()
  counterpartyName?: string;

  @ApiPropertyOptional({ example: '840-742221843-57' })
  @IsAccountNumber()
  @IsOptional()
  counterpartyAccount?: string;

  @ApiPropertyOptional({ example: '97 12-345', description: 'Poziv na broj.' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Paying unit. Only for owner-payment categories.',
  })
  @IsUUID()
  @IsOptional()
  unitId?: string;

  @ApiPropertyOptional({
    type: [InvoicePaymentDto],
    description: 'EXPENSE only. Invoices this payment settles.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoicePaymentDto)
  @IsOptional()
  invoicePayments?: InvoicePaymentDto[];
}

export class ReverseTransactionDto {
  @ApiPropertyOptional({ example: 'Pogrešan iznos' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class TransactionsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: FinanceDirection })
  @IsEnum(FinanceDirection)
  @IsOptional()
  direction?: FinanceDirection;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  bankAccountId?: string;

  @ApiPropertyOptional({ enum: FinanceFund })
  @IsEnum(FinanceFund)
  @IsOptional()
  fund?: FinanceFund;
}
