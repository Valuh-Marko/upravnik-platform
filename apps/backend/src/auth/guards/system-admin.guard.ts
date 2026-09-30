import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return user?.systemRole === 'SUPER_ADMIN';
  }
}
