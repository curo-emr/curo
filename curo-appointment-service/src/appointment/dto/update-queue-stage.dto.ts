import { IsEnum } from 'class-validator';
import { QueueStage } from '../../enums';

export class UpdateQueueStageDto {
  @IsEnum(QueueStage)
  stage: QueueStage;
}
