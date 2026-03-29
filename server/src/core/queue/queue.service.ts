import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueName } from '@core/types/queue-name.enum';
import { QueueJobName } from '@core/types/queue-job-name.enum';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue(QueueName.Ocr) private readonly ocrQueue: Queue) {}

  async addToOcrQueue(payload: { executionId: number }): Promise<void> {
    await this.ocrQueue.add(QueueJobName.ProcessOcr, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    this.logger.debug(`Added job ${QueueJobName.ProcessOcr} to ${QueueName.Ocr} with payload: ${JSON.stringify(payload)}`);
  }
}
