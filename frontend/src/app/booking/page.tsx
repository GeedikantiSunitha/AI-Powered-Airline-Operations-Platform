'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AncillaryOffer,
  BookingRecord,
  FareClass,
  FareQuote,
  FlightSearchResult,
  PassengerDetail,
  SeatMap,
} from '@airline-ops/shared';
import { api, type BookingConfirmationEmail } from '@/lib/apiClient';
import { FlightDateStrip, FlightSearchResults } from '@/components/booking/FlightSearchResults';
import { SeatMapPicker } from '@/components/booking/SeatMapPicker';
import {
  airlineNameForFlight,
  airportCity,
  airportSubtitle,
  clampTravelDate,
  fareStripDates,
  formatFlightNumberDisplay,
  formatTimeLocal,
  indicativeDayFare,
  localMaxBookableIso,
  localTodayIso,
  withTravelDate,
} from '@/lib/bookingDisplay';

type Step = 'search' | 'passengers' | 'payment' | 'done';

interface PassengerFormRow extends PassengerDetail {
  key: string;
}

interface PaymentForm {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

const FARE_CLASSES: FareClass[] = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS'];

function emptyPassenger(): PassengerFormRow {
  return { key: crypto.randomUUID(), firstName: '', lastName: '', email: '' };
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePayment(payment: PaymentForm): string | null {
  const digits = payment.cardNumber.replace(/\s/g, '');
  if (!payment.cardholderName.trim()) return 'Cardholder name is required';
  if (digits.length < 15 || digits.length > 16) return 'Enter a valid card number (15–16 digits)';
  if (!/^\d{2}\/\d{2}$/.test(payment.expiry)) return 'Expiry must be MM/YY';
  if (!/^\d{3,4}$/.test(payment.cvv)) return 'CVV must be 3 or 4 digits';
  return null;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

const AIRPORT_LABELS: Record<string, string> = {
  DEL: 'Delhi (DEL)',
  BOM: 'Mumbai (BOM)',
  BLR: 'Bengaluru (BLR)',
  HYD: 'Hyderabad (HYD)',
  MAA: 'Chennai (MAA)',
  CCU: 'Kolkata (CCU)',
  PNQ: 'Pune (PNQ)',
  GOI: 'Goa (GOI)',
  DXB: 'Dubai (DXB)',
  LHR: 'London Heathrow (LHR)',
  JFK: 'New York JFK (JFK)',
  EWR: 'Newark (EWR)',
  ORD: 'Chicago O\'Hare (ORD)',
  SFO: 'San Francisco (SFO)',
  IAD: 'Washington Dulles (IAD)',
  YYZ: 'Toronto Pearson (YYZ)',
  YVR: 'Vancouver (YVR)',
};

type TravelScope = 'domestic' | 'international';

/** Major Indian airports in this demo network (domestic route plan). */
const INDIAN_AIRPORT_CODES = ['BLR', 'BOM', 'CCU', 'DEL', 'GOI', 'HYD', 'MAA', 'PNQ'] as const;
const INDIAN_AIRPORT_SET = new Set<string>(INDIAN_AIRPORT_CODES);

/** Hubs with published India ↔ abroad legs in this demo (Middle East, Europe, US, Canada). */
const INTERNATIONAL_AIRPORT_CODES = [
  'DXB',
  'LHR',
  'JFK',
  'EWR',
  'ORD',
  'SFO',
  'IAD',
  'YYZ',
  'YVR',
] as const;
const INTERNATIONAL_AIRPORT_SET = new Set<string>(INTERNATIONAL_AIRPORT_CODES);

function isDomesticPair(from: string, to: string): boolean {
  return INDIAN_AIRPORT_SET.has(from) && INDIAN_AIRPORT_SET.has(to);
}

function isInternationalPair(from: string, to: string): boolean {
  return (
    (INDIAN_AIRPORT_SET.has(from) && INTERNATIONAL_AIRPORT_SET.has(to)) ||
    (INTERNATIONAL_AIRPORT_SET.has(from) && INDIAN_AIRPORT_SET.has(to))
  );
}

function parseRoute(route: string): { from: string; to: string } | null {
  const [from, to] = route.split('-');
  if (!from || !to || from === to) return null;
  return { from, to };
}

function buildRouteGraph(routes: string[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const route of routes) {
    const [from, to] = route.split('-');
    if (!from || !to || from === to) continue;
    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from)!.add(to);
  }
  return graph;
}

function airportLabel(code: string): string {
  return AIRPORT_LABELS[code] ?? code;
}

export default function BookingPage() {
  const [step, setStep] = useState<Step>('search');
  const [origin, setOrigin] = useState('DEL');
  const [destination, setDestination] = useState('BOM');
  const [passengerCount, setPassengerCount] = useState(1);
  const [fareClass, setFareClass] = useState<FareClass>('ECONOMY');
  const [results, setResults] = useState<FlightSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState<string[]>([]);
  const [selected, setSelected] = useState<FlightSearchResult | null>(null);
  const [quote, setQuote] = useState<FareQuote | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerRows, setPassengerRows] = useState<PassengerFormRow[]>([emptyPassenger()]);
  const [offers, setOffers] = useState<AncillaryOffer[]>([]);
  const [experimentVariant, setExperimentVariant] = useState<string | null>(null);
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentForm>({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [pendingBooking, setPendingBooking] = useState<BookingRecord | null>(null);
  const [failedPaymentId, setFailedPaymentId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<BookingConfirmationEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journeyPick, setJourneyPick] = useState('');
  const [travelScope, setTravelScope] = useState<TravelScope>('domestic');
  const [departureDate, setDepartureDate] = useState(() => localTodayIso());
  const bookableMin = localTodayIso();
  const bookableMax = localMaxBookableIso();
  const [returnDate, setReturnDate] = useState('');

  useEffect(() => {
    setPassengerRows((prev) => {
      if (prev.length === passengerCount) return prev;
      if (prev.length < passengerCount) {
        return [...prev, ...Array.from({ length: passengerCount - prev.length }, emptyPassenger)];
      }
      return prev.slice(0, passengerCount);
    });
  }, [passengerCount]);

  useEffect(() => {
    void api
      .searchFlights({ origin: 'DEL', destination: 'BOM', passengers: 1 })
      .then(({ availableRoutes }) => {
        if (availableRoutes.length > 0) setAvailableRoutes(availableRoutes);
      })
      .catch(() => {
        /* routes hint is optional */
      });
  }, []);

  const routeGraph = useMemo(() => buildRouteGraph(availableRoutes), [availableRoutes]);

  const domesticRoutes = useMemo(
    () =>
      availableRoutes.filter((route) => {
        const pair = parseRoute(route);
        return pair ? isDomesticPair(pair.from, pair.to) : false;
      }),
    [availableRoutes]
  );

  const internationalRoutes = useMemo(
    () =>
      availableRoutes.filter((route) => {
        const pair = parseRoute(route);
        return pair ? isInternationalPair(pair.from, pair.to) : false;
      }),
    [availableRoutes]
  );

  const scopedRoutes = travelScope === 'domestic' ? domesticRoutes : internationalRoutes;

  const originOptions = useMemo(() => {
    if (travelScope === 'domestic') {
      return INDIAN_AIRPORT_CODES.filter((code) => {
        const dests = routeGraph.get(code);
        return dests && [...dests].some((to) => isDomesticPair(code, to));
      }).sort((a, b) => airportLabel(a).localeCompare(airportLabel(b)));
    }

    const indiaOutbound = INDIAN_AIRPORT_CODES.filter((code) => {
      const dests = routeGraph.get(code);
      return dests && [...dests].some((to) => isInternationalPair(code, to));
    });
    const foreignInbound = INTERNATIONAL_AIRPORT_CODES.filter((code) => {
      const dests = routeGraph.get(code);
      return dests && [...dests].some((to) => INDIAN_AIRPORT_SET.has(to));
    });
    return [...indiaOutbound, ...foreignInbound].sort((a, b) =>
      airportLabel(a).localeCompare(airportLabel(b))
    );
  }, [routeGraph, travelScope]);

  const destinationOptions = useMemo(() => {
    const fromGraph = routeGraph.get(origin);
    if (!fromGraph || fromGraph.size === 0) return [];
    const matcher = travelScope === 'domestic' ? isDomesticPair : isInternationalPair;
    return [...fromGraph]
      .filter((to) => matcher(origin, to))
      .sort((a, b) => airportLabel(a).localeCompare(airportLabel(b)));
  }, [routeGraph, origin, travelScope]);

  const journeyOptions = useMemo(
    () =>
      scopedRoutes
        .map((route) => {
          const pair = parseRoute(route);
          if (!pair) return null;
          return {
            route,
            from: pair.from,
            to: pair.to,
            label: `${airportLabel(pair.from)} → ${airportLabel(pair.to)}`,
          };
        })
        .filter((row): row is { route: string; from: string; to: string; label: string } => row !== null)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [scopedRoutes]
  );

  const routePlanByOrigin = useMemo(() => {
    const matcher = travelScope === 'domestic' ? isDomesticPair : isInternationalPair;
    return originOptions.map((from) => ({
      from,
      label: airportLabel(from),
      destinations: [...(routeGraph.get(from) ?? [])]
        .filter((to) => matcher(from, to))
        .sort((a, b) => airportLabel(a).localeCompare(airportLabel(b))),
    }));
  }, [originOptions, routeGraph, travelScope]);

  useEffect(() => {
    if (travelScope === 'domestic') {
      setOrigin('DEL');
      setDestination('BOM');
    } else {
      setOrigin('DEL');
      setDestination('DXB');
    }
    setJourneyPick('');
    setHasSearched(false);
    setResults([]);
  }, [travelScope]);

  useEffect(() => {
    if (originOptions.length === 0) return;
    if (!originOptions.includes(origin)) {
      setOrigin(originOptions[0]);
    }
  }, [origin, originOptions]);

  useEffect(() => {
    if (destinationOptions.length === 0) return;
    if (!destinationOptions.includes(destination)) {
      setDestination(destinationOptions[0]);
    }
  }, [destination, destinationOptions]);

  const ancillaryTotal = useMemo(
    () =>
      offers
        .filter((o) => selectedOffers.includes(o.offerId))
        .reduce((sum, o) => sum + o.discountedPriceUsd, 0),
    [offers, selectedOffers]
  );

  const totalDue = (quote?.totalUsd ?? 0) + ancillaryTotal;

  const lowestFareByDate = useMemo(() => {
    const base =
      results.length > 0 ? Math.min(...results.map((f) => f.fareFromUsd)) : null;
    const map: Record<string, number | null> = {};
    for (const iso of fareStripDates(departureDate, 14)) {
      map[iso] = base != null ? indicativeDayFare(base, iso) : null;
    }
    return map;
  }, [results, departureDate]);

  async function searchForDate(isoDate: string) {
    setDepartureDate(isoDate);
    const from = origin.trim().toUpperCase();
    const to = destination.trim().toUpperCase();
    if (!from || !to || from === to) return;
    setLoading(true);
    setError(null);
    try {
      const { flights, availableRoutes: routes } = await api.searchFlights({
        origin: from,
        destination: to,
        passengers: passengerCount,
        travelDate: isoDate,
      });
      setHasSearched(true);
      setResults(flights);
      setAvailableRoutes(routes);
      setSelected(flights[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  function swapOriginDestination() {
    const reverseAllowed = routeGraph.get(destination)?.has(origin);
    if (reverseAllowed) {
      setOrigin(destination);
      setDestination(origin);
      return;
    }
    setOrigin(destination);
    const nextDest = routeGraph.get(destination);
    if (nextDest && nextDest.size > 0) setDestination([...nextDest].sort()[0]);
  }

  async function handleSearch() {
    const from = origin.trim().toUpperCase();
    const to = destination.trim().toUpperCase();
    if (!from || !to) {
      setError('Select origin and destination');
      return;
    }
    if (from === to) {
      setError('Origin and destination must be different airports');
      return;
    }

    setLoading(true);
    setError(null);
    setBooking(null);
    setStep('search');
    try {
      const { flights, availableRoutes: routes } = await api.searchFlights({
        origin: from,
        destination: to,
        passengers: passengerCount,
        travelDate: departureDate,
      });
      setHasSearched(true);
      setResults(flights);
      setAvailableRoutes(routes);
      setSelected(flights[0] ?? null);
      setQuote(null);
      setSeatMap(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleContinueToPassengers() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      const [fareQuote, map] = await Promise.all([
        api.getFareQuote(selected.flightLegId, fareClass, passengerCount),
        api.getSeatMap(selected.flightLegId),
      ]);
      setQuote(fareQuote);
      setSeatMap(map);
      setSelectedSeats([]);
      setStep('passengers');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load flight details';
      setError(
        msg.includes('Fare not available') || msg.includes('404')
          ? 'No seats available for this fare class. Try another class or route.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshQuote(nextClass: FareClass) {
    if (!selected) return;
    setFareClass(nextClass);
    try {
      const fareQuote = await api.getFareQuote(selected.flightLegId, nextClass, passengerCount);
      setQuote(fareQuote);
    } catch {
      /* keep prior quote */
    }
  }

  function validatePassengers(): string | null {
    if (selectedSeats.length !== passengerCount) {
      return `Select ${passengerCount} seat(s) on the map`;
    }
    for (let i = 0; i < passengerRows.length; i++) {
      const p = passengerRows[i];
      if (!p.firstName.trim() || !p.lastName.trim()) {
        return `Passenger ${i + 1}: first and last name are required`;
      }
      if (!validateEmail(p.email.trim())) {
        return `Passenger ${i + 1}: enter a valid email`;
      }
    }
    return null;
  }

  async function handleContinueToPayment() {
    const validationError = validatePassengers();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const primary = passengerRows[0];
    setPayment((prev) => ({
      ...prev,
      cardholderName: prev.cardholderName || `${primary.firstName} ${primary.lastName}`.trim(),
    }));
    try {
      const { offers: listed, experiment } = await api.getAncillaryOffers(primary.email.trim());
      setOffers(listed);
      setExperimentVariant(experiment?.variant ?? null);
      setSelectedOffers([]);
    } catch {
      setOffers([]);
    }
    setStep('payment');
  }

  function toggleSeat(seatId: string) {
    setSelectedSeats((prev) => {
      if (prev.includes(seatId)) return prev.filter((id) => id !== seatId);
      if (prev.length >= passengerCount) return prev;
      return [...prev, seatId];
    });
  }

  async function handlePayAndBook() {
    if (!selected || !quote) return;
    const passengerError = validatePassengers();
    if (passengerError) {
      setError(passengerError);
      setStep('passengers');
      return;
    }
    const paymentError = validatePayment(payment);
    if (paymentError) {
      setError(paymentError);
      return;
    }

    setLoading(true);
    setError(null);
    const payKey = idempotencyKey || `idem-${Date.now()}`;
    setIdempotencyKey(payKey);

    try {
      const passengers: PassengerDetail[] = passengerRows.map(({ firstName, lastName, email }) => ({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      }));

      const holdId = await api.createHold({
        flightLegId: selected.flightLegId,
        fareClass,
        passengers,
        seatIds: selectedSeats,
        quoteId: quote.quoteId,
      });

      let activeBooking = await api.createBookingFromHold(holdId);

      const ancillaries = offers
        .filter((o) => selectedOffers.includes(o.offerId))
        .map((o) => ({ code: o.code, label: o.label, priceUsd: o.discountedPriceUsd }));

      if (ancillaries.length > 0) {
        activeBooking = await api.addBookingAncillaries(activeBooking.bookingId, ancillaries);
      }

      setPendingBooking(activeBooking);

      const payResult = await api.confirmBookingPayment(
        activeBooking.bookingId,
        payKey,
        payment.cardNumber.replace(/\s/g, '')
      );

      if (payResult.payment.status !== 'succeeded') {
        setFailedPaymentId(payResult.payment.paymentId);
        setPendingBooking(payResult.booking);
        setError('Payment declined. Update your card and tap Retry payment (test: avoid card ending in 0000).');
        return;
      }

      setFailedPaymentId(null);
      const issued = await api.issueBookingTicket(activeBooking.bookingId);
      setBooking(issued.booking);
      setConfirmationEmail(issued.confirmationEmail);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryPayment() {
    if (!pendingBooking || !failedPaymentId) return;
    const paymentError = validatePayment(payment);
    if (paymentError) {
      setError(paymentError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payResult = await api.retryBookingPayment(
        pendingBooking.bookingId,
        failedPaymentId,
        idempotencyKey,
        payment.cardNumber.replace(/\s/g, '')
      );
      if (payResult.payment.status !== 'succeeded' || payResult.booking.status !== 'CONFIRMED') {
        setError('Payment still declined. Use a different card (e.g. 4111 1111 1111 1111).');
        return;
      }
      const issued = await api.issueBookingTicket(pendingBooking.bookingId);
      setBooking(issued.booking);
      setConfirmationEmail(issued.confirmationEmail);
      setFailedPaymentId(null);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Book a Flight</h2>

      <nav className="flex flex-wrap gap-2 text-xs">
        {(['search', 'passengers', 'payment', 'done'] as Step[]).map((s, idx) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 ${
              step === s ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-500'
            }`}
          >
            {idx + 1}. {s}
          </span>
        ))}
      </nav>

      {error ? <p className="text-sm text-ops-critical">{error}</p> : null}

      {step === 'search' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Journey type</span>
            <button
              type="button"
              onClick={() => setTravelScope('domestic')}
              className={`rounded-full px-4 py-1.5 text-sm ${
                travelScope === 'domestic'
                  ? 'bg-sky-600 text-white'
                  : 'border border-slate-600 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Domestic (India)
            </button>
            <button
              type="button"
              onClick={() => setTravelScope('international')}
              className={`rounded-full px-4 py-1.5 text-sm ${
                travelScope === 'international'
                  ? 'bg-sky-600 text-white'
                  : 'border border-slate-600 text-slate-300 hover:bg-slate-800'
              }`}
            >
              International
            </button>
          </div>

          {journeyOptions.length > 0 && (
            <label className="flex max-w-xl flex-col gap-1 text-xs text-slate-400">
              Quick pick — {travelScope === 'domestic' ? 'domestic India' : 'international'} routes
              <select
                value={journeyPick}
                onChange={(e) => {
                  const routeKey = e.target.value;
                  setJourneyPick(routeKey);
                  const picked = journeyOptions.find((j) => j.route === routeKey);
                  if (!picked) return;
                  setOrigin(picked.from);
                  setDestination(picked.to);
                  setJourneyPick('');
                }}
                className="booking-select rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="" className="bg-white text-slate-900">
                  Select a published route…
                </option>
                {journeyOptions.map((j) => (
                  <option key={j.route} value={j.route} className="bg-white text-slate-900">
                    {j.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 shadow-lg">
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_1fr_1fr_auto] md:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">From</span>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="booking-select border-0 bg-transparent p-0 text-lg font-semibold text-slate-100 focus:ring-0"
                >
                  {originOptions.map((code) => (
                    <option key={code} value={code} className="bg-white text-slate-900">
                      {airportCity(code)}
                    </option>
                  ))}
                </select>
                <span className="truncate text-xs text-slate-500">{airportSubtitle(origin)}</span>
              </label>

              <button
                type="button"
                title="Swap origin and destination"
                onClick={swapOriginDestination}
                disabled={destinationOptions.length === 0}
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                ⇄
              </button>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">To</span>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={destinationOptions.length === 0}
                  className="booking-select border-0 bg-transparent p-0 text-lg font-semibold text-slate-100 focus:ring-0 disabled:opacity-50"
                >
                  {destinationOptions.map((code) => (
                    <option key={code} value={code} className="bg-white text-slate-900">
                      {airportCity(code)}
                    </option>
                  ))}
                </select>
                <span className="truncate text-xs text-slate-500">{airportSubtitle(destination)}</span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Departure</span>
                <input
                  type="date"
                  min={bookableMin}
                  max={bookableMax}
                  value={departureDate}
                  onChange={(e) => setDepartureDate(clampTravelDate(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 [color-scheme:dark]"
                />
                <span className="text-[10px] text-slate-600">
                  Select today or any upcoming date (up to 12 months)
                </span>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Return (optional)</span>
                <input
                  type="date"
                  min={departureDate}
                  max={bookableMax}
                  value={returnDate}
                  onChange={(e) => setReturnDate(clampTravelDate(e.target.value))}
                  placeholder="Add return"
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
                />
                {!returnDate ? (
                  <span className="text-[10px] text-slate-600">One-way search for now</span>
                ) : null}
              </label>

              <div className="flex flex-col gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-slate-500">Travellers &amp; class</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={6}
                      className="w-14 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm"
                      value={passengerCount}
                      onChange={(e) =>
                        setPassengerCount(Math.min(6, Math.max(1, Number(e.target.value))))
                      }
                    />
                    <select
                      value={fareClass}
                      onChange={(e) => setFareClass(e.target.value as FareClass)}
                      className="booking-select flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
                    >
                      {FARE_CLASSES.map((fc) => (
                        <option key={fc} value={fc} className="bg-white text-slate-900">
                          {fc.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={loading || destinationOptions.length === 0}
                className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </div>

          {availableRoutes.length > 0 && (
            <details className="rounded border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
              <summary className="cursor-pointer font-medium text-slate-300">
                {travelScope === 'domestic'
                  ? `India domestic route plan (${domesticRoutes.length} routes)`
                  : `International route plan (${internationalRoutes.length} routes · Middle East, Europe, US & Canada)`}
              </summary>
              <ul className="mt-3 space-y-2">
                {routePlanByOrigin.map((row) => (
                  <li key={row.from}>
                    <span className="font-medium text-slate-200">{row.label}</span>
                    <span className="text-slate-500"> → </span>
                    {row.destinations.length > 0
                      ? row.destinations.map((to) => airportLabel(to)).join(' · ')
                      : 'No connections in this category'}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {hasSearched && results.length === 0 && (
            <p className="rounded border border-amber-800/60 bg-amber-950/20 p-3 text-sm text-amber-200">
              No flights for {origin} → {destination}.
              {availableRoutes.length > 0 ? (
                <>
                  {' '}
                  Available routes: {availableRoutes.join(', ')}.
                </>
              ) : null}
            </p>
          )}

          {hasSearched && results.length > 0 && (
            <>
              <FlightDateStrip
                centerDate={departureDate}
                selectedDate={departureDate}
                lowestFareByDate={lowestFareByDate}
                onSelectDate={(iso) => void searchForDate(iso)}
              />
              <FlightSearchResults
                flights={results}
                travelDate={departureDate}
                origin={origin}
                destination={destination}
                selectedLegId={selected?.flightLegId ?? null}
                onSelect={setSelected}
              />
              <p className="text-xs text-slate-500">
                Airline name and flight number are shown on each card (e.g. Air India AI-302). Fares
                vary by travel date, demand, and load factor.
              </p>
            </>
          )}

          {selected && (
            <button
              onClick={handleContinueToPassengers}
              disabled={loading}
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Continue — passengers & seats
            </button>
          )}
        </>
      )}

      {step === 'passengers' && selected && (
        <div className="space-y-4 rounded border border-slate-700 bg-ops-panel p-4">
          <p className="text-sm text-slate-300">
            {airlineNameForFlight(selected.flightNumber, selected.airlineName)}{' '}
            <span className="text-sky-400">{formatFlightNumberDisplay(selected.flightNumber)}</span>
            <br />
            <span className="text-slate-500">
              {airportSubtitle(selected.origin)} → {airportSubtitle(selected.destination)}
            </span>
            <br />
            <span className="text-slate-500">
              {formatTimeLocal(withTravelDate(selected, departureDate).scheduledDeparture)} departure
              · {departureDate}
            </span>
          </p>

          <div className="flex flex-wrap gap-2">
            {FARE_CLASSES.map((fc) => (
              <button
                key={fc}
                type="button"
                onClick={() => refreshQuote(fc)}
                className={`rounded px-3 py-1 text-xs ${
                  fareClass === fc ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {fc.replace('_', ' ')}
              </button>
            ))}
            {quote && <span className="self-center text-sm text-emerald-400">${quote.totalUsd} USD</span>}
          </div>

          {seatMap && (
            <SeatMapPicker
              seatMap={seatMap}
              selectedSeatIds={selectedSeats}
              onToggleSeat={toggleSeat}
              maxSeats={passengerCount}
            />
          )}

          {passengerRows.map((row, index) => (
            <fieldset key={row.key} className="space-y-2 border-t border-slate-700 pt-3">
              <legend className="text-sm font-medium text-slate-200">
                Passenger {index + 1}
                {selectedSeats[index] ? ` · Seat ${selectedSeats[index]}` : ''}
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                  placeholder="First name"
                  value={row.firstName}
                  onChange={(e) =>
                    setPassengerRows((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, firstName: e.target.value } : r))
                    )
                  }
                />
                <input
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                  placeholder="Last name"
                  value={row.lastName}
                  onChange={(e) =>
                    setPassengerRows((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, lastName: e.target.value } : r))
                    )
                  }
                />
                <input
                  type="email"
                  className="rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                  placeholder="Email"
                  value={row.email}
                  onChange={(e) =>
                    setPassengerRows((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, email: e.target.value } : r))
                    )
                  }
                />
              </div>
            </fieldset>
          ))}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('search')}
              className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleContinueToPayment}
              className="rounded bg-sky-600 px-4 py-2 text-sm text-white"
            >
              Continue to payment
            </button>
          </div>
        </div>
      )}

      {step === 'payment' && quote && (
        <div className="space-y-4 rounded border border-slate-700 bg-ops-panel p-4">
          <div className="rounded border border-slate-600 bg-slate-900/50 p-3 text-sm">
            <p className="text-slate-300">Amount due</p>
            <p className="text-2xl font-semibold text-white">${totalDue.toFixed(2)} USD</p>
            <p className="mt-1 text-xs text-slate-500">
              Fare ${quote.totalUsd.toFixed(2)}
              {ancillaryTotal > 0 ? ` + ancillaries $${ancillaryTotal.toFixed(2)}` : ''} · {fareClass}
            </p>
          </div>

          {offers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-200">
                Add-ons {experimentVariant ? `(experiment: ${experimentVariant})` : ''}
              </p>
              {offers.map((offer) => (
                <label
                  key={offer.offerId}
                  className="flex cursor-pointer items-center justify-between rounded border border-slate-700 p-2 text-sm"
                >
                  <span>
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedOffers.includes(offer.offerId)}
                      onChange={() =>
                        setSelectedOffers((prev) =>
                          prev.includes(offer.offerId)
                            ? prev.filter((id) => id !== offer.offerId)
                            : [...prev, offer.offerId]
                        )
                      }
                    />
                    {offer.label} — ${offer.discountedPriceUsd}
                    <span className="ml-1 text-xs text-slate-500">({offer.experimentVariant})</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Demo payment. Cards ending in <strong>0000</strong> will fail (retry supported).
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-400">Name on card</span>
              <input
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm"
                value={payment.cardholderName}
                onChange={(e) => setPayment({ ...payment, cardholderName: e.target.value })}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-slate-400">Card number</span>
              <input
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-mono"
                value={payment.cardNumber}
                onChange={(e) =>
                  setPayment({ ...payment, cardNumber: formatCardNumber(e.target.value) })
                }
                placeholder="4111 1111 1111 1111"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Expiry</span>
              <input
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-mono"
                value={payment.expiry}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                  setPayment({ ...payment, expiry: v });
                }}
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">CVV</span>
              <input
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm font-mono"
                value={payment.cvv}
                onChange={(e) =>
                  setPayment({ ...payment, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })
                }
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setStep('passengers')} className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-300">
              Back
            </button>
            {failedPaymentId ? (
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={loading}
                className="rounded bg-amber-600 px-4 py-2 text-sm text-white"
              >
                Retry payment
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePayAndBook}
                disabled={loading}
                className="rounded bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {loading ? 'Processing…' : `Pay $${totalDue.toFixed(2)} & issue ticket`}
              </button>
            )}
          </div>
        </div>
      )}

      {step === 'done' && booking && (
        <div className="rounded border border-emerald-800 bg-emerald-950/30 p-4 text-sm">
          <p className="font-semibold text-emerald-300">Payment successful — ticket issued</p>
          <p className="mt-2 text-slate-300">
            {booking.passengers.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
          </p>
          <p className="text-slate-300">Seats: {booking.seatIds.join(', ')}</p>
          <p className="mt-1 text-slate-300">PNR: {booking.pnr}</p>
          <p className="text-slate-400">Total paid: ${booking.totalUsd.toFixed(2)} USD</p>
          {confirmationEmail && (
            <p className="mt-2 text-slate-400">
              Confirmation email sent to {confirmationEmail.sentTo}: {confirmationEmail.preview}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <a href={`/my-trips?pnr=${booking.pnr}`} className="text-sky-400 underline">
              Manage trip →
            </a>
            {booking.flightLegId.includes('AI302') && (
              <a
                href={`/commercial?pnr=${booking.pnr}`}
                className="text-amber-400 underline"
              >
                Optimize disruption (AI-302) →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
