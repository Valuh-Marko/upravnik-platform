import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, TicketStatus } from '../prisma';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketReplyDto } from './dto/create-ticket-reply.dto';

const SUPER_ADMIN = 'SUPER_ADMIN';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private async getCallerRole(
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    if (systemRole === SUPER_ADMIN) return Role.UPRAVNIK;
    const member = await this.prisma.buildingMember.findUniqueOrThrow({
      where: { buildingId_userId: { buildingId, userId } },
    });
    return member.role;
  }

  private async notifyStaff(
    buildingId: string,
    title: string,
    body: string,
    link: string,
  ) {
    const staff = await this.prisma.buildingMember.findMany({
      where: {
        buildingId,
        role: { in: [Role.UPRAVNIK, Role.BOARD_MEMBER] },
        isActive: true,
      },
      select: { userId: true },
    });
    await Promise.all(
      staff.map((m) => this.notifications.create(m.userId, title, body, link)),
    );
  }

  private isUnread(ticket: {
    updatedAt: Date;
    reads: { lastReadAt: Date }[];
  }): boolean {
    return !ticket.reads[0] || ticket.updatedAt > ticket.reads[0].lastReadAt;
  }

  async createTicket(
    buildingId: string,
    authorId: string,
    dto: CreateTicketDto,
  ) {
    const ticket = await this.prisma.ticket.create({
      data: { buildingId, authorId, ...dto },
    });
    await this.notifyStaff(
      buildingId,
      'Nov tiket otvoren',
      dto.title,
      `/buildings/${buildingId}/tickets/${ticket.id}`,
    );
    return ticket;
  }

  private authorSelect(buildingId: string) {
    return {
      id: true,
      firstName: true,
      lastName: true,
      buildingMembers: {
        where: { buildingId },
        select: {
          unit: { select: { id: true, unitNumber: true, floor: true } },
        },
      },
    };
  }

  private flattenUnit<
    T extends { author: { buildingMembers: { unit: unknown }[] } },
  >(ticket: T) {
    const { buildingMembers, ...author } = ticket.author;
    return {
      ...ticket,
      author: { ...author, unit: buildingMembers[0]?.unit ?? null },
    };
  }

  async findByBuilding(
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    const role = await this.getCallerRole(buildingId, userId, systemRole);
    const where =
      role === Role.RESIDENT
        ? { buildingId, authorId: userId }
        : { buildingId };

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        building: {
          select: { id: true, name: true, address: true, city: true },
        },
        author: { select: this.authorSelect(buildingId) },
        reads: { where: { userId }, select: { lastReadAt: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => {
      const { reads, ...rest } = t;
      return { ...this.flattenUnit(rest), isUnread: this.isUnread(t) };
    });
  }

  async findOne(
    id: string,
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    const role = await this.getCallerRole(buildingId, userId, systemRole);
    const ticket = await this.prisma.ticket.findFirstOrThrow({
      where: { id, buildingId },
      include: {
        building: {
          select: { id: true, name: true, address: true, city: true },
        },
        author: { select: this.authorSelect(buildingId) },
        replies: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        reads: { where: { userId }, select: { lastReadAt: true } },
      },
    });

    if (role === Role.RESIDENT && ticket.authorId !== userId) {
      throw new ForbiddenException();
    }

    await this.prisma.ticketRead.upsert({
      where: { ticketId_userId: { ticketId: id, userId } },
      update: { lastReadAt: new Date() },
      create: { ticketId: id, userId },
    });

    const { reads, ...rest } = ticket;
    return { ...this.flattenUnit(rest), isUnread: false };
  }

  async createReply(
    ticketId: string,
    buildingId: string,
    authorId: string,
    dto: CreateTicketReplyDto,
    systemRole?: string | null,
  ) {
    const role = await this.getCallerRole(buildingId, authorId, systemRole);
    const ticket = await this.prisma.ticket.findFirstOrThrow({
      where: { id: ticketId, buildingId },
    });

    if (role === Role.RESIDENT && ticket.authorId !== authorId) {
      throw new ForbiddenException();
    }

    const reply = await this.prisma.ticketReply.create({
      data: { ticketId, authorId, ...dto },
    });

    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    // Mark as read for the replier (they just wrote it)
    await this.prisma.ticketRead.upsert({
      where: { ticketId_userId: { ticketId, userId: authorId } },
      update: { lastReadAt: new Date() },
      create: { ticketId, userId: authorId },
    });

    const link = `/buildings/${buildingId}/tickets/${ticketId}`;
    if (role === Role.RESIDENT) {
      await this.notifyStaff(
        buildingId,
        'Nova poruka na tiketu',
        ticket.title,
        link,
      );
    } else {
      await this.notifications.create(
        ticket.authorId,
        'Odgovor na vaš tiket',
        ticket.title,
        link,
      );
    }

    return reply;
  }

  async closeTicket(
    id: string,
    buildingId: string,
    userId: string,
    systemRole?: string | null,
  ) {
    const role = await this.getCallerRole(buildingId, userId, systemRole);
    const ticket = await this.prisma.ticket.findFirstOrThrow({
      where: { id, buildingId },
    });

    if (role === Role.RESIDENT && ticket.authorId !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.CLOSED },
    });
  }

  async findAllForUser(
    userId: string,
    buildingId?: string,
    status?: string,
    systemRole?: string | null,
  ) {
    const statusFilter = status ? { status: status as TicketStatus } : {};

    if (systemRole === SUPER_ADMIN) {
      const tickets = await this.prisma.ticket.findMany({
        where: { ...(buildingId ? { buildingId } : {}), ...statusFilter },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              buildingMembers: {
                select: {
                  buildingId: true,
                  unit: { select: { id: true, unitNumber: true, floor: true } },
                },
              },
            },
          },
          building: {
            select: { id: true, name: true, address: true, city: true },
          },
          reads: { where: { userId }, select: { lastReadAt: true } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return tickets.map((t) => {
        const membership = t.author.buildingMembers.find(
          (m) => m.buildingId === t.buildingId,
        );
        const { buildingMembers, ...author } = t.author;
        const { reads, ...rest } = t;
        return {
          ...rest,
          author: { ...author, unit: membership?.unit ?? null },
          isUnread: this.isUnread(t),
        };
      });
    }

    const memberships = await this.prisma.buildingMember.findMany({
      where: { userId },
      select: {
        buildingId: true,
        role: true,
        unit: { select: { id: true, unitNumber: true, floor: true } },
      },
    });

    const staffIds = memberships
      .filter((m) => m.role === Role.UPRAVNIK || m.role === Role.BOARD_MEMBER)
      .map((m) => m.buildingId);
    const residentIds = memberships
      .filter((m) => m.role === Role.RESIDENT)
      .map((m) => m.buildingId);

    const conditions: object[] = [];

    const staffBuildings = buildingId
      ? staffIds.filter((id) => id === buildingId)
      : staffIds;
    if (staffBuildings.length > 0)
      conditions.push({ buildingId: { in: staffBuildings } });

    const residentBuildings = buildingId
      ? residentIds.filter((id) => id === buildingId)
      : residentIds;
    if (residentBuildings.length > 0)
      conditions.push({
        buildingId: { in: residentBuildings },
        authorId: userId,
      });

    if (conditions.length === 0) return [];

    const tickets = await this.prisma.ticket.findMany({
      where: { OR: conditions, ...statusFilter },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            buildingMembers: {
              select: {
                buildingId: true,
                unit: { select: { id: true, unitNumber: true, floor: true } },
              },
            },
          },
        },
        building: {
          select: { id: true, name: true, address: true, city: true },
        },
        reads: { where: { userId }, select: { lastReadAt: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tickets.map((t) => {
      const membership = t.author.buildingMembers.find(
        (m) => m.buildingId === t.buildingId,
      );
      const { buildingMembers, ...author } = t.author;
      const { reads, ...rest } = t;
      return {
        ...rest,
        author: { ...author, unit: membership?.unit ?? null },
        isUnread: this.isUnread(t),
      };
    });
  }
}
