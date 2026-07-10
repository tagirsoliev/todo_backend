import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Whitelist, for pickers like "assign task to". Requires auth but not admin —
  // any whitelisted user may see who else is on the whitelist (same as the bot).
  @Get()
  list() {
    return this.usersService.listAll();
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
