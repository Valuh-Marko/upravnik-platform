import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '../../prisma';
import { Access } from './auth-user';

// Ownership and state rules, in one place. Staff is an allowlist: any role not
// listed here only sees and manages its own items.
const STAFF_ROLES: readonly Role[] = [Role.UPRAVNIK, Role.BOARD_MEMBER];

export function isStaff(access: Pick<Access, 'role'>) {
  return STAFF_ROLES.includes(access.role);
}

// Tickets are private between their author and the building's staff.
export function canViewTicket(
  access: Access,
  ticket: { authorId: string },
  userId: string,
) {
  return isStaff(access) || ticket.authorId === userId;
}

// Threads, tickets and complex-forum threads: the author or staff may close (D2).
export function canClose(
  access: Access,
  item: { authorId: string },
  userId: string,
) {
  return isStaff(access) || item.authorId === userId;
}

export function assertCanClose(
  access: Access,
  item: { authorId: string },
  userId: string,
) {
  if (!canClose(access, item, userId)) throw new ForbiddenException();
}

// Replies to CLOSED items are rejected (D3).
export function assertOpen(item: { status: string }) {
  if (item.status === 'CLOSED') throw new ConflictException('Item is closed');
}
