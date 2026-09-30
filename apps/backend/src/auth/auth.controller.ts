import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { AnyUser, CurrentUser, Public } from './access/access.decorators';
import type { AuthUser } from './access/auth-user';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  @UseGuards(LoginThrottlerGuard)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @AnyUser()
  @ApiBearerAuth()
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  @Post('logout')
  @HttpCode(200)
  @AnyUser()
  @ApiBearerAuth()
  logout() {
    return { message: 'Logged out' };
  }
}
