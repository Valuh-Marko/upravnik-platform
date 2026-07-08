import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AccountType, Role } from '../prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemUserDto } from './dto/create-system-user.dto';
import { CreateUnitAccountDto } from './dto/create-unit-account.dto';
import { CreateBoardMemberDto } from './dto/create-board-member.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createSystemUser(dto: CreateSystemUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
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
      await this.prisma.buildingMember.createMany({
        data: dto.buildingIds.map((buildingId) => ({
          buildingId,
          userId: user.id,
          role: Role.UPRAVNIK,
        })),
      });
    }

    return user;
  }

  async createBoardMember(dto: CreateBoardMemberDto, buildingId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
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

    await this.prisma.buildingMember.create({
      data: { buildingId, userId: user.id, role: Role.BOARD_MEMBER },
    });

    return user;
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

    const plainPassword = this.generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const user = await this.prisma.user.create({
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

    await this.prisma.buildingMember.create({
      data: {
        buildingId,
        userId: user.id,
        role: Role.RESIDENT,
        unitId: dto.unitId,
      },
    });

    await this.prisma.unit.update({
      where: { id: dto.unitId },
      data: { userId: user.id },
    });

    return { ...user, plainPassword };
  }

  async resetUnitAccountPassword(userId: string, buildingId: string) {
    await this.prisma.buildingMember.findFirstOrThrow({
      where: { buildingId, userId },
    });

    const plainPassword = this.generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { plainPassword };
  }

  private generatePassword(): string {
    return Math.random().toString(36).slice(2, 10).toUpperCase();
  }
}
