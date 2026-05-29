export interface CommercialEvent {
  eventType: string;
  flightLegId?: string;
  pnr?: string;
  payload: Record<string, unknown>;
  emittedAt: string;
}

const buffer: CommercialEvent[] = [];

export const commercialEvents = {
  emit(eventType: string, payload: Record<string, unknown>): void {
    const event: CommercialEvent = {
      eventType,
      flightLegId: payload.flightLegId as string | undefined,
      pnr: payload.pnr as string | undefined,
      payload,
      emittedAt: new Date().toISOString(),
    };
    buffer.unshift(event);
    if (buffer.length > 500) buffer.pop();
    console.log('[commercial-event]', JSON.stringify(event));
  },

  list(limit = 50): CommercialEvent[] {
    return buffer.slice(0, limit);
  },
};
