import type { FlightLeg, UnifiedModelPrediction, WeatherModelOutput } from '@airline-ops/shared';
import { wrapPrediction } from '../unified';

const AIRPORT_WEATHER: Record<string, { windKts: number; precipMm: number; visibilityKm: number }> = {
  BOM: { windKts: 22, precipMm: 8.4, visibilityKm: 4.2 },
  DEL: { windKts: 16, precipMm: 3.1, visibilityKm: 6.5 },
  BLR: { windKts: 12, precipMm: 1.2, visibilityKm: 8.0 },
  DXB: { windKts: 18, precipMm: 0.4, visibilityKm: 9.5 },
};

function airportImpact(iata: string): number {
  const wx = AIRPORT_WEATHER[iata] ?? { windKts: 10, precipMm: 1, visibilityKm: 8 };
  const windFactor = Math.min(1, wx.windKts / 30);
  const precipFactor = Math.min(1, wx.precipMm / 12);
  const visibilityFactor = Math.max(0, 1 - wx.visibilityKm / 10);
  return Number((0.45 * windFactor + 0.35 * precipFactor + 0.2 * visibilityFactor).toFixed(2));
}

export const weatherModel = {
  predictUnified(flight: FlightLeg): UnifiedModelPrediction<WeatherModelOutput> {
    const originImpactScore = airportImpact(flight.origin);
    const destinationImpactScore = airportImpact(flight.destination);
    const routeWeatherRiskScore = Number(
      ((originImpactScore * 0.4 + destinationImpactScore * 0.6) * 1.05).toFixed(2)
    );
    const estimatedOperationalDelayMinutes = Math.round(routeWeatherRiskScore * 35);
    const confidence = Math.min(0.95, 0.55 + routeWeatherRiskScore * 0.35);

    return wrapPrediction({
      model: 'weather_impact_v1',
      version: '1.0.0',
      flightLegId: flight.flightLegId,
      confidence,
      features: {
        origin: flight.origin,
        destination: flight.destination,
        origin_impact_score: originImpactScore,
        destination_impact_score: destinationImpactScore,
        route_length_bucket: flight.destination === 'DXB' ? 'long_haul' : 'domestic',
      },
      output: {
        routeWeatherRiskScore,
        originImpactScore,
        destinationImpactScore,
        estimatedOperationalDelayMinutes,
      },
      factors: [
        { factor: 'destination_weather_impact', weight: destinationImpactScore },
        { factor: 'origin_weather_impact', weight: originImpactScore },
        { factor: 'route_exposure_multiplier', weight: 1.05 },
      ],
      shapSummary:
        'Destination airport weather dominates route risk; crosswind and precipitation are primary drivers.',
    });
  },
};
