import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ThreadCategory } from '../../prisma';

export class CreateComplexThreadDto {
  @ApiProperty({ example: 'Zajednički parking za sve lamele' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Predlažem da organizujemo zajednički parking sistem za sve lamele kompleksa.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ enum: ThreadCategory, example: ThreadCategory.GENERAL })
  @IsEnum(ThreadCategory)
  category: ThreadCategory;
}
