import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  buildingId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
