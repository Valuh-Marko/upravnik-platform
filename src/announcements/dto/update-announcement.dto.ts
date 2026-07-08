import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAnnouncementDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}
