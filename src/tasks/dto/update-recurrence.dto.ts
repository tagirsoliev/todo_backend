import { IsIn } from 'class-validator';
import { recurrenceValues, type Recurrence } from '../../db/schema';

export class UpdateRecurrenceDto {
  @IsIn(recurrenceValues)
  recurrence!: Recurrence;
}
