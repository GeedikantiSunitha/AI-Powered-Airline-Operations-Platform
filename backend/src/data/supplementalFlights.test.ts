import { describe, expect, it } from 'vitest';
import { baseMockFlights, mockFlights } from './mockFlights';

describe('supplemental domestic flights', () => {
  it('adds IndiGo and Vistara legs per domestic route', () => {
    const hydBlrBase = baseMockFlights.filter(
      (f) => f.origin === 'HYD' && f.destination === 'BLR'
    );
    expect(hydBlrBase.length).toBeGreaterThanOrEqual(1);

    const hydBlrAll = mockFlights.filter((f) => f.origin === 'HYD' && f.destination === 'BLR');
    expect(hydBlrAll.length).toBeGreaterThanOrEqual(5);
  });

  it('does not add supplemental legs for international routes only', () => {
    const intlOnly = mockFlights.filter(
      (f) =>
        (f.origin === 'DEL' && f.destination === 'JFK') ||
        (f.origin === 'JFK' && f.destination === 'DEL')
    );
    const aiOnly = intlOnly.filter((f) => f.flightNumber.startsWith('AI-'));
    expect(aiOnly.length).toBe(intlOnly.length);
  });
});
