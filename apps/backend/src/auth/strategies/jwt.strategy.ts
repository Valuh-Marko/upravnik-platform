import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessService } from '../access/access.service';
import { AuthUser } from '../access/auth-user';

export interface JwtPayload {
  sub: string;
  username: string;
  accountType: string;
  systemRole?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private access: AccessService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Reloads the user on every request: disabled accounts and tokens issued
  // before the last password change get 401.
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.access.loadUser(payload.sub, payload.iat);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
