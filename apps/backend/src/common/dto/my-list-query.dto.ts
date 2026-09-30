import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Query for the cross-building "my" lists (GET /announcements).
export class BuildingFilterQueryDto {
  @ApiPropertyOptional({ description: 'Only items from this building.' })
  @IsUUID()
  @IsOptional()
  buildingId?: string;
}

// Query for GET /threads and GET /tickets.
export class StatusFilterQueryDto extends BuildingFilterQueryDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'CLOSED'] })
  @IsEnum(['OPEN', 'CLOSED'])
  @IsOptional()
  status?: 'OPEN' | 'CLOSED';
}
