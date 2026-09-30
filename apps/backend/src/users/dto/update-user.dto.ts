import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: false,
    description:
      'false disables the whole account (login, API and chat); its history is kept.',
  })
  @IsBoolean()
  isActive: boolean;
}
