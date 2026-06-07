export type TicketCategoryPurchaseStatus =
  | 'OnSale'
  | 'ComingSoon'
  | 'SalesClosed'
  | 'SoldOut';

export interface EventSummaryDto {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  lowestPrice: number | null;
}

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

export interface ParticipantDto {
  customerId: string;
  customerName: string;
  ticketCategory: string;
  ticketCode: string;
  checkInStatus: string;
}

export type ParticipantListDto = ParticipantDto[];
