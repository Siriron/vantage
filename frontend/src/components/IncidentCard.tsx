import { useEffect, useState } from 'react';
import { useGenLayer } from '../lib/useGenLayer';
import { EvidenceForm } from './EvidenceForm';
import { formatUnixSeconds, countdown } from '../lib/format';
import { OUTCOME_LABELS, type IncidentRecord, type EvidenceRecord } from '../lib/types';

interface Props {
  incidentId: string;
  account: string | null;
  onChanged: () => void;
}

export function IncidentCard({ incidentId, account, onChanged }: Props) {
  const { read, write } = useGenLayer();
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<EvidenceRecord | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    try {
      const rec = await read<IncidentRecord>('get_incident', [incidentId]);
      setIncident(rec);
    } catch (err: any) {
      setError(err?.message ?? 'Could not load incident.');
    }
  }

  async function handleLookupEvidence(e: React.FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setLookupResult(null);
    if (!lookupId.trim()) return;
    try {
      const rec = await read<EvidenceRecord>('get_evidence', [lookupId.trim()]);
      setLookupResult(rec);
    } catch {
      setLookupError('No evidence found with that ID.');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  async function handleResolve() {
    setBusy(true);
    setError(null);
    try {
      await write('resolve_incident', [incidentId]);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.message ?? 'Resolve failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExpire() {
    setBusy(true);
    setError(null);
    try {
      await write('expire_incident', [incidentId]);
      await load();
      onChanged();
    } catch (err: any) {
      setError(err?.message ?? 'Expire failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!incident) return <p className="label">Loading incident…</p>;

  const deadlinePassed = now / 1000 >= parseInt(incident.evidence_deadline, 10);
  const isBreach = incident.outcome && incident.outcome !== 'no_breach' && incident.outcome !== 'unverifiable';

  return (
    <div className="ledger-margin" style={{ marginBottom: 16 }}>
      <div className="row">
        <span>Incident {incident.incident_id}</span>
        <span
          className={`status-pill ${incident.status === 'RESOLVED' ? (isBreach ? 'breach' : 'compliant') : ''}`}
        >
          {incident.status}
        </span>
      </div>
      <p style={{ fontSize: 14, color: 'var(--grey)' }}>{incident.summary}</p>

      {incident.status === 'OPEN' && (
        <>
          <div className="row">
            <span className="label">Evidence window</span>
            <span className="num">
              {deadlinePassed ? 'closed' : countdown(incident.evidence_deadline, now)}
            </span>
          </div>
          <div className="row">
            <span className="label">Evidence submitted</span>
            <span className="num">{incident.evidence_count}</span>
          </div>
          <div className="row">
            <span className="label">Verified so far</span>
            <span className="num">{incident.verified_count}</span>
          </div>

          {parseInt(incident.evidence_count, 10) > 0 && (
            <form onSubmit={handleLookupEvidence} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="vg-ev-item-1"
                style={{ flex: 1, background: 'var(--paper-dim)', border: '1px solid var(--rule)', padding: '6px 8px', fontSize: 13 }}
              />
              <button className="btn btn-outline" type="submit" style={{ padding: '6px 12px', fontSize: 13 }}>
                Look up
              </button>
            </form>
          )}
          {lookupError && <p style={{ color: 'var(--hazard)', fontSize: 13 }}>{lookupError}</p>}
          {lookupResult && (
            <div className="row" style={{ fontSize: 13 }}>
              <span>{lookupResult.source_family} — {lookupResult.status}</span>
              <span className="num">{lookupResult.occupancy_figure !== '-1' ? lookupResult.occupancy_figure : '—'}</span>
            </div>
          )}

          {!deadlinePassed && account && (
            <div style={{ marginTop: 12 }}>
              {showEvidenceForm ? (
                <EvidenceForm
                  incidentId={incidentId}
                  account={account}
                  onSubmitted={() => {
                    setShowEvidenceForm(false);
                    load();
                  }}
                />
              ) : (
                <button className="btn btn-outline" onClick={() => setShowEvidenceForm(true)}>
                  Submit evidence
                </button>
              )}
            </div>
          )}

          {deadlinePassed && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {parseInt(incident.verified_count, 10) > 0 ? (
                <button className="btn" onClick={handleResolve} disabled={busy}>
                  {busy ? 'Resolving…' : 'Resolve incident'}
                </button>
              ) : (
                <button className="btn btn-outline" onClick={handleExpire} disabled={busy}>
                  {busy ? 'Expiring…' : 'Expire (no verified evidence)'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {incident.status !== 'OPEN' && incident.outcome && (
        <>
          <div className="row">
            <span className="label">Outcome</span>
            <span className="num">{OUTCOME_LABELS[incident.outcome] ?? incident.outcome}</span>
          </div>
          {parseInt(incident.slash_bps, 10) > 0 && (
            <div className="row">
              <span className="label">Bond slashed</span>
              <span className="num">{(parseInt(incident.slash_bps, 10) / 100).toFixed(2)}%</span>
            </div>
          )}
          <p style={{ fontSize: 14, color: 'var(--grey)', marginTop: 8 }}>{incident.basis}</p>
          <p className="label">Resolved {formatUnixSeconds(incident.resolved_at)}</p>
        </>
      )}

      {error && <p style={{ color: 'var(--hazard)', fontSize: 14 }}>{error}</p>}
    </div>
  );
}
