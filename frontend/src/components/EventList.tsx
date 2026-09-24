import { useEffect, useState } from 'react';
import { useGenLayer } from '../lib/useGenLayer';
import { RegisterEventForm } from './RegisterEventForm';
import { ClaimPanel } from './ClaimPanel';
import { formatGen } from '../lib/format';
import type { EventRecord, StatsRecord } from '../lib/types';

interface Props {
  account: string | null;
  onSelectEvent: (eventId: string) => void;
}

export function EventList({ account, onSelectEvent }: Props) {
  const { read } = useGenLayer();
  const [showForm, setShowForm] = useState(false);
  const [stats, setStats] = useState<StatsRecord | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [lookupEvent, setLookupEvent] = useState<EventRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function loadStats() {
    try {
      const s = await read<StatsRecord>('get_stats', []);
      setStats(s);
    } catch {
      // stats are supplementary; a load failure here shouldn't block the page
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setLookupEvent(null);
    if (!lookupId.trim()) return;
    try {
      const rec = await read<EventRecord>('get_event', [lookupId.trim()]);
      setLookupEvent(rec);
    } catch (err: any) {
      setLookupError('No event found with that ID.');
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <p className="label">VENUE CAPACITY COMPLIANCE</p>
      <h1 style={{ fontFamily: 'var(--font-display)', margin: '4px 0 8px', fontSize: 32 }}>
        Lock a capacity limit. Bond it. Let evidence settle disputes.
      </h1>
      <p style={{ color: 'var(--grey)', maxWidth: 560 }}>
        An organizer registers an event with a maximum occupancy and posts a bond before tickets sell.
        Anyone can later open a compliance check citing an official source — never a free-text claim.
        Two independent GenLayer consensus rounds examine the evidence and adjudicate the incident.
      </p>

      {stats && (
        <div className="row" style={{ marginTop: 24 }}>
          <span className="label">
            {stats.events} event{stats.events === '1' ? '' : 's'} registered · {stats.incidents} incident
            {stats.incidents === '1' ? '' : 's'} filed
          </span>
          <span className="label">Escrow balanced: {stats.accounting_balanced ? 'yes' : 'checking'}</span>
        </div>
      )}

      <hr className="rule" />

      {account && (
        <>
          <ClaimPanel account={account} />
          <hr className="rule" />
        </>
      )}

      <p className="label">FIND AN EVENT</p>
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          placeholder="vg-ev-1"
          style={{ flex: 1, background: 'var(--paper-dim)', border: '1px solid var(--rule)', padding: '8px 10px' }}
        />
        <button className="btn btn-outline" type="submit">
          Open
        </button>
      </form>
      {lookupError && <p style={{ color: 'var(--hazard)', fontSize: 14 }}>{lookupError}</p>}
      {lookupEvent && (
        <div className="row" style={{ cursor: 'pointer' }} onClick={() => onSelectEvent(lookupEvent.event_id)}>
          <span>{lookupEvent.venue_name} — {lookupEvent.event_date_label}</span>
          <span className={`status-pill ${lookupEvent.status === 'ACTIVE' ? 'compliant' : ''}`}>
            {lookupEvent.status}
          </span>
        </div>
      )}

      <hr className="rule" />

      <p className="label">REGISTER AN EVENT</p>
      {!account ? (
        <p style={{ color: 'var(--grey)', fontSize: 14 }}>Connect a wallet to register an event.</p>
      ) : showForm ? (
        <RegisterEventForm
          onRegistered={(eventId) => {
            setShowForm(false);
            if (eventId) onSelectEvent(eventId);
            loadStats();
          }}
        />
      ) : (
        <button className="btn" onClick={() => setShowForm(true)}>
          Register a new event
        </button>
      )}
    </div>
  );
}
