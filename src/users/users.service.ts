import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../db/drizzle.module';
import { users, type User } from '../db/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Find a whitelisted user by Telegram id (or undefined).
  async getByTelegramId(telegramId: number): Promise<User | undefined> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);
    return rows[0];
  }

  // The whole whitelist, ordered by name — used e.g. to pick a task recipient.
  listAll(): Promise<User[]> {
    return this.db.select().from(users).orderBy(users.name);
  }
}
