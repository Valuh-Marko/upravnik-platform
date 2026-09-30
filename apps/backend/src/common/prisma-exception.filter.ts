import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../prisma';

// Maps Prisma lookup/constraint errors to 404/409 instead of 500.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      case 'P2025': // record not found (…OrThrow, update/delete of a missing row)
      case 'P2003': // foreign key points at a missing row
        return super.catch(new NotFoundException(), host);
      case 'P2002': // unique constraint
        return super.catch(new ConflictException(), host);
      default:
        return super.catch(exception, host);
    }
  }
}
