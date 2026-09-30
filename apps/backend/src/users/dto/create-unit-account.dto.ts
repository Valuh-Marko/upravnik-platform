import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitAccountDto {
  @ApiProperty({ example: 'unit-uuid-here' })
  @IsString()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ example: '4B' })
  @IsString()
  @IsNotEmpty()
  unitNumber: string;

  @ApiPropertyOptional({ example: 'tenant@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Jovana' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Marković' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '+381691234567' })
  @IsString()
  @IsOptional()
  phone?: string;
}
