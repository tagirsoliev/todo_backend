import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { config } from '../../config';

// Verifies the `Authorization: Bearer <CRON_SECRET>` header Vercel sends when
// invoking a scheduled Cron Job (see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
// Applied only on the reminders "run" route, alongside @Public() to bypass
// the global JwtAuthGuard (this route is not called by a logged-in user).
@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (authHeader !== `Bearer ${config.cronSecret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return true;
  }
}
