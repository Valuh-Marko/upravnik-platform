import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../prisma';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.systemRole === 'SUPER_ADMIN') return true;

    const buildingId = request.params.buildingId;

    if (!buildingId) return false;

    const member = await this.prisma.buildingMember.findUnique({
      where: { buildingId_userId: { buildingId, userId: user.id } },
    });

    return member ? requiredRoles.includes(member.role) : false;
  }
}
