import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitType } from '../../prisma';

export class BulkCreateUnitDto {
  @ApiProperty({ example: '1-1' })
  @IsString()
  @IsNotEmpty()
  unitNumber: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  floor?: number;

  @ApiProperty({ enum: UnitType, example: UnitType.APARTMENT })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiPropertyOptional({ example: 52.5 })
  @IsNumber()
  @IsOptional()
  areaSqm?: number;
}

export class BulkCreateBuildingDto {
  @ApiProperty({ example: 'Zgrada A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Bulevar Oslobođenja 12' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Novi Sad' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ type: [BulkCreateUnitDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateUnitDto)
  units: BulkCreateUnitDto[];
}

export class BulkCreateComplexDto {
  @ApiProperty({ example: 'Blok 23' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Bulevar Oslobođenja 12' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Novi Sad' })
  @IsString()
  @IsNotEmpty()
  city: string;
}

export class BulkCreateDto {
  @ApiPropertyOptional({ type: BulkCreateComplexDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkCreateComplexDto)
  complex?: BulkCreateComplexDto;

  @ApiProperty({ type: [BulkCreateBuildingDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkCreateBuildingDto)
  buildings: BulkCreateBuildingDto[];
}
