import { useState } from 'react';
import { useGenLayer } from '../lib/useGenLayer';

interface Props {
  eventId: string;
  onOpened: () => void;
}

export function OpenIncidentForm({ eventId, onOpened }: Props) {
  const { write } = useGenLayer();
  const [summary, setSummary] = useState('');
  const [windowMinutes, setWindowMinutes] = useState('60');
  const [filingBond, setFilingBond] = useState('0.001');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!summary.trim()) {
      setError('Describe what you are alleging.');
      return;
    }
    setSubmitting(true);
    try {
      const value = BigInt(Math.round(parseFloat(filingBond) * 1e18));
      await write('open_incident', [eventId, summary.trim(), parseInt(windowMinutes, 10) * 60], value);
      onOpened();
    } catch (err: any) {
      setError(err?.message ?? 'Could not open incident.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>What are you alleging?</label>
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Overcrowding reported at the east entrance during the headline set."
        />
      </div>
      <div className="field">
        <label>Evidence window (minutes)</label>
        <input
          type="number"
          min="15"
          max="10080"
          value={windowMinutes}
          onChange={(e) => setWindowMinutes(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Filing bond (GEN, 0.001–1) — refunded if the breach is upheld or cannot be proven; forfeited to the organizer if adjudicated no breach</label>
        <input type="number" step="0.001" min="0.001" max="1" value={filingBond} onChange={(e) => setFilingBond(e.target.value)} />
      </div>
      {error && <p style={{ color: 'var(--hazard)', fontSize: 14 }}>{error}</p>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Opening incident…' : 'Open incident'}
      </button>
    </form>
  );
}
