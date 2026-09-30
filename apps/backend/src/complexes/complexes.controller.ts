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
import { SystemAdminGuard } from '../auth/guards/system-admin.guard';
import { ComplexesService } from './complexes.service';
import { CreateComplexDto } from './dto/create-complex.dto';

@ApiTags('complexes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('complexes')
export class ComplexesController {
  constructor(private complexesService: ComplexesService) {}

  @Post()
  @UseGuards(SystemAdminGuard)
  create(@Body() dto: CreateComplexDto) {
    return this.complexesService.create(dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.complexesService.findAll(req.user.id, req.user.systemRole);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.complexesService.findOne(id, req.user.id, req.user.systemRole);
  }
}
