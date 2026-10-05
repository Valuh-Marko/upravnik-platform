import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsAccountNumber, IsMaticniBroj, IsPib } from './validators';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Lift Servis d.o.o.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '104052135' })
  @IsPib()
  @IsOptional()
  pib?: string;

  @ApiPropertyOptional({ example: '20123456' })
  @IsMaticniBroj()
  @IsOptional()
  maticniBroj?: string;

  @ApiPropertyOptional({ example: '840-742221843-57' })
  @IsAccountNumber()
  @IsOptional()
  bankAccount?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
