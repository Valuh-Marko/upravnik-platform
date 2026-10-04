import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsAccountNumber, IsSignedMoney } from './validators';

export class CreateBankAccountDto {
  @ApiProperty({ example: 'Banca Intesa' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({
    example: '840-742221843-57',
    description: 'Short (with dashes) or 18-digit form. Stored as 18 digits.',
  })
  @IsAccountNumber()
  accountNumber: string;

  @ApiProperty({
    example: '125000.00',
    description: 'Balance on the books start date. May be negative.',
  })
  @IsSignedMoney()
  openingBalance: string;

  @ApiPropertyOptional({
    description:
      'Account owners pay into. The first account is always primary.',
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class UpdateBankAccountDto extends PartialType(CreateBankAccountDto) {
  @ApiPropertyOptional({
    description:
      'false hides the account from new entries. The primary account cannot be deactivated.',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
