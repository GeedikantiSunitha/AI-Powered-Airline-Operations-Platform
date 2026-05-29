'use client';

import type { SeatMap } from '@airline-ops/shared';

interface SeatMapPickerProps {
  seatMap: SeatMap;
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
  maxSeats: number;
}

export function SeatMapPicker({ seatMap, selectedSeatIds, onToggleSeat, maxSeats }: SeatMapPickerProps) {
  const available = seatMap.seats.filter((s) => s.available);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">
        Select up to {maxSeats} seat{maxSeats > 1 ? 's' : ''} ({selectedSeatIds.length}/{maxSeats} chosen)
      </p>
      <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto rounded border border-slate-700 p-2">
        {available.map((seat) => {
          const selected = selectedSeatIds.includes(seat.seatId);
          const disabled = !selected && selectedSeatIds.length >= maxSeats;
          return (
            <button
              key={seat.seatId}
              type="button"
              disabled={disabled}
              onClick={() => onToggleSeat(seat.seatId)}
              title={`${seat.fareClass} · $${seat.priceUsd}`}
              className={`rounded px-1 py-2 text-xs font-mono ${
                selected
                  ? 'bg-sky-600 text-white'
                  : disabled
                    ? 'cursor-not-allowed bg-slate-800 text-slate-600'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {seat.seatId}
            </button>
          );
        })}
      </div>
    </div>
  );
}
