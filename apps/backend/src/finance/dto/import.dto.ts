import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsJSON,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DATE_FORMATS, type DateFormat } from '../import/csv';
import { IsSignedMoney } from './validators';

const Column = () => applyDecorators(IsInt(), Min(0), Max(99), IsOptional());

export class CsvColumnsDto {
  @ApiProperty({ example: 0, description: '0-based column index.' })
  @IsInt()
  @Min(0)
  @Max(99)
  date: number;

  @ApiPropertyOptional({
    description: 'Signed amount (negative = expense). Or use debit + credit.',
  })
  @Column()
  amount?: number;

  @ApiPropertyOptional({ description: 'Duguje / isplata (expense).' })
  @Column()
  debit?: number;

  @ApiPropertyOptional({ description: 'Potražuje / uplata (income).' })
  @Column()
  credit?: number;

  @ApiPropertyOptional()
  @Column()
  counterpartyName?: number;

  @ApiPropertyOptional()
  @Column()
  counterpartyAccount?: number;

  @ApiPropertyOptional({ description: 'Poziv na broj.' })
  @Column()
  reference?: number;

  @ApiPropertyOptional({ description: 'Svrha plaćanja.' })
  @Column()
  purpose?: number;

  @ApiPropertyOptional({ description: "The bank's own line id, if any." })
  @Column()
  id?: number;
}

export class CsvMappingDto {
  @ApiProperty({ enum: ['utf-8', 'windows-1250'] })
  @IsIn(['utf-8', 'windows-1250'])
  encoding: 'utf-8' | 'windows-1250';

  @ApiProperty({ example: ';' })
  @IsString()
  @Length(1, 1)
  delimiter: string;

  @ApiProperty({ example: 1, description: 'Rows before the first data row.' })
  @IsInt()
  @Min(0)
  @Max(50)
  skipRows: number;

  @ApiProperty({ enum: [...DATE_FORMATS] })
  @IsIn([...DATE_FORMATS])
  dateFormat: DateFormat;

  @ApiProperty({ enum: [',', '.'] })
  @IsIn([',', '.'])
  decimalSeparator: ',' | '.';

  @ApiProperty({ type: CsvColumnsDto })
  @ValidateNested()
  @Type(() => CsvColumnsDto)
  columns: CsvColumnsDto;
}

// Multipart fields arrive as strings.
export class UploadStatementDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  bankAccountId: string;

  @ApiPropertyOptional({
    description:
      "CsvMapping as a JSON string. Omit to reuse the account's saved mapping.",
  })
  @IsJSON()
  @IsOptional()
  mapping?: string;

  @ApiPropertyOptional({ example: '42' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  statementNumber?: string;

  @ApiPropertyOptional({ example: '120000.00' })
  @IsSignedMoney()
  @IsOptional()
  openingBalance?: string;

  @ApiPropertyOptional({ example: '125500.00' })
  @IsSignedMoney()
  @IsOptional()
  closingBalance?: string;
}

// null clears a field; an omitted field stays as it is.
export class UpdateStatementLineDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  unitId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  invoiceId?: string | null;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  skip?: boolean;
}
