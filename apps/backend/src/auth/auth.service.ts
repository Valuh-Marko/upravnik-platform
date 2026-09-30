import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        accountType: true,
        systemRole: true,
        createdAt: true,
        buildingMembers: {
          select: {
            role: true,
            joinedAt: true,
            building: {
              select: { id: true, name: true, address: true, city: true },
            },
            unit: {
              select: { id: true, unitNumber: true, floor: true, type: true },
            },
          },
        },
        threads: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            createdAt: true,
            _count: { select: { replies: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !user.isActive)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwt.sign({
      sub: user.id,
      username: user.username,
      accountType: user.accountType,
      systemRole: user.systemRole ?? undefined,
    });

    return { accessToken: token };
  }
}
