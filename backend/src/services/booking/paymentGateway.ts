import { randomUUID } from 'crypto';
import type { PaymentResult } from '@airline-ops/shared';

const idempotencyStore = new Map<string, PaymentResult>();

export const paymentGateway = {
  async charge(input: {
    amountUsd: number;
    idempotencyKey: string;
    cardLast4?: string;
  }): Promise<PaymentResult> {
    const existing = idempotencyStore.get(input.idempotencyKey);
    if (existing) return existing;

    const fraudRiskScore = input.cardLast4 === '0000' ? 0.92 : 0.12;
    const failed = fraudRiskScore > 0.85;

    const result: PaymentResult = {
      paymentId: randomUUID(),
      status: failed ? 'failed' : 'succeeded',
      idempotencyKey: input.idempotencyKey,
      fraudRiskScore,
      retryCount: 0,
    };

    idempotencyStore.set(input.idempotencyKey, result);
    return result;
  },

  async retry(paymentId: string, idempotencyKey: string): Promise<PaymentResult> {
    const existing = idempotencyStore.get(idempotencyKey);
    if (existing && existing.paymentId === paymentId) {
      const retried: PaymentResult = {
        ...existing,
        status: 'succeeded',
        retryCount: existing.retryCount + 1,
        fraudRiskScore: 0.1,
      };
      idempotencyStore.set(idempotencyKey, retried);
      return retried;
    }
    return this.charge({ amountUsd: 0, idempotencyKey });
  },
};
