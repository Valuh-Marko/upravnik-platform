import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { AccountType, Role } from '../prisma';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { CreateUnitAccountDto } from './dto/create-unit-account.dto';
import { CreateBoardMemberDto } from './dto/create-board-member.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// No 0/O, 1/I/L: generated passwords are read aloud or copied from paper.
const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PASSWORD_LENGTH = 12;

export function generatePassword(): string {
  return Array.from(
    { length: PASSWORD_LENGTH },
    () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)],
  ).join('');
}

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private chat: ChatGateway,
  ) {}

  async createSystemUser(dto: CreateSystemUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.email,
          email: dto.email,
          passwordHash,
          accountType: AccountType.SYSTEM_USER,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
        select: {
          id: true,
          username: true,
          email: true,
          accountType: true,
          createdAt: true,
        },
      });

      if (dto.buildingIds?.length) {
        await tx.buildingMember.createMany({
          data: dto.buildingIds.map((buildingId) => ({
            buildingId,
            userId: user.id,
            role: Role.UPRAVNIK,
          })),
        });
      }

      return user;
    });
  }

  async createBoardMember(dto: CreateBoardMemberDto, buildingId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.email,
          email: dto.email,
          passwordHash,
          accountType: AccountType.SYSTEM_USER,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
        },
        select: {
          id: true,
          username: true,
          email: true,
          accountType: true,
          createdAt: true,
        },
      });

      await tx.buildingMember.create({
        data: { buildingId, userId: user.id, role: Role.BOARD_MEMBER },
      });

      return user;
    });
  }

  async createUnitAccount(dto: CreateUnitAccountDto, buildingId: string) {
    await this.prisma.unit.findFirstOrThrow({
      where: { id: dto.unitId, buildingId },
    });

    const existing = await this.prisma.user.findUnique({
      where: { username: dto.unitNumber },
    });
    if (existing)
      throw new ConflictException('Unit number already has an account');

    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: dto.unitNumber,
          email: dto.email,
          passwordHash,
          accountType: AccountType.UNIT_ACCOUNT,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          unit: { connect: { id: dto.unitId } },
        },
        select: { id: true, username: true, accountType: true },
      });

      await tx.buildingMember.create({
        data: {
          buildingId,
          userId: created.id,
          role: Role.RESIDENT,
          unitId: dto.unitId,
        },
      });

      await tx.unit.update({
        where: { id: dto.unitId },
        data: { userId: created.id },
      });

      return created;
    });

    return { ...user, plainPassword };
  }

  // Only an active unit account (RESIDENT) of this building can be reset. Any other
  // target (a co-UPRAVNIK, a board member, another building's resident) is a 404.
  // Tokens issued before the reset stop working (passwordChangedAt).
  async resetUnitAccountPassword(userId: string, buildingId: string) {
    await this.prisma.buildingMember.findFirstOrThrow({
      where: {
        buildingId,
        userId,
        role: Role.RESIDENT,
        isActive: true,
        user: { accountType: AccountType.UNIT_ACCOUNT },
      },
    });

    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    return { plainPassword };
  }

  // Enables or disables a whole account. A disabled account can't log in, its
  // tokens get 401 and its chat sockets are disconnected.
  async updateUser(id: string, callerId: string, dto: UpdateUserDto) {
    if (id === callerId && !dto.isActive) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        username: true,
        email: true,
        accountType: true,
        isActive: true,
        updatedAt: true,
      },
    });
    if (!dto.isActive) this.chat.disconnectUser(id);
    return user;
  }
}
