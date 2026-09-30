import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplexDto {
  @ApiProperty({ example: 'Kompleks Sunce' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Bulevar Oslobođenja 12' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Beograd' })
  @IsString()
  @IsNotEmpty()
  city: string;
}
