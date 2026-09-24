import { useState } from 'react';
import { useGenLayer } from '../lib/useGenLayer';
import { SOURCE_FAMILIES } from '../lib/types';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface Props {
  incidentId: string;
  account: string;
  onSubmitted: () => void;
}

const PENDING_KEY_PREFIX = 'vantage-pending-reveal:';

export function EvidenceForm({ incidentId, account, onSubmitted }: Props) {
  const { write } = useGenLayer();
  const [family, setFamily] = useState<string>(SOURCE_FAMILIES[0]);
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<'commit' | 'reveal'>('commit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState('');

  async function handleCommit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.startsWith('https://')) {
      setError('Source URL must use https.');
      return;
    }
    setSubmitting(true);
    try {
      const salt = randomSalt();
      const commitment = await sha256Hex(`${incidentId}|${account.toLowerCase()}|${family}|${url}|${salt}`);
      const { receipt } = await write('commit_evidence', [incidentId, commitment], BigInt(10 ** 14));
      const newEvidenceId = (receipt as any)?.returnValue ?? '';
      // Persist the reveal secret locally — only this browser/wallet can
      // reveal, and losing it forfeits the small evidence bond, same as
      // any commit-reveal scheme.
      window.localStorage.setItem(
        PENDING_KEY_PREFIX + newEvidenceId,
        JSON.stringify({ family, url, salt })
      );
      setEvidenceId(typeof newEvidenceId === 'string' ? newEvidenceId : '');
      setPhase('reveal');
    } catch (err: any) {
      setError(err?.message ?? 'Commit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const stored = window.localStorage.getItem(PENDING_KEY_PREFIX + evidenceId);
      if (!stored) throw new Error('Reveal details not found in this browser.');
      const { family: f, url: u, salt } = JSON.parse(stored);
      await write('reveal_evidence', [evidenceId, f, u, salt]);
      await write('examine_source', [evidenceId]);
      window.localStorage.removeItem(PENDING_KEY_PREFIX + evidenceId);
      onSubmitted();
    } catch (err: any) {
      setError(err?.message ?? 'Reveal failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'reveal') {
    return (
      <div>
        <p style={{ fontSize: 14 }}>
          Commitment recorded as evidence <span className="num">{evidenceId}</span>. Reveal it now to trigger
          independent examination.
        </p>
        {error && <p style={{ color: 'var(--hazard)', fontSize: 14 }}>{error}</p>}
        <button className="btn" onClick={handleReveal} disabled={submitting}>
          {submitting ? 'Revealing…' : 'Reveal & examine'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCommit}>
      <div className="field">
        <label>Source family</label>
        <select value={family} onChange={(e) => setFamily(e.target.value)}>
          {SOURCE_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Source URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://fire-marshal.example.gov/reports/..."
        />
      </div>
      <p className="label" style={{ marginBottom: 12 }}>
        Your source stays hidden until you reveal it, so other submitters can&apos;t react to it first.
      </p>
      {error && <p style={{ color: 'var(--hazard)', fontSize: 14 }}>{error}</p>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? 'Committing…' : 'Commit evidence (0.0001 GEN bond)'}
      </button>
    </form>
  );
}
