import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketCategory } from '../../prisma';

export class CreateTicketDto {
  @ApiProperty({ example: 'Kvar na grejanju u stanu' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example:
      'Od jutros nemam grejanje u dnevnoj sobi. Molim hitnu intervenciju.',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ enum: TicketCategory, example: TicketCategory.MAINTENANCE })
  @IsEnum(TicketCategory)
  category: TicketCategory;
}
