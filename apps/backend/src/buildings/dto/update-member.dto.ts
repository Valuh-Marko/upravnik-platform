import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberDto {
  @ApiProperty({
    example: false,
    description:
      "false revokes the member's access to this building; their history is kept.",
  })
  @IsBoolean()
  isActive: boolean;
}
