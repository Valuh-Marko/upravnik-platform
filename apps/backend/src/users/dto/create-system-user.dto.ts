import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSystemUserDto {
  @ApiProperty({ example: 'novi.upravnik@zgrada.rs' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'Petar' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Jovanović' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '+381601234567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['uuid-building-1', 'uuid-building-2'],
    description: 'Buildings to assign this upravnik to immediately.',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  buildingIds?: string[];
}
