import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
  ) {}

  // The current user's outstanding tasks (as recipient).
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.listOpenForOwner(user.telegramId);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTaskDto,
  ) {
    const ownerId = dto.ownerTelegramId ?? user.telegramId;
    if (ownerId !== user.telegramId) {
      const recipient = await this.usersService.getByTelegramId(ownerId);
      if (!recipient) {
        throw new UnprocessableEntityException(
          'Получатель не найден в белом списке',
        );
      }
    }
    return this.tasksService.create({
      text: dto.text,
      ownerId,
      authorId: user.telegramId,
    });
  }

  @Patch(':id/done')
  async markDone(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const updated = await this.tasksService.markDone(id, user.telegramId);
    if (!updated) throw new NotFoundException('Задача не найдена');
    return updated;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    const updated = await this.tasksService.updateText(
      id,
      user.telegramId,
      dto.text,
    );
    if (!updated) throw new NotFoundException('Задача не найдена');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const deleted = await this.tasksService.delete(id, user.telegramId);
    if (!deleted) throw new NotFoundException('Задача не найдена');
  }
}
