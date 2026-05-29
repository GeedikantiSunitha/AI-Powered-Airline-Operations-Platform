import { mockFlights } from '../../data/mockFlights';
import { bookingService } from '../booking/bookingService';
import { passengerModel } from '../prediction/models/passengerModel';

export const operationsHub = {
  getCrewDashboard() {
    return mockFlights.map((flight) => {
      const delayed = (flight.delayMinutes ?? 0) > 0;
      return {
        flightLegId: flight.flightLegId,
        flightNumber: flight.flightNumber,
        status: flight.status,
        delayMinutes: flight.delayMinutes ?? 0,
        crew: [
          { crewMemberId: 'CR-1001', role: 'CAPTAIN', legal: !delayed },
          { crewMemberId: 'CR-1002', role: 'FO', legal: true },
          { crewMemberId: 'CR-2001', role: 'PURSER', legal: true },
        ],
        reserveActivationRecommended: delayed && (flight.delayMinutes ?? 0) >= 45,
      };
    });
  },

  getBaggageDashboard() {
    return mockFlights.map((flight) => ({
      flightLegId: flight.flightLegId,
      flightNumber: flight.flightNumber,
      bagsLoaded: 120 + (flight.delayMinutes ?? 0) * 2,
      bagsDelayed: Math.max(0, Math.floor((flight.delayMinutes ?? 0) / 15) * 8),
      avgDelayMinutes: flight.delayMinutes ?? 0,
      status: (flight.delayMinutes ?? 0) > 30 ? 'AT_RISK' : 'NORMAL',
    }));
  },

  getPassengerImpactDashboard() {
    return mockFlights
      .filter((f) => (f.delayMinutes ?? 0) > 0 || f.status === 'DELAYED' || f.status === 'CANCELLED')
      .map((flight) => {
        const prediction = passengerModel.predictUnified(flight);
        const affectedBookings = bookingService
          .listBookings()
          .filter(
            (b) =>
              b.flightLegId === flight.flightLegId &&
              ['TICKETED', 'CONFIRMED', 'REACCOMMODATED'].includes(b.status)
          );
        return {
          flightLegId: flight.flightLegId,
          flightNumber: flight.flightNumber,
          delayMinutes: flight.delayMinutes ?? 0,
          prediction: prediction.output,
          affectedPnrs: affectedBookings.map((b) => b.pnr),
          recommendedAction:
            affectedBookings.length > 0
              ? 'Run commercial IROPS optimization for highest-value PNRs'
              : 'Monitor — no active bookings on this leg',
        };
      });
  },
};
