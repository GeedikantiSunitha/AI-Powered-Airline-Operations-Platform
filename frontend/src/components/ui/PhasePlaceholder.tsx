interface PhasePlaceholderProps {
  title: string;
  phase: number;
  message?: string;
}

export function PhasePlaceholder({ title, phase, message }: PhasePlaceholderProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-600 bg-ops-panel/50 p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-slate-400">
        Implement in <strong>Phase {phase}</strong> — see{' '}
        <code className="text-ops-accent">docs/IMPLEMENTATION_PHASES.md</code>
      </p>
      {message && <p className="mt-4 text-sm text-ops-warning">{message}</p>}
    </div>
  );
}
