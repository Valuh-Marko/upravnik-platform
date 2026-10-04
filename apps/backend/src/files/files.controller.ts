import {
  Controller,
  Get,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser, InBuilding } from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { Role } from '../prisma';
import { FilesService, MAX_FILE_BYTES } from './files.service';

@ApiTags('files')
@ApiBearerAuth()
@Controller('buildings/:buildingId/files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post()
  @InBuilding(Role.UPRAVNIK)
  // Multer stops reading at the limit and answers 413.
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  upload(
    @Param('buildingId') buildingId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile(new ParseFilePipe())
    file: Express.Multer.File,
  ) {
    return this.filesService.upload(buildingId, user.id, file);
  }

  @Get(':fileId/download')
  @InBuilding()
  download(
    @Param('buildingId') buildingId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.downloadUrl(buildingId, fileId);
  }
}
