import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  CurrentAccess,
  CurrentUser,
  InComplex,
} from '../auth/access/access.decorators';
import type { Access, AuthUser } from '../auth/access/auth-user';
import { ComplexForumService } from './complex-forum.service';
import { CreateComplexThreadDto } from './dto/create-complex-thread.dto';
import { CreateComplexReplyDto } from './dto/create-complex-reply.dto';

@ApiTags('complex-forum')
@ApiBearerAuth()
@Controller('complexes/:complexId/threads')
export class ComplexForumController {
  constructor(private complexForumService: ComplexForumService) {}

  @Post()
  @InComplex()
  create(
    @Param('complexId') complexId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateComplexThreadDto,
  ) {
    return this.complexForumService.createThread(complexId, user.id, dto);
  }

  @Get()
  @InComplex()
  findAll(@Param('complexId') complexId: string) {
    return this.complexForumService.findByComplex(complexId);
  }

  @Get(':id')
  @InComplex()
  findOne(@Param('complexId') complexId: string, @Param('id') id: string) {
    return this.complexForumService.findOne(id, complexId);
  }

  @Post(':id/replies')
  @InComplex()
  createReply(
    @Param('complexId') complexId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateComplexReplyDto,
  ) {
    return this.complexForumService.createReply(id, complexId, user.id, dto);
  }

  @Patch(':id/close')
  @InComplex()
  close(
    @Param('complexId') complexId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @CurrentAccess() access: Access,
  ) {
    return this.complexForumService.closeThread(id, complexId, user.id, access);
  }
}
