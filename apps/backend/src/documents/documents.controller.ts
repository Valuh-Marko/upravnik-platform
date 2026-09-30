import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../prisma';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('buildings/:buildingId/documents')
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.UPRAVNIK, Role.BOARD_MEMBER)
  create(
    @Param('buildingId') buildingId: string,
    @Request() req: any,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(buildingId, req.user.id, dto);
  }

  @Get()
  findAll(@Param('buildingId') buildingId: string, @Request() req: any) {
    return this.documentsService.findByBuilding(
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }

  @Get(':id')
  findOne(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.documentsService.findOne(
      id,
      buildingId,
      req.user.id,
      req.user.systemRole,
    );
  }
}
