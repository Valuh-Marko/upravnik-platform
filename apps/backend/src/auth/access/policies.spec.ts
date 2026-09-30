import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '../../prisma';
import { Access } from './auth-user';
import {
  assertCanClose,
  assertOpen,
  canClose,
  canViewTicket,
  isStaff,
} from './policies';

const as = (role: Role): Access => ({ role, isSuperAdmin: false });

describe('policies', () => {
  it('treats only UPRAVNIK and BOARD_MEMBER as staff', () => {
    expect(isStaff(as(Role.UPRAVNIK))).toBe(true);
    expect(isStaff(as(Role.BOARD_MEMBER))).toBe(true);
    expect(isStaff(as(Role.RESIDENT))).toBe(false);
  });

  it('lets staff and the author view a ticket', () => {
    const ticket = { authorId: 'author' };
    expect(canViewTicket(as(Role.UPRAVNIK), ticket, 'other')).toBe(true);
    expect(canViewTicket(as(Role.BOARD_MEMBER), ticket, 'other')).toBe(true);
    expect(canViewTicket(as(Role.RESIDENT), ticket, 'author')).toBe(true);
    expect(canViewTicket(as(Role.RESIDENT), ticket, 'other')).toBe(false);
  });

  it('lets staff and the author close; others get 403', () => {
    const item = { authorId: 'author' };
    expect(canClose(as(Role.BOARD_MEMBER), item, 'other')).toBe(true);
    expect(canClose(as(Role.RESIDENT), item, 'author')).toBe(true);
    expect(() => assertCanClose(as(Role.RESIDENT), item, 'other')).toThrow(
      ForbiddenException,
    );
  });

  it('rejects closed items with 409', () => {
    expect(() => assertOpen({ status: 'OPEN' })).not.toThrow();
    expect(() => assertOpen({ status: 'CLOSED' })).toThrow(ConflictException);
  });
});
