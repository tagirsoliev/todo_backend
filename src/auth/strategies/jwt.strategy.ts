import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { config } from '../../config';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser, JwtPayload } from '../types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  // Re-checks the whitelist on every request instead of trusting the JWT
  // claims verbatim, so removing a user (or their admin flag) takes effect
  // immediately rather than only after the token expires.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.getByTelegramId(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Пользователь не в белом списке');
    }
    return {
      telegramId: user.telegramId,
      name: user.name,
      isAdmin: user.isAdmin,
    };
  }
}
