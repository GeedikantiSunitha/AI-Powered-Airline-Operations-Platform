import { randomUUID } from 'crypto';
import type { BookingRecord } from '@airline-ops/shared';

export interface BookingConfirmationEmail {
  messageId: string;
  sentTo: string;
  subject: string;
  preview: string;
  sentAt: string;
}

export const notificationService = {
  sendBookingConfirmation(booking: BookingRecord): BookingConfirmationEmail {
    const sentTo = booking.passengers[0]?.email ?? 'unknown@example.com';
    const subject = `Your ticket — PNR ${booking.pnr}`;
    const preview = `Tickets ${booking.ticketNumbers.join(', ')} · Total $${booking.totalUsd.toFixed(2)} USD`;
    const payload: BookingConfirmationEmail = {
      messageId: randomUUID(),
      sentTo,
      subject,
      preview,
      sentAt: new Date().toISOString(),
    };
    console.log('[email]', JSON.stringify(payload));
    return payload;
  },
};
