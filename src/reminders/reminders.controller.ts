import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CronSecretGuard } from './guards/cron-secret.guard';
import { RemindersService } from './reminders.service';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  // Invoked by Vercel Cron Jobs (GET, see /vercel.json for the schedule).
  // @Public() opts this route out of the global JwtAuthGuard — it isn't
  // called by a logged-in user, so it is instead protected by CronSecretGuard
  // (checks Authorization: Bearer <CRON_SECRET>, sent automatically by Vercel).
  @Public()
  @UseGuards(CronSecretGuard)
  @Get('run')
  run() {
    return this.remindersService.sendToAll();
  }
}
