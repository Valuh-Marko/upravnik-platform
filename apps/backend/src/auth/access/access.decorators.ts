import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../../prisma';
import { Access, AuthRequest, AuthUser } from './auth-user';

export const ACCESS_POLICY_KEY = 'accessPolicy';

export type AccessPolicy =
  | { kind: 'public' }
  | { kind: 'any-user' }
  | { kind: 'super-admin' }
  | { kind: 'building'; roles: Role[] }
  | { kind: 'complex'; roles: Role[] };

// Applies to a class (default for every handler) or a method (overrides the class).
// Declaring two policies on the same target is a programming error, so it throws at load time.
function policy(value: AccessPolicy) {
  return (
    target: object,
    key?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    const holder = (descriptor?.value as object | undefined) ?? target;
    if (Reflect.hasOwnMetadata(ACCESS_POLICY_KEY, holder)) {
      const name = String(key ?? (target as { name?: string }).name);
      throw new Error(`${name} declares more than one access policy`);
    }
    Reflect.defineMetadata(ACCESS_POLICY_KEY, value, holder);
  };
}

/** No authentication required. */
export const Public = () => policy({ kind: 'public' });

/** Any authenticated user. The handler must scope data to the caller itself. */
export const AnyUser = () => policy({ kind: 'any-user' });

/** Only SUPER_ADMIN. */
export const SuperAdmin = () => policy({ kind: 'super-admin' });

/** Active member of the `:buildingId` building. No roles = any role. */
export const InBuilding = (...roles: Role[]) =>
  policy({ kind: 'building', roles });

/** Active member of any building in the `:complexId` complex (highest role wins). No roles = any role. */
export const InComplex = (...roles: Role[]) =>
  policy({ kind: 'complex', roles });

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthRequest>().user,
);

export const CurrentAccess = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Access =>
    ctx.switchToHttp().getRequest<AuthRequest>().access!,
);
