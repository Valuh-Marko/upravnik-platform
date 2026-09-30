import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Limits login attempts per IP + username (limits set in AuthModule's ThrottlerModule).
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: {
    ip?: string;
    body?: { username?: unknown };
  }): Promise<string> {
    const username =
      typeof req.body?.username === 'string'
        ? req.body.username.toLowerCase()
        : '';
    return Promise.resolve(`${req.ip}:${username}`);
  }
}
