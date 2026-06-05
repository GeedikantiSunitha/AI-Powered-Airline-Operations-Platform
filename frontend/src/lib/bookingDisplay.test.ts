import { describe, expect, it } from 'vitest';
import {
  shiftIsoToTravelDate,
  formatTimeLocal,
  formatDuration,
  flightDurationMinutes,
  airportSubtitle,
  formatFlightNumberDisplay,
} from './bookingDisplay';

describe('bookingDisplay', () => {
  it('shiftIsoToTravelDate preserves time with T separator', () => {
    const shifted = shiftIsoToTravelDate('2026-05-21T20:30:00Z', '2026-06-03');
    expect(shifted).toBe('2026-06-03T20:30:00Z');
    expect(formatTimeLocal(shifted)).not.toBe('—');
  });

  it('formats duration from valid ISO pair', () => {
    const dep = '2026-05-21T10:00:00Z';
    const arr = '2026-05-21T12:15:00Z';
    const mins = flightDurationMinutes(dep, arr);
    expect(formatDuration(mins)).toBe('2h 15m');
  });

  it('shows Indian airport subtitle', () => {
    expect(airportSubtitle('HYD')).toContain('HYD,');
    expect(airportSubtitle('HYD')).toContain('Rajiv Gandhi');
  });

  it('formats flight number for display', () => {
    expect(formatFlightNumberDisplay('AI-413')).toBe('AI 413');
    expect(formatFlightNumberDisplay('6E-HYDBLR-AM')).toBe('6E HYDBLR AM');
  });
});
