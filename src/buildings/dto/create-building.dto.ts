import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class CreateBuildingDto {
  @ApiPropertyOptional({ example: 'complex-uuid-here' })
  @IsString()
  @IsOptional()
  complexId?: string;

  @ApiProperty({ example: 'Zgrada B' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Kneza Miloša 5' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Beograd' })
  @IsString()
  @IsNotEmpty()
  city: string;
}
