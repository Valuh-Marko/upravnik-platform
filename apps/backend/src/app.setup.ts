import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { Server, ServerOptions } from 'socket.io';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

// Applies the same CORS allowlist to socket.io as to HTTP.
class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private origins: string[],
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origins },
    }) as Server;
  }
}

// Shared by main.ts and the e2e tests so both run the same HTTP pipeline.
export function configureApp(app: INestApplication) {
  const corsOrigins = app
    .get(ConfigService)
    .getOrThrow<string[]>('CORS_ORIGIN');

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(
    new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter),
  );
  app.enableCors({ origin: corsOrigins });
  app.useWebSocketAdapter(new CorsIoAdapter(app, corsOrigins));
  app.setGlobalPrefix('api');
}
