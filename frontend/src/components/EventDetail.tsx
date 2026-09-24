import { useEffect, useState } from 'react';
import { useGenLayer } from '../lib/useGenLayer';
import { OpenIncidentForm } from './OpenIncidentForm';
import { IncidentCard } from './IncidentCard';
import { formatGen, formatUnixSeconds, shortAddress } from '../lib/format';
import type { EventRecord } from '../lib/types';

interface Props {
  eventId: string;
  account: string | null;
  onBack: () => void;
}

export function EventDetail({ eventId, account, onBack }: Props) {
  const { read, write } = useGenLayer();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const rec = await read<EventRecord>('get_event', [eventId]);
      setEvent(rec);
    } catch (err: any) {
      setError(err?.message ?? 'Event not found.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleClose() {
    setBusy(true);
    setError(null);
    try {
      await write('close_event', [eventId]);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Could not close event.');
    } finally {
      setBusy(false);
    }
  }

  if (error && !event) {
    return (
      <div className="container">
        <p style={{ color: 'var(--hazard)' }}>{error}</p>
        <button className="btn btn-outline" onClick={onBack}>
          Back
        </button>
      </div>
    );
  }

  if (!event) return <p className="label">Loading…</p>;

  const isOrganizer = account && account.toLowerCase() === event.organizer.toLowerCase();

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <button className="btn btn-outline" onClick={onBack} style={{ marginBottom: 24 }}>
        ← All events
      </button>

      <p className="label">EVENT</p>
      <h1 style={{ fontFamily: 'var(--font-display)', margin: '4px 0 4px' }}>{event.venue_name}</h1>
      <p style={{ color: 'var(--grey)', marginTop: 0 }}>{event.event_date_label}</p>

      <hr className="rule" />

      <div className="row">
        <span className="label">Organizer</span>
        <span className="num">{shortAddress(event.organizer)}</span>
      </div>
      <div className="row">
        <span className="label">Capacity limit</span>
        <span className="num">{Number(event.capacity_limit).toLocaleString()} people</span>
      </div>
      <div className="row">
        <span className="label">Event start</span>
        <span className="num">{formatUnixSeconds(event.event_start_unix)}</span>
      </div>
      <div className="row">
        <span className="label">Bond posted</span>
        <span className="num">{formatGen(event.bond_atto)}</span>
      </div>
      <div className="row">
        <span className="label">Status</span>
        <span className={`status-pill ${event.status === 'ACTIVE' ? 'compliant' : ''}`}>{event.status}</span>
      </div>

      {isOrganizer && event.status === 'ACTIVE' && event.active_incident_id === '' && (
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-outline" onClick={handleClose} disabled={busy}>
            {busy ? 'Closing…' : 'Close event & reclaim bond'}
          </button>
        </div>
      )}

      <hr className="rule" />

      <p className="label">INCIDENT LOG</p>

      {event.active_incident_id ? (
        <IncidentCard incidentId={event.active_incident_id} account={account} onChanged={load} />
      ) : (
        <p style={{ color: 'var(--grey)', fontSize: 14 }}>No open incident.</p>
      )}

      {event.status === 'ACTIVE' && event.active_incident_id === '' && account && (
        <div style={{ marginTop: 16 }}>
          {showIncidentForm ? (
            <OpenIncidentForm
              eventId={eventId}
              onOpened={() => {
                setShowIncidentForm(false);
                load();
              }}
            />
          ) : (
            <button className="btn btn-outline" onClick={() => setShowIncidentForm(true)}>
              Report a capacity concern
            </button>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--hazard)', fontSize: 14, marginTop: 16 }}>{error}</p>}
    </div>
  );
}
