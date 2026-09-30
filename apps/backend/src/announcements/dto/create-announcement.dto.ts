import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Servisiranje lifta' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Obaveštavamo stanare da će lift biti van funkcije u subotu od 8 do 14h.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}
