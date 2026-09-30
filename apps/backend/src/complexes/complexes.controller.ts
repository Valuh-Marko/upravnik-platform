import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  AnyUser,
  CurrentUser,
  InComplex,
  SuperAdmin,
} from '../auth/access/access.decorators';
import type { AuthUser } from '../auth/access/auth-user';
import { ComplexesService } from './complexes.service';
import { CreateComplexDto } from './dto/create-complex.dto';

@ApiTags('complexes')
@ApiBearerAuth()
@Controller('complexes')
export class ComplexesController {
  constructor(private complexesService: ComplexesService) {}

  @Post()
  @SuperAdmin()
  create(@Body() dto: CreateComplexDto) {
    return this.complexesService.create(dto);
  }

  @Get()
  @AnyUser()
  findAll(@CurrentUser() user: AuthUser) {
    return this.complexesService.findAll(user);
  }

  @Get(':complexId')
  @InComplex()
  findOne(@Param('complexId') complexId: string) {
    return this.complexesService.findOne(complexId);
  }
}
