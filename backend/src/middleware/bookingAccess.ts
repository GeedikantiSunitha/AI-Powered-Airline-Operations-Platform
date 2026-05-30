import type { Response } from 'express';
import type { BookingRecord, UserRole } from '@airline-ops/shared';
import type { AuthUser } from '../services/auth/authService';

const ELEVATED_ROLES: UserRole[] = ['admin', 'operations_manager'];

export function canAccessBooking(user: AuthUser, booking: BookingRecord): boolean {
  if (ELEVATED_ROLES.includes(user.role)) return true;
  if (booking.createdByUserId && booking.createdByUserId === user.userId) return true;
  return false;
}

export function denyBookingAccess(res: Response): void {
  res.status(403).json({
    error: 'Forbidden',
    message: 'You do not have access to this booking',
  });
}
