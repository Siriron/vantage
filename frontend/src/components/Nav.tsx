import { shortAddress } from '../lib/format';

interface NavProps {
  account: string | null;
  connecting: boolean;
  onConnect: () => void;
  view: 'app' | 'docs';
  onNavigate: (view: 'app' | 'docs') => void;
}

export function Nav({ account, connecting, onConnect, view, onNavigate }: NavProps) {
  return (
    <div style={{ borderBottom: '1px solid var(--rule)', background: 'var(--paper)' }}>
      <div
        className="container"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, letterSpacing: '-0.01em' }}>
            Vantage
          </span>
          <nav style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => onNavigate('app')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: view === 'app' ? 'var(--ink)' : 'var(--grey)',
                fontWeight: view === 'app' ? 600 : 400,
                padding: 0,
              }}
            >
              App
            </button>
            <button
              onClick={() => onNavigate('docs')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: view === 'docs' ? 'var(--ink)' : 'var(--grey)',
                fontWeight: view === 'docs' ? 600 : 400,
                padding: 0,
              }}
            >
              Docs
            </button>
          </nav>
        </div>
        {account ? (
          <span className="status-pill compliant">{shortAddress(account)}</span>
        ) : (
          <button className="btn" onClick={onConnect} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect wallet'}
          </button>
        )}
      </div>
    </div>
  );
}
