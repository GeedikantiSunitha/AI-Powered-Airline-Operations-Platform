export const funnelMetrics = {
  searches: 0,
  quotes: 0,
  holds: 0,
  bookings: 0,
  tickets: 0,

  record(stage: 'searches' | 'quotes' | 'holds' | 'bookings' | 'tickets'): void {
    this[stage] += 1;
  },

  snapshot(): Record<string, number> {
    return {
      searches: this.searches,
      quotes: this.quotes,
      holds: this.holds,
      bookings: this.bookings,
      tickets: this.tickets,
    };
  },
};
