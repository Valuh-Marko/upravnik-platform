import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('buildings/:buildingId/documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  create(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(buildingId, user.id, dto);
  }

  @Get()
  @InBuilding()
  findAll(@Param('buildingId') buildingId: string) {
    return this.documentsService.findByBuilding(buildingId);
  }

  @Get(':id')
  @InBuilding()
  findOne(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.documentsService.findOne(id, buildingId);
  }
}
