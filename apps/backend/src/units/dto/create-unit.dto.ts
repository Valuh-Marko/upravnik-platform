import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitType } from '../../prisma';

export class CreateUnitDto {
  @ApiProperty({ example: '4B' })
  @IsString()
  @IsNotEmpty()
  unitNumber: string;

  @ApiPropertyOptional({ example: 3 })
  @IsInt()
  @IsOptional()
  floor?: number;

  @ApiProperty({ enum: UnitType, example: UnitType.APARTMENT })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiPropertyOptional({ example: 65.5 })
  @IsNumber()
  @IsOptional()
  areaSqm?: number;
}
