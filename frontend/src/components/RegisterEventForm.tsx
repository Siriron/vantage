import { useState } from 'react';
import { useGenLayer } from '../lib/useGenLayer';

interface Props {
  onRegistered: (eventId: string) => void;
}

export function RegisterEventForm({ onRegistered }: Props) {
  const { write } = useGenLayer();
  const [venueName, setVenueName] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [bond, setBond] = useState('0.01');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!venueName.trim() || !dateLabel.trim() || !startDate || !capacity) {
      setError('Fill in every field.');
      return;
    }
    const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
    if (!startUnix || startUnix <= Math.floor(Date.now() / 1000)) {
      setError('Event start must be in the future.');
      return;
    }
    setSubmitting(true);
    try {
      const value = BigInt(Math.round(parseFloat(bond) * 1e18));
      const { receipt } = await write(
        'register_event',
        [venueName.trim(), dateLabel.trim(), startUnix, parseInt(capacity, 10)],
        value
      );
      const eventId = (receipt as any)?.returnValue ?? '';
      onRegistered(typeof eventId === 'string' ? eventId : '');
    } catch (err: any) {
      setError(err?.message ?? 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Venue name</label>
        <input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Riverside Arena" />
      </div>
      <div className="field">
        <label>Event date label</label>
        <input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="Mar 1, 2027" />
      </div>
      <div className="field">
        <label>Event start (used to lock the future date)</label>
        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="field">
        <label>Capacity limit (people)</label>
        <input type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="1000" />
      </div>
      <div className="field">
        <label>Compliance bond (GEN)</label>
        <input type="number" step="0.001" min="0.001" max="5" value={bond} onChange={(e) => setBond(e.target.value)} />
      </div>
      {error && <p style={{ color: 'var(--hazard)', fontSize: 14 }}>{error}</p>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Locking capacity on-chain…' : 'Register event & post bond'}
      </button>
      {submitting && (
        <p className="label" style={{ marginTop: 8 }}>
          This writes to StudioNet and can take several minutes to reach consensus.
        </p>
      )}
    </form>
  );
}
