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
  const [phase, setPhase] = useState<'commit' | 'manual-id' | 'reveal'>('commit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState('');
  const [pendingSecret, setPendingSecret] = useState<{ family: string; url: string; salt: string } | null>(null);

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
      const { returnValue } = await write('commit_evidence', [incidentId, commitment], BigInt(10 ** 14));
      const newEvidenceId = typeof returnValue === 'string' ? returnValue : '';
      if (newEvidenceId) {
        // Persist the reveal secret locally, keyed by the confirmed
        // evidence ID — only this browser/wallet can reveal, and losing
        // it before revealing forfeits the small evidence bond.
        window.localStorage.setItem(
          PENDING_KEY_PREFIX + newEvidenceId,
          JSON.stringify({ family, url, salt })
        );
        setEvidenceId(newEvidenceId);
        setPhase('reveal');
      } else {
        // The return value couldn't be read automatically from the
        // transaction receipt. Still save the reveal secret under a
        // manually-entered ID so nothing is lost — check the explorer
        // for the transaction's return value, or the incident's
        // evidence_count on-chain, to find the right ID.
        setPendingSecret({ family, url, salt });
        setPhase('manual-id');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Commit failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingSecret) return;
    window.localStorage.setItem(PENDING_KEY_PREFIX + evidenceId, JSON.stringify(pendingSecret));
    setPhase('reveal');
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

  if (phase === 'manual-id') {
    return (
      <form onSubmit={handleManualIdSubmit}>
        <p style={{ fontSize: 14 }}>
          Your evidence was committed successfully, but this browser couldn&apos;t automatically read the new
          evidence ID from the transaction. Find it on the explorer (look for the <code>commit_evidence</code>{' '}
          transaction&apos;s return value, or the incident&apos;s evidence count) and enter it here so you can
          reveal it.
        </p>
        <div className="field">
          <label>Evidence ID</label>
          <input value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} placeholder="vg-ev-item-1" />
        </div>
        <button className="btn" type="submit" disabled={!evidenceId.trim()}>
          Continue to reveal
        </button>
      </form>
    );
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
