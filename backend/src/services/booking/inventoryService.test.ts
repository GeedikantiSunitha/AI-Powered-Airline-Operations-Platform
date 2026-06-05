import { describe, expect, it } from 'vitest';
import { inventoryService } from './inventoryService';

describe('inventoryService.search', () => {
  it('returns multiple carriers for domestic HYD-BLR', () => {
    const flights = inventoryService.search({
      origin: 'HYD',
      destination: 'BLR',
      passengers: 1,
    });
    expect(flights.length).toBeGreaterThanOrEqual(3);
    const numbers = flights.map((f) => f.flightNumber);
    expect(numbers.some((n) => n.startsWith('AI-'))).toBe(true);
    expect(numbers.some((n) => n.startsWith('6E-'))).toBe(true);
    expect(numbers.some((n) => n.startsWith('UK-'))).toBe(true);
  });

  it('includes airlineName on each result', () => {
    const flights = inventoryService.search({
      origin: 'DEL',
      destination: 'BOM',
      passengers: 1,
    });
    expect(flights.length).toBeGreaterThan(0);
    for (const row of flights) {
      expect(row.airlineName).toBeTruthy();
      expect(row.fareFromUsd).toBeGreaterThan(0);
      expect(row.availableSeats).toBeGreaterThanOrEqual(1);
    }
  });

  it('applies travelDate fare factor without breaking results', () => {
    const base = inventoryService.search({
      origin: 'MAA',
      destination: 'HYD',
      passengers: 1,
    });
    const dated = inventoryService.search({
      origin: 'MAA',
      destination: 'HYD',
      passengers: 1,
      travelDate: '2026-06-15',
    });
    expect(base.length).toBe(dated.length);
    expect(dated[0]?.fareFromUsd).toBeGreaterThan(0);
  });

  it('returns empty when origin equals destination filter mismatch', () => {
    const flights = inventoryService.search({
      origin: 'DEL',
      destination: 'XXX',
      passengers: 1,
    });
    expect(flights).toHaveLength(0);
  });
});
