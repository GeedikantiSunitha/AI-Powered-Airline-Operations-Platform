'use client';

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { FlightLeg } from '@airline-ops/shared';
import 'leaflet/dist/leaflet.css';

const AIRPORT_COORDS: Record<string, [number, number]> = {
  DEL: [28.5562, 77.1],
  BOM: [19.0896, 72.8656],
  BLR: [13.1986, 77.7066],
  DXB: [25.2532, 55.3657],
  HYD: [17.2403, 78.4294],
};

export function FlightMap({
  flights,
  onSelect,
}: {
  flights: FlightLeg[];
  onSelect: (flightLegId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <MapContainer
        center={[22.5, 78.0]}
        zoom={4}
        style={{ height: '280px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {flights.map((flight) => {
          const origin = AIRPORT_COORDS[flight.origin];
          if (!origin) return null;
          const delayed = flight.status === 'DELAYED';
          return (
            <CircleMarker
              key={flight.flightLegId}
              center={origin}
              radius={8}
              pathOptions={{
                color: delayed ? '#f87171' : '#38bdf8',
                fillColor: delayed ? '#f87171' : '#38bdf8',
                fillOpacity: 0.8,
              }}
              eventHandlers={{ click: () => onSelect(flight.flightLegId) }}
            >
              <Tooltip>
                {flight.flightNumber} ({flight.origin} → {flight.destination})
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

