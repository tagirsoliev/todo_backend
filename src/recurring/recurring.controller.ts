import { Controller, Get, UseGuards } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CronSecretGuard } from '../reminders/guards/cron-secret.guard';
import { RecurringService } from './recurring.service';

@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  // Invoked once daily by Vercel Cron Jobs (see /vercel.json). Same guard as
  // reminders/run — not called by a logged-in user.
  @Public()
  @UseGuards(CronSecretGuard)
  @Get('reset')
  reset() {
    return this.recurringService.resetDue();
  }
}
