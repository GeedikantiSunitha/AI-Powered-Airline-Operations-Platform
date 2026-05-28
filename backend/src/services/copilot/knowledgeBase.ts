interface KnowledgeDocument {
  documentId: string;
  docType: 'SOP' | 'MAINTENANCE' | 'COMPLIANCE' | 'CREW_POLICY';
  title: string;
  version: string;
  effectiveDate: string;
  region: string;
  sections: Array<{ sectionId: string; heading: string; content: string }>;
}

interface KnowledgeChunk {
  chunkId: string;
  documentId: string;
  docType: KnowledgeDocument['docType'];
  version: string;
  effectiveDate: string;
  region: string;
  sectionId: string;
  heading: string;
  content: string;
}

interface RetrievalFilters {
  docType?: string;
  region?: string;
  version?: string;
}

export interface RetrievalCitation {
  documentId: string;
  section: string;
  confidence: number;
}

export interface RetrievalResult {
  answer: string;
  citations: RetrievalCitation[];
}

const KNOWLEDGE_DOCUMENTS: KnowledgeDocument[] = [
  {
    documentId: 'SOP-IRROPS-2026-01',
    docType: 'SOP',
    title: 'Irregular Operations Reaccommodation SOP',
    version: 'v1.4',
    effectiveDate: '2026-02-01',
    region: 'IN',
    sections: [
      {
        sectionId: 'sec-2.1',
        heading: 'Priority Rebooking',
        content:
          'During disruption windows above 45 minutes, prioritize rebooking in this order: unaccompanied minors, medical support passengers, premium cabin, then tight-connection economy.',
      },
      {
        sectionId: 'sec-3.2',
        heading: 'Compensation Guardrails',
        content:
          'When delay exceeds regulatory threshold, compensation eligibility must be evaluated before finalizing rebooking. Trigger compensation workflow if threshold reached.',
      },
    ],
  },
  {
    documentId: 'CREW-DUTY-2026-02',
    docType: 'CREW_POLICY',
    title: 'Crew Duty Time and Reserve Activation Policy',
    version: 'v2.0',
    effectiveDate: '2026-01-15',
    region: 'IN',
    sections: [
      {
        sectionId: 'sec-4.1',
        heading: 'Maximum Duty Window',
        content:
          'Crew reassignment is mandatory when projected duty exceeds legal maximum. Reserve crew activation should occur at least 90 minutes before departure.',
      },
      {
        sectionId: 'sec-5.3',
        heading: 'Fatigue Mitigation',
        content:
          'Do not assign reserve crew if rest window is below policy minimum. Escalate to operations manager for manual review when no legal assignment exists.',
      },
    ],
  },
  {
    documentId: 'FAA-WX-OPS-2026-01',
    docType: 'COMPLIANCE',
    title: 'Weather Risk and Dispatch Compliance',
    version: 'v1.1',
    effectiveDate: '2026-03-10',
    region: 'GLOBAL',
    sections: [
      {
        sectionId: 'sec-1.4',
        heading: 'Weather Trigger Thresholds',
        content:
          'Dispatch alert escalation is required when route weather risk crosses 0.7. Gate and crew plans must be revalidated prior to final pushback authorization.',
      },
      {
        sectionId: 'sec-2.2',
        heading: 'Audit Logging',
        content:
          'All automated recommendations impacting dispatch decisions must retain source citation, confidence score, and approver identity in audit records.',
      },
    ],
  },
];

function chunkDocuments(maxChunkSize = 260): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  for (const doc of KNOWLEDGE_DOCUMENTS) {
    for (const section of doc.sections) {
      const words = section.content.split(/\s+/);
      let cursor = 0;
      let part = 1;
      while (cursor < words.length) {
        const slice = words.slice(cursor, cursor + maxChunkSize).join(' ');
        chunks.push({
          chunkId: `${doc.documentId}:${section.sectionId}:${part}`,
          documentId: doc.documentId,
          docType: doc.docType,
          version: doc.version,
          effectiveDate: doc.effectiveDate,
          region: doc.region,
          sectionId: section.sectionId,
          heading: section.heading,
          content: slice,
        });
        cursor += maxChunkSize;
        part += 1;
      }
    }
  }
  return chunks;
}

const KNOWLEDGE_CHUNKS = chunkDocuments();

function inferFilters(query: string): RetrievalFilters {
  const lower = query.toLowerCase();
  let docType: string | undefined;
  if (/(policy|compliance|faa|regulatory)/i.test(lower)) {
    docType = 'COMPLIANCE';
  } else if (/(crew|duty|reserve|fatigue)/i.test(lower)) {
    docType = 'CREW_POLICY';
  } else if (/(rebook|disruption|irrops|compensation)/i.test(lower)) {
    docType = 'SOP';
  }
  return { docType };
}

function scoreChunk(chunk: KnowledgeChunk, query: string): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);
  if (queryTerms.length === 0) return 0;
  const haystack = `${chunk.heading} ${chunk.content}`.toLowerCase();
  const matches = queryTerms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
  const base = matches / queryTerms.length;
  const freshnessBonus = chunk.effectiveDate >= '2026-01-01' ? 0.08 : 0;
  return Math.min(1, base + freshnessBonus);
}

export const knowledgeBase = {
  listDocuments() {
    return KNOWLEDGE_DOCUMENTS.map((doc) => ({
      documentId: doc.documentId,
      docType: doc.docType,
      title: doc.title,
      version: doc.version,
      effectiveDate: doc.effectiveDate,
      region: doc.region,
    }));
  },

  search(query: string, topK = 3): RetrievalResult | null {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const filters = inferFilters(trimmed);
    const eligible = KNOWLEDGE_CHUNKS.filter((chunk) => {
      if (filters.docType && chunk.docType !== filters.docType) return false;
      if (filters.region && chunk.region !== filters.region) return false;
      if (filters.version && chunk.version !== filters.version) return false;
      return true;
    });

    const scored = eligible
      .map((chunk) => ({
        chunk,
        score: scoreChunk(chunk, trimmed),
      }))
      .filter((row) => row.score >= 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    if (scored.length === 0) return null;

    const answer = scored
      .map(
        ({ chunk }) =>
          `${chunk.heading} (${chunk.documentId} ${chunk.sectionId}): ${chunk.content}`
      )
      .join('\n');

    const citations = scored.map(({ chunk, score }) => ({
      documentId: chunk.documentId,
      section: chunk.sectionId,
      confidence: Number(score.toFixed(2)),
    }));

    return { answer, citations };
  },
};
