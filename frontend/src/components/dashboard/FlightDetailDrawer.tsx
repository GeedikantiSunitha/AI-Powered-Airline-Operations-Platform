import type { FlightLeg } from '@airline-ops/shared';

export function FlightDetailDrawer({
  flight,
  onClose,
}: {
  flight: FlightLeg | null;
  onClose: () => void;
}) {
  return (
    <aside
      className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform border-l border-slate-700 bg-slate-950 p-5 shadow-xl transition-transform duration-200 ${
        flight ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Flight details</h3>
        <button
          onClick={onClose}
          className="rounded border border-slate-700 px-2 py-1 text-sm text-slate-300 hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      {!flight ? (
        <p className="text-sm text-slate-400">Select a flight to view details.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <Detail label="Flight" value={flight.flightNumber} />
          <Detail label="Leg ID" value={flight.flightLegId} />
          <Detail label="Route" value={`${flight.origin} → ${flight.destination}`} />
          <Detail label="Status" value={flight.status} />
          <Detail label="Gate" value={flight.gate ?? '—'} />
          <Detail
            label="Delay"
            value={flight.delayMinutes ? `${flight.delayMinutes} min` : 'No delay'}
          />
          <Detail label="Aircraft" value={flight.aircraftRegistration} />
          <Detail label="Scheduled dep." value={new Date(flight.scheduledDeparture).toUTCString()} />
          <Detail
            label="Estimated dep."
            value={flight.estimatedDeparture ? new Date(flight.estimatedDeparture).toUTCString() : '—'}
          />
        </div>
      )}
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-slate-100">{value}</p>
    </div>
  );
}

