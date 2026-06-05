import { describe, expect, it } from 'vitest';
import { knowledgeBase } from './knowledgeBase';

describe('knowledgeBase.search', () => {
  it('returns citations with documentId and section for crew policy query', () => {
    const result = knowledgeBase.search('crew duty reserve activation reassignment', 3);
    expect(result).not.toBeNull();
    expect(result!.citations.length).toBeGreaterThan(0);
    for (const cit of result!.citations) {
      expect(cit.documentId).toMatch(/^CREW-/);
      expect(cit.section).toBeTruthy();
      expect(cit.confidence).toBeGreaterThan(0);
    }
  });

  it('returns SOP citations for irrops rebooking query', () => {
    const result = knowledgeBase.search(
      'disruption window 45 minutes prioritize rebooking compensation',
      3
    );
    expect(result).not.toBeNull();
    expect(result!.citations.some((c) => c.documentId.startsWith('SOP-'))).toBe(true);
  });

  it('returns null for empty query', () => {
    expect(knowledgeBase.search('  ', 3)).toBeNull();
  });
});
