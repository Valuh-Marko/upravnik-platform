import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ACCESS_POLICY_KEY, AccessPolicy } from '../access/access.decorators';

// Global guard. Every HTTP route needs a valid token unless it is marked @Public().
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    // The chat gateway authenticates its own connections.
    if (ctx.getType() !== 'http') return true;

    const policy = this.reflector.getAllAndOverride<AccessPolicy | undefined>(
      ACCESS_POLICY_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (policy?.kind === 'public') return true;
    return super.canActivate(ctx);
  }
}
