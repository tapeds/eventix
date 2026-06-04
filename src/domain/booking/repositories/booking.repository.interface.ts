import { Booking } from '../entities/booking.entity';
import { BookingId } from '../value-objects/booking-id.vo';

export interface IBookingRepository {
  save(booking: Booking): Promise<void>;

  findById(id: BookingId): Promise<Booking | null>;

  findActiveByCustomerAndEvent(
    customerId: string,
    eventId: string,
  ): Promise<Booking | null>;

  findByEventId(eventId: string): Promise<Booking[]>;

  delete(id: BookingId): Promise<void>;
}
