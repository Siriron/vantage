export function formatGen(atto: string | number): string {
  const value = typeof atto === 'string' ? BigInt(atto) : BigInt(Math.trunc(atto));
  const whole = value / BigInt(10 ** 18);
  const frac = value % BigInt(10 ** 18);
  const fracStr = frac.toString().padStart(18, '0').slice(0, 4).replace(/0+$/, '');
  return fracStr ? `${whole}.${fracStr} GEN` : `${whole} GEN`;
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatUnixSeconds(unixSeconds: string | number): string {
  const seconds = typeof unixSeconds === 'string' ? Number(unixSeconds) : unixSeconds;
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function countdown(targetUnixSeconds: string | number, nowMs: number): string {
  const target = (typeof targetUnixSeconds === 'string' ? Number(targetUnixSeconds) : targetUnixSeconds) * 1000;
  const diff = target - nowMs;
  if (diff <= 0) return 'closed';
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function occupancyRatioLabel(occupancy: number, capacity: number): string {
  if (!capacity) return '—';
  const pct = Math.round((occupancy / capacity) * 100);
  return `${pct}% of capacity`;
}
