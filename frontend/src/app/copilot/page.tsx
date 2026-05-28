'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/apiClient';
import { PhasePlaceholder } from '@/components/ui/PhasePlaceholder';

type UiMessage = {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  citations?: Array<{ source: string; reference: string }>;
};

export default function CopilotPage() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: 'assistant',
      content: 'Ask me: "high delay risk next 3 hours" to get grounded operational answers.',
      confidence: 0.7,
      citations: [{ source: 'copilot.bootstrap', reference: 'phase-8' }],
    },
  ]);
  const [input, setInput] = useState('high delay risk next 3 hours');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;
    const nextHistory = [...messages, { role: 'user' as const, content: prompt }];
    setMessages(nextHistory);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const result = await api.copilotChat({
        message: prompt,
        history: nextHistory
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.message.content,
          confidence: result.message.confidence,
          citations: result.sources,
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Copilot request failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (error?.includes('500')) {
    return (
      <PhasePlaceholder
        title="AI Copilot Chat"
        phase={8}
        message={`Copilot backend error: ${error}`}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">AI Copilot</h2>
        <p className="text-sm text-slate-400">
          Grounded operational Q&A with citations from live API data.
        </p>
      </div>

      <div className="h-[460px] overflow-y-auto rounded border border-slate-700 bg-slate-950 p-4">
        <div className="space-y-3">
          {messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`rounded p-3 text-sm ${
                message.role === 'user'
                  ? 'ml-10 border border-sky-900 bg-sky-950/40'
                  : 'mr-10 border border-slate-700 bg-ops-panel'
              }`}
            >
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{message.role}</p>
              <p className="whitespace-pre-wrap text-slate-100">{message.content}</p>
              {typeof message.confidence === 'number' ? (
                <p className="mt-2 text-xs text-slate-400">
                  Confidence: {(message.confidence * 100).toFixed(0)}%
                </p>
              ) : null}
              {message.citations?.length ? (
                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  {message.citations.map((c) => (
                    <p key={`${c.source}-${c.reference}`}>
                      Source: <span className="text-slate-300">{c.source}</span> ({c.reference})
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a grounded operations question..."
          className="min-h-[88px] w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <div className="flex items-center justify-between">
          {error ? <p className="text-sm text-ops-critical">{error}</p> : <span />}
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-ops-accent px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
