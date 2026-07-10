import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Public health check — used by uptime monitors / load balancers.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
