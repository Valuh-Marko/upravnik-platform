import {
  Body,
  Controller,
  Get,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { MAX_FILE_BYTES } from '../files/files.service';
import { ImportsService } from './imports.service';
import { UpdateStatementLineDto, UploadStatementDto } from './dto/import.dto';

// Bank statement import (izvodi). Statements carry payer names and
// accounts, so staff only.
@ApiTags('finance')
@ApiBearerAuth()
@Controller('buildings/:buildingId/finance/imports')
export class ImportsController {
  constructor(private importsService: ImportsService) {}

  @Get()
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  imports(@Param('buildingId') buildingId: string) {
    return this.importsService.list(buildingId);
  }

  @Get(':id')
  @InBuilding(Role.UPRAVNIK, Role.BOARD_MEMBER)
  import(@Param('buildingId') buildingId: string, @Param('id') id: string) {
    return this.importsService.findOne(buildingId, id);
  }

  @Post()
  @InBuilding(Role.UPRAVNIK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  uploadStatement(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadStatementDto,
    @UploadedFile(new ParseFilePipe()) file: Express.Multer.File,
  ) {
    return this.importsService.upload(buildingId, user.id, dto, file);
  }

  @Patch(':id/lines/:lineId')
  @InBuilding(Role.UPRAVNIK)
  updateStatementLine(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() dto: UpdateStatementLineDto,
  ) {
    return this.importsService.updateLine(buildingId, id, lineId, dto);
  }

  @Post(':id/commit')
  @InBuilding(Role.UPRAVNIK)
  commitStatement(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importsService.commit(buildingId, user.id, id);
  }

  @Post(':id/discard')
  @InBuilding(Role.UPRAVNIK)
  discardStatement(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.importsService.discard(buildingId, user.id, id);
  }
}
