'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { BookingRecord, IropsRecommendation, RebookingOption } from '@airline-ops/shared';
import { api } from '@/lib/apiClient';

const DISRUPTED_FLIGHT = 'FL-20260521-AI302-DEL-BOM';

export default function MyTripsPage() {
  const searchParams = useSearchParams();
  const initialPnr = searchParams.get('pnr') ?? '';
  const [pnr, setPnr] = useState(initialPnr);
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [options, setOptions] = useState<RebookingOption[]>([]);
  const [iropsRecs, setIropsRecs] = useState<IropsRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPnr) void loadTrip(initialPnr);
  }, [initialPnr]);

  async function loadTrip(value: string) {
    setLoading(true);
    setError(null);
    try {
      const record = await api.getPnr(value);
      setBooking(record);
      const [rebook, recs] = await Promise.all([
        api.getRebookOptions(value),
        api.getIropsRecommendations(value).catch(() => [] as IropsRecommendation[]),
      ]);
      setOptions(rebook);
      setIropsRecs(recs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PNR lookup failed');
      setBooking(null);
      setOptions([]);
      setIropsRecs([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRebook(optionId: string) {
    if (!pnr) return;
    setLoading(true);
    try {
      const updated = await api.executeRebook(pnr, optionId);
      setBooking(updated);
      await loadTrip(pnr);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rebook failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!pnr || !confirm('Cancel this booking?')) return;
    setLoading(true);
    try {
      setBooking(await api.cancelBooking(pnr));
      setOptions([]);
      setIropsRecs([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefund() {
    if (!pnr || !confirm('Request refund for this booking?')) return;
    setLoading(true);
    try {
      setBooking(await api.refundBooking(pnr));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setLoading(false);
    }
  }

  const canManage =
    booking && !['CANCELLED', 'REFUNDED'].includes(booking.status);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">My Trips</h2>
      <div className="flex gap-2">
        <input
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          value={pnr}
          onChange={(e) => setPnr(e.target.value.toUpperCase())}
          placeholder="Enter PNR"
        />
        <button
          onClick={() => loadTrip(pnr)}
          disabled={loading}
          className="rounded bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
        >
          Lookup
        </button>
      </div>

      {error ? <p className="text-sm text-ops-critical">{error}</p> : null}

      {booking ? (
        <div className="rounded border border-slate-700 bg-ops-panel p-4 text-sm space-y-2">
          <p>
            <span className="text-slate-400">Status:</span> {booking.status}
          </p>
          <p>
            <span className="text-slate-400">Flight:</span> {booking.flightLegId}
          </p>
          <p>
            <span className="text-slate-400">Fare class:</span> {booking.fareClass}
          </p>
          <p>
            <span className="text-slate-400">Seats:</span> {booking.seatIds.join(', ')}
          </p>
          <p>
            <span className="text-slate-400">Total:</span> ${booking.totalUsd.toFixed(2)}
          </p>
          {booking.ancillaries.length > 0 && (
            <p>
              <span className="text-slate-400">Ancillaries:</span>{' '}
              {booking.ancillaries.map((a) => a.label).join(', ')}
            </p>
          )}
          {canManage && (
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="rounded border border-red-800 px-3 py-1 text-xs text-red-300 hover:bg-red-950"
              >
                Cancel booking
              </button>
              <button
                onClick={handleRefund}
                className="rounded border border-amber-800 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950"
              >
                Request refund
              </button>
              {(booking.flightLegId === DISRUPTED_FLIGHT ||
                booking.flightLegId.includes('AI302')) && (
                <Link
                  href={`/commercial?pnr=${booking.pnr}`}
                  className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500"
                >
                  Commercial optimize →
                </Link>
              )}
            </div>
          )}
        </div>
      ) : null}

      {iropsRecs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Recommended rebooking (commercial)</h3>
          {iropsRecs.map((rec) => (
            <div
              key={rec.optionId}
              className="rounded border border-sky-900/50 bg-sky-950/20 p-3 text-sm"
            >
              <p className="font-medium">
                Score {rec.score} · CX +{rec.cxImpactScore} · Revenue ${rec.revenueImpactUsd}
              </p>
              <p className="text-slate-400">{rec.policy}</p>
              {rec.ancillaryRetentionOffers.length > 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  Retention bundle: {rec.ancillaryRetentionOffers.map((o) => o.label).join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {options.length > 0 && canManage && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Manual rebooking options</h3>
          {options.map((opt) => (
            <div
              key={opt.optionId}
              className="flex items-center justify-between rounded border border-slate-700 bg-slate-900/50 p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {opt.flightNumber} — {opt.policy}
                </p>
                <p className="text-slate-400">
                  Departs {new Date(opt.departure).toLocaleString()}
                  {opt.compensationUsd > 0 ? ` · Compensation $${opt.compensationUsd}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleRebook(opt.optionId)}
                disabled={loading}
                className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500"
              >
                Rebook
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
