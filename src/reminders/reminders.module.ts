import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [UsersModule, TasksModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
