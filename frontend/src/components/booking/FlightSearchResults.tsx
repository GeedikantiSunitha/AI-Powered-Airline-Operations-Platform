'use client';

import { useMemo, useState } from 'react';
import type { FlightSearchResult } from '@airline-ops/shared';
import {
  TIME_BUCKET_LABELS,
  airlineNameForFlight,
  airportCity,
  airportSubtitle,
  departureTimeBucket,
  fareStripDates,
  formatFlightNumberDisplay,
  localTodayIso,
  formatDateChip,
  formatDepartureHeading,
  formatDuration,
  formatTimeLocal,
  flightDurationMinutes,
  type TimeBucket,
  withTravelDate,
} from '@/lib/bookingDisplay';

function TimeFilterRow({
  title,
  value,
  onChange,
}: {
  title: string;
  value: TimeBucket | null;
  onChange: (v: TimeBucket | null) => void;
}) {
  const buckets: TimeBucket[] = ['before6', 'morning', 'afternoon', 'evening'];
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-400">{title}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-lg border px-3 py-2 text-xs ${
            value === null
              ? 'border-sky-500 bg-sky-950/50 text-sky-200'
              : 'border-slate-700 text-slate-400 hover:border-slate-500'
          }`}
        >
          Any time
        </button>
        {buckets.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(value === b ? null : b)}
            className={`rounded-lg border px-3 py-2 text-xs ${
              value === b
                ? 'border-sky-500 bg-sky-950/50 text-sky-200'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            {TIME_BUCKET_LABELS[b]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FlightDateStrip({
  centerDate,
  selectedDate,
  lowestFareByDate,
  onSelectDate,
}: {
  centerDate: string;
  selectedDate: string;
  lowestFareByDate: Record<string, number | null>;
  onSelectDate: (isoDate: string) => void;
}) {
  const dates = useMemo(() => fareStripDates(centerDate, 14), [centerDate]);
  const today = localTodayIso();

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50 p-2">
      <p className="mb-2 px-1 text-xs text-slate-500">
        Compare fares by date — scroll for upcoming days (indicative)
      </p>
      <div className="flex min-w-max gap-2">
        {dates.map((iso) => {
          const chip = formatDateChip(iso);
          const fare = lowestFareByDate[iso];
          const active = iso === selectedDate;
          const isPast = iso < today;
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onSelectDate(iso)}
              className={`flex min-w-[5.5rem] flex-col items-center rounded-lg border px-3 py-2 text-center transition ${
                isPast
                  ? 'cursor-not-allowed border-slate-800 bg-slate-950 text-slate-600 opacity-50'
                  : active
                    ? 'border-sky-500 bg-sky-600 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
              }`}
            >
              <span className="text-[10px] uppercase opacity-80">{chip.weekday}</span>
              <span className="text-sm font-semibold">{chip.dayMonth}</span>
              <span className={`mt-1 text-xs ${active ? 'text-sky-100' : 'text-emerald-400'}`}>
                {fare != null ? `$${fare}` : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FlightSearchResults({
  flights,
  travelDate,
  origin,
  destination,
  selectedLegId,
  onSelect,
}: {
  flights: FlightSearchResult[];
  travelDate: string;
  origin: string;
  destination: string;
  selectedLegId: string | null;
  onSelect: (flight: FlightSearchResult) => void;
}) {
  const [departureBucket, setDepartureBucket] = useState<TimeBucket | null>(null);

  const displayFlights = useMemo(
    () => flights.map((f) => withTravelDate(f, travelDate)),
    [flights, travelDate]
  );

  const filtered = useMemo(() => {
    const list = departureBucket
      ? displayFlights.filter((f) => departureTimeBucket(f.scheduledDeparture) === departureBucket)
      : displayFlights;
    return [...list].sort(
      (a, b) =>
        new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime()
    );
  }, [displayFlights, departureBucket]);

  const cheapestUsd = useMemo(() => {
    if (filtered.length === 0) return null;
    return Math.min(...filtered.map((f) => f.fareFromUsd));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        {formatDepartureHeading(travelDate)} · {airportCity(origin)} → {airportCity(destination)} ·{' '}
        {filtered.length} flight{filtered.length === 1 ? '' : 's'}
      </p>

      <TimeFilterRow
        title={`Departure from ${airportCity(origin)}`}
        value={departureBucket}
        onChange={setDepartureBucket}
      />

      {filtered.length === 0 ? (
        <p className="rounded border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-400">
          No flights match the selected time window. Clear the filter or pick another departure time.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const duration = flightDurationMinutes(row.scheduledDeparture, row.scheduledArrival);
            const airline = airlineNameForFlight(row.flightNumber, row.airlineName);
            const selected = selectedLegId === row.flightLegId;
            const isCheapest = cheapestUsd !== null && row.fareFromUsd === cheapestUsd;
            return (
              <li key={row.flightLegId}>
                <button
                  type="button"
                  onClick={() => onSelect(row)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-sky-500 bg-sky-950/30 ring-1 ring-sky-500/50'
                      : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-[11rem]">
                      <p className="font-semibold text-slate-100">{airline}</p>
                      <p className="text-sm font-medium text-sky-400">
                        {formatFlightNumberDisplay(row.flightNumber)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Non stop · Economy</p>
                    </div>

                    <div className="flex flex-1 flex-wrap items-center justify-center gap-4 text-center sm:gap-8">
                      <div className="max-w-[11rem]">
                        <p className="text-lg font-semibold text-slate-100">
                          {formatTimeLocal(row.scheduledDeparture)}
                        </p>
                        <p className="text-sm text-slate-200">{airportCity(row.origin)}</p>
                        <p className="text-[11px] leading-snug text-slate-500">
                          {airportSubtitle(row.origin)}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500">
                        <p>{formatDuration(duration)}</p>
                        <p className="mt-1 text-slate-600">———</p>
                      </div>
                      <div className="max-w-[11rem]">
                        <p className="text-lg font-semibold text-slate-100">
                          {formatTimeLocal(row.scheduledArrival)}
                        </p>
                        <p className="text-sm text-slate-200">{airportCity(row.destination)}</p>
                        <p className="text-[11px] leading-snug text-slate-500">
                          {airportSubtitle(row.destination)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {isCheapest ? (
                        <span className="mb-1 inline-block rounded bg-emerald-900/50 px-2 py-0.5 text-[10px] uppercase text-emerald-300">
                          Cheapest
                        </span>
                      ) : null}
                      <p className="text-xl font-semibold text-slate-100">${row.fareFromUsd}</p>
                      <p className="text-xs text-slate-500">per passenger · Economy from</p>
                      <p className="mt-1 text-xs text-slate-500">{row.availableSeats} seats left</p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
