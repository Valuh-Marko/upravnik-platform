import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_POLICY_KEY, AccessPolicy } from './access.decorators';
import { AccessService } from './access.service';
import { Access, AuthRequest, isSuperAdmin } from './auth-user';

// Global guard, runs after JwtAuthGuard. Enforces the route's access policy and
// attaches the resolved role to req.access. A route without a policy is denied.
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private access: AccessService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // The chat gateway authorizes its own events.
    if (ctx.getType() !== 'http') return true;

    const policy = this.reflector.getAllAndOverride<AccessPolicy | undefined>(
      ACCESS_POLICY_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!policy) throw new ForbiddenException();
    if (policy.kind === 'public' || policy.kind === 'any-user') return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const user = req.user;
    const superAdmin = isSuperAdmin(user);

    if (policy.kind === 'super-admin') {
      if (!superAdmin) throw new ForbiddenException();
      return true;
    }

    const { params } = req;
    const role =
      policy.kind === 'building'
        ? await this.access.resolveBuildingRole(user, params.buildingId)
        : await this.access.resolveComplexRole(user, params.complexId);

    if (!role || (policy.roles.length > 0 && !policy.roles.includes(role))) {
      throw new ForbiddenException();
    }

    const access: Access =
      policy.kind === 'building'
        ? { role, isSuperAdmin: superAdmin, buildingId: params.buildingId }
        : { role, isSuperAdmin: superAdmin, complexId: params.complexId };
    req.access = access;
    return true;
  }
}
