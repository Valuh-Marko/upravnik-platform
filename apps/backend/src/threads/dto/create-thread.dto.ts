import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ThreadCategory } from '../../prisma';

export class CreateThreadDto {
  @ApiProperty({ example: 'Kvar na liftu' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Lift je van funkcije od jutros. Ko je kontaktirao servis?',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ enum: ThreadCategory, example: ThreadCategory.MAINTENANCE })
  @IsEnum(ThreadCategory)
  category: ThreadCategory;
}
