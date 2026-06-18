import { Logger } from '@nestjs/common';
import {
  INotificationService,
  NotificationMessage,
} from '../../../application/notification/services/notification.interface';

export class MockNotificationService implements INotificationService {
  private readonly logger = new Logger(MockNotificationService.name);

  send(message: NotificationMessage): Promise<void> {
    this.logger.log(
      `[${message.channel}] to ${message.recipient}: ${message.subject}`,
    );
    return Promise.resolve();
  }
}
