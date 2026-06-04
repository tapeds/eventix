/**
 * Read-model DTOs returned by the Event query handlers. These are plain shapes
 * decoupled from the domain aggregates so the presentation layer never depends
 * on domain types.
 */

export type TicketCategoryPurchaseStatus =
  | 'OnSale'
  | 'ComingSoon'
  | 'SalesClosed'
  | 'SoldOut';

/** Lightweight event entry for the available-events list (US6). */
export interface EventSummaryDto {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  /** Lowest price across active ticket categories, or null when there are none. */
  lowestPrice: number | null;
}

/** A ticket category as shown on the event detail page (US7). */
export interface TicketCategoryDto {
  id: string;
  name: string;
  price: number;
  currency: string;
  quota: number;
  salesStartDate: Date;
  salesEndDate: Date;
  status: string;
  purchaseStatus: TicketCategoryPurchaseStatus;
}

/** Full event detail view (US7). */
export interface EventDetailsDto {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  status: string;
  maxCapacity: number;
  ticketCategories: TicketCategoryDto[];
}

/** Sales report aggregated per event (US19). */
export interface SalesReportDto {
  eventId: string;
  ticketsSoldPerCategory: {
    categoryId: string;
    categoryName: string;
    ticketsSold: number;
  }[];
  bookingCountsByStatus: {
    pendingPayment: number;
    paid: number;
    expired: number;
    refunded: number;
  };
  totalRevenue: number;
  currency: string;
}

/** A single participant row (US20). */
export interface ParticipantDto {
  customerId: string;
  customerName: string;
  ticketCategory: string;
  ticketCode: string;
  checkInStatus: string;
}

export type ParticipantListDto = ParticipantDto[];
