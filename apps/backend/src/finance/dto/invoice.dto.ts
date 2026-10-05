import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { ListQueryDto } from './summary-query.dto';
import { IsDateOnly, IsMoney } from './validators';

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export class CreateInvoiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({
    example: '2026-0915',
    description: "Supplier's invoice number.",
  })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiProperty({ example: '2026-09-15' })
  @IsDateOnly()
  issueDate: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsDateOnly()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ example: '4000.00' })
  @IsMoney()
  amount: string;

  @ApiProperty({ format: 'uuid', description: 'EXPENSE category.' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ example: 'Redovan servis lifta za septembar' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'File uploaded via POST /buildings/:buildingId/files.',
  })
  @IsUUID()
  @IsOptional()
  fileId?: string;
}

export class UpdateInvoiceDto extends PartialType(
  OmitType(CreateInvoiceDto, ['supplierId'] as const),
) {}

export class CancelInvoiceDto {
  @ApiProperty({ example: 'Faktura izdata greškom' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class InvoicesQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;
}
