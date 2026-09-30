import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '../../prisma';

export class CreateDocumentDto {
  @ApiProperty({ example: 'Godišnji izveštaj 2025' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'https://storage.example.com/docs/izvestaj-2025.pdf',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  fileUrl: string;

  @ApiPropertyOptional({ example: 'pdf' })
  @IsString()
  @IsOptional()
  fileType?: string;

  @ApiProperty({ enum: DocumentCategory, example: DocumentCategory.REPORT })
  @IsEnum(DocumentCategory)
  category: DocumentCategory;
}
