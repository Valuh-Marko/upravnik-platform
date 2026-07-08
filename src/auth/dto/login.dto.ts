import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'upravnik@zgrada.rs' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Upravnik123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
