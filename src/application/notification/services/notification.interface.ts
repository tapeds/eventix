export type NotificationChannel = 'email' | 'whatsapp';

export interface NotificationMessage {
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
}

export interface INotificationService {
  send(message: NotificationMessage): Promise<void>;
}
