import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplexReplyDto {
  @ApiProperty({ example: 'Slažem se, i mi iz Lamele 3 podržavamo ovaj predlog.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
