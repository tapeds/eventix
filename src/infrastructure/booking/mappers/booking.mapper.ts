import { Money } from '../../../common/domain/money.vo';
import { Booking } from '../../../domain/booking/entities/booking.entity';
import {
  BookingStatus,
  BookingStatusEnum,
} from '../../../domain/booking/value-objects/booking-status.vo';
import { BookingOrmEntity } from '../persistence/booking.orm-entity';

export class BookingMapper {
  static toDomain(orm: BookingOrmEntity): Booking {
    return Booking.reconstitute(orm.id, {
      customerId: orm.customerId,
      eventId: orm.eventId,
      ticketCategoryId: orm.ticketCategoryId,
      quantity: orm.quantity,
      unitPrice: new Money(Number(orm.unitPriceAmount), orm.unitPriceCurrency),
      serviceFee: new Money(
        Number(orm.serviceFeeAmount),
        orm.serviceFeeCurrency,
      ),
      totalPrice: new Money(
        Number(orm.totalPriceAmount),
        orm.totalPriceCurrency,
      ),
      status: new BookingStatus(orm.status as BookingStatusEnum),
      createdAt: orm.createdAt,
      paymentDeadline: orm.paymentDeadline,
      paidAt: orm.paidAt,
    });
  }

  static toOrm(booking: Booking): BookingOrmEntity {
    const orm = new BookingOrmEntity();
    orm.id = booking.bookingId.value;
    orm.customerId = booking.customerId;
    orm.eventId = booking.eventId;
    orm.ticketCategoryId = booking.ticketCategoryId;
    orm.quantity = booking.quantity;
    orm.unitPriceAmount = booking.unitPrice.amount.toFixed(2);
    orm.unitPriceCurrency = booking.unitPrice.currency;
    orm.serviceFeeAmount = booking.serviceFee.amount.toFixed(2);
    orm.serviceFeeCurrency = booking.serviceFee.currency;
    orm.totalPriceAmount = booking.totalPrice.amount.toFixed(2);
    orm.totalPriceCurrency = booking.totalPrice.currency;
    orm.status = booking.status.value;
    orm.createdAt = booking.createdAt;
    orm.paymentDeadline = booking.paymentDeadline;
    orm.paidAt = booking.paidAt;
    return orm;
  }
}
