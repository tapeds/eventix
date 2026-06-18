import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Eventix API')
  .setDescription(
    'REST API for the Eventix Event Ticketing & Booking System. ' +
      'Endpoints are grouped by bounded context: Users, Events, Ticket Categories, ' +
      'Bookings, Tickets, and Refunds.',
  )
  .setVersion('1.0')
  .addServer('/api')
  .addTag('Users')
  .addTag('Events')
  .addTag('Ticket Categories')
  .addTag('Bookings')
  .addTag('Tickets')
  .addTag('Refunds')
  .build();
