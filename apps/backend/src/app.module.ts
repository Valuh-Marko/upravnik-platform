import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ComplexesModule } from './complexes/complexes.module';
import { BuildingsModule } from './buildings/buildings.module';
import { UnitsModule } from './units/units.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { DocumentsModule } from './documents/documents.module';
import { ThreadsModule } from './threads/threads.module';
import { TicketsModule } from './tickets/tickets.module';
import { ComplexForumModule } from './complex-forum/complex-forum.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SetupModule } from './setup/setup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ComplexesModule,
    BuildingsModule,
    UnitsModule,
    AnnouncementsModule,
    DocumentsModule,
    ThreadsModule,
    TicketsModule,
    ComplexForumModule,
    ChatModule,
    NotificationsModule,
    SetupModule,
  ],
})
export class AppModule {}
