import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketReplyDto {
  @ApiProperty({
    example: 'Servis je obavešten i dolazi sutra između 10 i 12h.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;
}
