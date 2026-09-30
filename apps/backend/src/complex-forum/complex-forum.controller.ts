import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ComplexForumService } from './complex-forum.service';
import { CreateComplexThreadDto } from './dto/create-complex-thread.dto';
import { CreateComplexReplyDto } from './dto/create-complex-reply.dto';

@ApiTags('complex-forum')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('complexes/:complexId/threads')
export class ComplexForumController {
  constructor(private complexForumService: ComplexForumService) {}

  @Post()
  create(
    @Param('complexId') complexId: string,
    @Request() req: any,
    @Body() dto: CreateComplexThreadDto,
  ) {
    return this.complexForumService.createThread(complexId, req.user.id, dto, req.user.systemRole);
  }

  @Get()
  findAll(@Param('complexId') complexId: string, @Request() req: any) {
    return this.complexForumService.findByComplex(complexId, req.user.id, req.user.systemRole);
  }

  @Get(':id')
  findOne(
    @Param('complexId') complexId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.complexForumService.findOne(id, complexId, req.user.id, req.user.systemRole);
  }

  @Post(':id/replies')
  createReply(
    @Param('complexId') complexId: string,
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: CreateComplexReplyDto,
  ) {
    return this.complexForumService.createReply(id, complexId, req.user.id, dto, req.user.systemRole);
  }

  @Patch(':id/close')
  close(
    @Param('complexId') complexId: string,
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.complexForumService.closeThread(id, complexId, req.user.id, req.user.systemRole);
  }
}
