import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { StorageModule } from './storage/storage.module';
import { FilesModule } from './files/files.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
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
    StorageModule,
    FilesModule,
    FinanceModule,
  ],
})
export class AppModule {}
