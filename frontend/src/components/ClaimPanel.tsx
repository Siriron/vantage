import { useEffect, useState } from 'react';
import { useGenLayer } from '../lib/useGenLayer';
import { formatGen } from '../lib/format';

interface Props {
  account: string;
}

export function ClaimPanel({ account }: Props) {
  const { read, write } = useGenLayer();
  const [credit, setCredit] = useState<string>('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const value = await read<string>('get_credit', [account]);
      setCredit(String(value));
    } catch {
      setCredit('0');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  async function handleClaim() {
    setBusy(true);
    setError(null);
    try {
      await write('claim', []);
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Claim failed.');
    } finally {
      setBusy(false);
    }
  }

  const owed = BigInt(credit || '0');

  return (
    <div className="row">
      <div>
        <span className="label">Claimable balance</span>
        <div className="num" style={{ fontSize: 18 }}>
          {formatGen(credit)}
        </div>
        {error && <p style={{ color: 'var(--hazard)', fontSize: 13 }}>{error}</p>}
      </div>
      <button className="btn" onClick={handleClaim} disabled={busy || owed <= BigInt(0)}>
        {busy ? 'Claiming…' : 'Claim'}
      </button>
    </div>
  );
}
