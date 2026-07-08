import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReplyDto {
  @ApiProperty({ example: 'Servis je obavešten i dolazi u petak.' })
  @IsString()
  @IsNotEmpty()
  body: string;
}
